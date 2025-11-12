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
  icon?: string;
  cor?: string;
}

interface SelectCentroCustoProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function SelectCentroCusto({
  value,
  onChange,
  placeholder = 'Selecione um centro de custo',
  disabled = false
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

      const { data, error } = await supabase
        .from('categorias')
        .select('id, nome, icon, cor')
        .eq('tipo', 'centro_custo')
        .eq('ativo', true)
        .eq('company_id', profile.company_id)
        .order('nome');

      if (error) throw error;

      setCentrosCusto(data || []);
    } catch (error) {
      console.error('Erro ao buscar centros de custo:', error);
      setCentrosCusto([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCentrosCusto();
  }, []);

  const isDisabled = disabled || loading;

  const handleCentroCustoCreated = (centroCustoId: string) => {
    fetchCentrosCusto();
    onChange(centroCustoId);
  };

  return (
    <>
      <div className="flex gap-2">
        <Select value={value} onValueChange={onChange} disabled={isDisabled}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {centrosCusto.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground">
                {loading ? 'Carregando...' : 'Nenhum centro de custo cadastrado'}
              </div>
            ) : (
              centrosCusto.map(centro => (
                <SelectItem key={centro.id} value={centro.id}>
                  <div className="flex items-center gap-2">
                    {centro.icon && <span>{centro.icon}</span>}
                    <span>{centro.nome}</span>
                  </div>
                </SelectItem>
              ))
            )}
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
