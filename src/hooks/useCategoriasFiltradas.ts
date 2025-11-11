import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Categoria, TipoCategoria } from '@/types/categoria';

interface UseCategoriasFiltradas {
  contaBancariaId: string | null;
  tipo: TipoCategoria;
}

export function useCategoriasFiltradas({ contaBancariaId, tipo }: UseCategoriasFiltradas) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!contaBancariaId) {
      setCategorias([]);
      return;
    }

    async function fetchCategoriasFiltradas() {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from('categorias')
          .select(`
            id,
            nome,
            descricao,
            tipo,
            cor,
            company_id,
            ativo,
            created_at,
            updated_at,
            categoria_conta_bancaria!inner(
              habilitado,
              conta_bancaria_id
            )
          `)
          .eq('tipo', tipo)
          .eq('ativo', true)
          .eq('categoria_conta_bancaria.conta_bancaria_id', contaBancariaId)
          .eq('categoria_conta_bancaria.habilitado', true)
          .order('nome');

        if (error) throw error;

        const categoriasFormatadas: Categoria[] = (data || []).map(cat => ({
          ...cat,
          tipo: cat.tipo as TipoCategoria
        }));

        setCategorias(categoriasFormatadas);
      } catch (error) {
        console.error('Erro ao buscar categorias filtradas:', error);
        setCategorias([]);
      } finally {
        setLoading(false);
      }
    }

    fetchCategoriasFiltradas();
  }, [contaBancariaId, tipo]);

  return { categorias, loading };
}
