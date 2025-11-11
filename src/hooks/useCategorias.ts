import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CategoriaComContas, TipoCategoria } from '@/types/categoria';
import { useToast } from '@/hooks/use-toast';

export function useCategorias(tipo?: TipoCategoria) {
  const [categorias, setCategorias] = useState<CategoriaComContas[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchCategorias = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('categorias')
        .select(`
          *,
          categoria_conta_bancaria(
            conta_bancaria_id,
            habilitado
          )
        `)
        .eq('ativo', true)
        .order('nome');

      if (tipo) {
        query = query.eq('tipo', tipo);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Buscar centros de custo separadamente
      const centrosCustoIds = data
        ?.map(cat => cat.centro_custo_id)
        .filter(Boolean) || [];

      let centrosCustoMap: Record<string, any> = {};
      
      if (centrosCustoIds.length > 0) {
        const { data: centrosCustoData } = await supabase
          .from('categorias')
          .select('id, nome, icon, cor')
          .in('id', centrosCustoIds);

        centrosCustoMap = (centrosCustoData || []).reduce((acc, centro) => {
          acc[centro.id] = centro;
          return acc;
        }, {} as Record<string, any>);
      }

      const categoriasComContas: CategoriaComContas[] = data?.map(cat => ({
        ...cat,
        tipo: cat.tipo as TipoCategoria,
        icon: cat.icon || '📁',
        cor: cat.cor || '#3b82f6',
        contas_habilitadas: cat.categoria_conta_bancaria
          ?.filter((ccc: any) => ccc.habilitado)
          .map((ccc: any) => ccc.conta_bancaria_id) || [],
        centro_custo: cat.centro_custo_id ? centrosCustoMap[cat.centro_custo_id] || null : null
      })) || [];

      setCategorias(categoriasComContas);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar categorias',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategorias();

    // Realtime subscription
    const channel = supabase
      .channel('categorias-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categorias'
        },
        () => fetchCategorias()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tipo]);

  return { categorias, loading, refetch: fetchCategorias };
}
