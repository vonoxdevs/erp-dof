import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CentroCusto {
  id: string;
  nome: string;
  icon?: string;
  cor?: string;
}

interface SelectCentroCustoProps {
  contaBancariaId: string | null;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function SelectCentroCusto({
  contaBancariaId,
  value,
  onChange,
  placeholder = 'Selecione um centro de custo',
  disabled = false
}: SelectCentroCustoProps) {
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!contaBancariaId) {
      setCentrosCusto([]);
      return;
    }

    async function fetchCentrosCusto() {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from('categorias')
          .select(`
            id,
            nome,
            icon,
            cor,
            categoria_conta_bancaria!inner(
              habilitado,
              conta_bancaria_id
            )
          `)
          .eq('tipo', 'centro_custo')
          .eq('ativo', true)
          .eq('categoria_conta_bancaria.conta_bancaria_id', contaBancariaId)
          .eq('categoria_conta_bancaria.habilitado', true)
          .order('nome');

        if (error) throw error;

        setCentrosCusto(data || []);
      } catch (error) {
        console.error('Erro ao buscar centros de custo:', error);
        setCentrosCusto([]);
      } finally {
        setLoading(false);
      }
    }

    fetchCentrosCusto();
  }, [contaBancariaId]);

  const isDisabled = disabled || !contaBancariaId || loading;

  return (
    <Select value={value} onValueChange={onChange} disabled={isDisabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {centrosCusto.length === 0 ? (
          <div className="p-2 text-sm text-muted-foreground">
            {loading ? 'Carregando...' : 'Nenhum centro de custo disponível para esta conta'}
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
  );
}
