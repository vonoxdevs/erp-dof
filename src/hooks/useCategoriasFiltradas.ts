import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Categoria, TipoCategoria } from '@/types/categoria';

interface UseCategoriasFiltradas {
  contaBancariaId?: string | null;
  centroCustoId?: string | null;
  tipo: TipoCategoria;
}

export function useCategoriasFiltradas({ contaBancariaId, centroCustoId, tipo }: UseCategoriasFiltradas) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCategoriasFiltradas = async () => {
    try {
      setLoading(true);

      // Centro de custo precisa de conta bancária
      if (tipo === 'centro_custo' && !contaBancariaId) {
        setCategorias([]);
        return;
      }

      // Query diferente baseado no tipo
      if (tipo === 'centro_custo' && contaBancariaId) {
        const { data, error } = await supabase
          .from('categorias')
          .select(`
            id,
            nome,
            descricao,
            tipo,
            cor,
            icon,
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
      } else if (tipo === 'receita' || tipo === 'despesa') {
        // Categorias de receita e despesa aparecem em TODOS os centros de custo
        const { data, error } = await supabase
          .from('categorias')
          .select('*')
          .eq('tipo', tipo)
          .eq('ativo', true)
          .order('nome');

        if (error) throw error;

        const categoriasFormatadas: Categoria[] = (data || []).map(cat => ({
          ...cat,
          tipo: cat.tipo as TipoCategoria
        }));

        setCategorias(categoriasFormatadas);
      }
    } catch (error) {
      console.error('Erro ao buscar categorias filtradas:', error);
      setCategorias([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategoriasFiltradas();

    // Realtime subscription para categorias
    const channel = supabase
      .channel('categorias-filtradas-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categorias'
        },
        () => {
          fetchCategoriasFiltradas();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categoria_conta_bancaria'
        },
        () => {
          fetchCategoriasFiltradas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contaBancariaId, centroCustoId, tipo]);

  return { categorias, loading, refetch: fetchCategoriasFiltradas };
}
