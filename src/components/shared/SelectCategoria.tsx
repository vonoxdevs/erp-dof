import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCategoriasFiltradas } from '@/hooks/useCategoriasFiltradas';
import { TipoCategoria } from '@/types/categoria';

interface SelectCategoriaProps {
  contaBancariaId?: string | null;
  centroCustoId?: string | null;
  tipo: TipoCategoria;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  refreshKey?: number; // Key para forçar refetch
}

export function SelectCategoria({
  contaBancariaId,
  centroCustoId,
  tipo,
  value,
  onChange,
  placeholder,
  disabled = false,
  refreshKey
}: SelectCategoriaProps) {
  const { categorias, loading, refetch } = useCategoriasFiltradas({
    contaBancariaId,
    centroCustoId,
    tipo
  });

  // Força refetch quando refreshKey muda
  React.useEffect(() => {
    if (refreshKey !== undefined && refreshKey > 0) {
      refetch();
    }
  }, [refreshKey, refetch]);

  // Para centro_custo, precisa contaBancariaId
  // Para receita/despesa, NÃO precisa mais de centroCustoId (aparecem em todos)
  const requiredId = tipo === 'centro_custo' ? contaBancariaId : true;
  const isDisabled = disabled || (tipo === 'centro_custo' && !contaBancariaId) || loading;

  // Se não há categorias, mostra placeholder apropriado
  const displayPlaceholder = loading 
    ? 'Carregando...' 
    : categorias.length === 0 
      ? 'Nenhuma categoria disponível' 
      : placeholder;

  return (
    <Select 
      value={categorias.length > 0 ? value : ""} 
      onValueChange={onChange} 
      disabled={isDisabled || categorias.length === 0}
    >
      <SelectTrigger>
        <SelectValue placeholder={displayPlaceholder} />
      </SelectTrigger>
      <SelectContent>
        {categorias.map(categoria => (
          <SelectItem key={categoria.id} value={categoria.id}>
            {categoria.nome}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
