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
          ),
          centro_custo:categorias!centro_custo_id(
            id,
            nome,
            icon,
            cor
          )
        `)
        .eq('ativo', true)
        .order('nome');

      if (tipo) {
        query = query.eq('tipo', tipo);
      }

      const { data, error } = await query;

      if (error) throw error;

      const categoriasComContas: CategoriaComContas[] = data?.map(cat => ({
        ...cat,
        tipo: cat.tipo as TipoCategoria,
        icon: cat.icon || '📁',
        cor: cat.cor || '#3b82f6',
        contas_habilitadas: cat.categoria_conta_bancaria
          ?.filter((ccc: any) => ccc.habilitado)
          .map((ccc: any) => ccc.conta_bancaria_id) || [],
        centro_custo: cat.centro_custo || null
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
  }, [tipo]);

  return { categorias, loading, refetch: fetchCategorias };
}
