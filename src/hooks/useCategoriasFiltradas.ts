import { useState, useEffect, useCallback } from 'react';
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

  const fetchCategoriasFiltradas = useCallback(async () => {
    try {
      setLoading(true);

      // Centro de custo precisa de conta bancária
      if (tipo === 'centro_custo' && !contaBancariaId) {
        setCategorias([]);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCategorias([]);
        return;
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) {
        setCategorias([]);
        return;
      }

      // Query para centro de custo com conta bancária
      if (tipo === 'centro_custo' && contaBancariaId) {
        // Busca vínculos primeiro
        const { data: linkedCategories, error: linkedError } = await supabase
          .from('categoria_conta_bancaria')
          .select('categoria_id')
          .eq('conta_bancaria_id', contaBancariaId)
          .eq('habilitado', true);

        if (linkedError) {
          console.error('Erro ao buscar vínculos:', linkedError);
          // Fallback: mostra todos
          const { data } = await supabase
            .from('categorias')
            .select('*')
            .eq('tipo', tipo)
            .eq('ativo', true)
            .eq('company_id', profile.company_id)
            .order('nome');
          
          setCategorias((data || []).map(cat => ({
            ...cat,
            tipo: cat.tipo as TipoCategoria
          })));
          return;
        }

        if (linkedCategories && linkedCategories.length > 0) {
          const categoryIds = linkedCategories.map(lc => lc.categoria_id);
          
          const { data, error } = await supabase
            .from('categorias')
            .select('*')
            .eq('tipo', tipo)
            .eq('ativo', true)
            .eq('company_id', profile.company_id)
            .in('id', categoryIds)
            .order('nome');

          if (error) throw error;
          
          setCategorias((data || []).map(cat => ({
            ...cat,
            tipo: cat.tipo as TipoCategoria
          })));
        } else {
          // Nenhum vínculo - mostra todos
          const { data, error } = await supabase
            .from('categorias')
            .select('*')
            .eq('tipo', tipo)
            .eq('ativo', true)
            .eq('company_id', profile.company_id)
            .order('nome');

          if (error) throw error;
          
          setCategorias((data || []).map(cat => ({
            ...cat,
            tipo: cat.tipo as TipoCategoria
          })));
        }
      } else if (tipo === 'receita' || tipo === 'despesa') {
        // Categorias de receita e despesa aparecem em TODOS os centros de custo
        const { data, error } = await supabase
          .from('categorias')
          .select('*')
          .eq('tipo', tipo)
          .eq('ativo', true)
          .order('nome');

        if (error) throw error;

        setCategorias((data || []).map(cat => ({
          ...cat,
          tipo: cat.tipo as TipoCategoria
        })));
      }
    } catch (error) {
      console.error('Erro ao buscar categorias filtradas:', error);
      setCategorias([]);
    } finally {
      setLoading(false);
    }
  }, [contaBancariaId, centroCustoId, tipo]);

  useEffect(() => {
    fetchCategoriasFiltradas();
  }, [fetchCategoriasFiltradas]);

  // Realtime subscription
  useEffect(() => {
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
  }, [fetchCategoriasFiltradas]);

  return { categorias, loading, refetch: fetchCategoriasFiltradas };
}
