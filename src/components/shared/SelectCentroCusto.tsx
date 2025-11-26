import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Plus } from 'lucide-react';
import { QuickCentroCustoDialog } from './QuickCentroCustoDialog';

interface CentroCusto {
  id: string;
  nome: string;
  cor?: string;
}

interface SelectCentroCustoProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  contaBancariaId?: string | null;
}

export function SelectCentroCusto({
  value,
  onChange,
  placeholder = 'Selecione um centro de custo',
  disabled = false,
  contaBancariaId
}: SelectCentroCustoProps) {
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchCentrosCusto = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) return;

      // Se tem conta bancária selecionada, filtra pelos centros vinculados
      if (contaBancariaId) {
        const { data, error } = await supabase
          .from('categorias')
          .select(`
            id,
            nome,
            cor,
            categoria_conta_bancaria!inner(
              habilitado,
              conta_bancaria_id
            )
          `)
          .eq('tipo', 'centro_custo')
          .eq('ativo', true)
          .eq('company_id', profile.company_id)
          .eq('categoria_conta_bancaria.conta_bancaria_id', contaBancariaId)
          .eq('categoria_conta_bancaria.habilitado', true)
          .order('nome');

        if (error) throw error;
        setCentrosCusto(data || []);
      } else {
        // Sem conta selecionada, mostra todos os centros de custo ativos
        const { data, error } = await supabase
          .from('categorias')
          .select('id, nome, cor')
          .eq('tipo', 'centro_custo')
          .eq('ativo', true)
          .eq('company_id', profile.company_id)
          .order('nome');

        if (error) throw error;
        setCentrosCusto(data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar centros de custo:', error);
      setCentrosCusto([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCentrosCusto();

    // Realtime subscription
    const channel = supabase
      .channel('centros-custo-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categorias'
        },
        () => {
          fetchCentrosCusto();
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
          fetchCentrosCusto();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contaBancariaId]);

  const isDisabled = disabled || loading;

  const handleCentroCustoCreated = async (centroCustoId: string) => {
    await fetchCentrosCusto();
    onChange(centroCustoId);
    setDialogOpen(false);
  };

  // Placeholder dinâmico baseado no estado
  const displayPlaceholder = loading 
    ? 'Carregando...' 
    : centrosCusto.length === 0 
      ? (contaBancariaId ? 'Nenhum centro vinculado à conta' : 'Nenhum centro de custo')
      : placeholder;

  return (
    <>
      <div className="flex gap-2">
        <Select 
          value={centrosCusto.length > 0 ? value : ""} 
          onValueChange={onChange} 
          disabled={isDisabled || centrosCusto.length === 0}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={displayPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {centrosCusto.map(centro => (
              <SelectItem key={centro.id} value={centro.id}>
                <div className="flex items-center gap-2">
                  {centro.cor && (
                    <div 
                      className="w-3 h-3 rounded-full shrink-0" 
                      style={{ backgroundColor: centro.cor }}
                    />
                  )}
                  <span>{centro.nome}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setDialogOpen(true)}
          disabled={isDisabled}
          title="Novo Centro de Custo"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <QuickCentroCustoDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCentroCustoCreated={handleCentroCustoCreated}
      />
    </>
  );
}
