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

  useEffect(() => {
    // Centro de custo precisa de conta bancária
    if (tipo === 'centro_custo' && !contaBancariaId) {
      setCategorias([]);
      return;
    }

    // Receita/Despesa precisa de centro de custo
    if ((tipo === 'receita' || tipo === 'despesa') && !centroCustoId) {
      setCategorias([]);
      return;
    }

    async function fetchCategoriasFiltradas() {
      try {
        setLoading(true);

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
        } else if ((tipo === 'receita' || tipo === 'despesa') && centroCustoId) {
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
              categoria_centro_custo!inner(
                habilitado,
                centro_custo_id
              )
            `)
            .eq('tipo', tipo)
            .eq('ativo', true)
            .eq('categoria_centro_custo.centro_custo_id', centroCustoId)
            .eq('categoria_centro_custo.habilitado', true)
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
    }

    fetchCategoriasFiltradas();
  }, [contaBancariaId, centroCustoId, tipo]);

  return { categorias, loading };
}
