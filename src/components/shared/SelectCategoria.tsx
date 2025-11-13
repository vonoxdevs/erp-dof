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
}

export function SelectCategoria({
  contaBancariaId,
  centroCustoId,
  tipo,
  value,
  onChange,
  placeholder,
  disabled = false
}: SelectCategoriaProps) {
  const { categorias, loading, refetch } = useCategoriasFiltradas({
    contaBancariaId,
    centroCustoId,
    tipo
  });

  // Para centro_custo, precisa contaBancariaId
  // Para receita/despesa, NÃO precisa mais de centroCustoId (aparecem em todos)
  const requiredId = tipo === 'centro_custo' ? contaBancariaId : true;
  const isDisabled = disabled || (tipo === 'centro_custo' && !contaBancariaId) || loading;

  return (
    <Select value={value} onValueChange={onChange} disabled={isDisabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {categorias.length === 0 ? (
          <div className="p-2 text-sm text-muted-foreground">
            {loading ? 'Carregando...' : 'Nenhuma categoria disponível para esta conta'}
          </div>
        ) : (
          categorias.map(categoria => (
            <SelectItem key={categoria.id} value={categoria.id}>
              {categoria.nome}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
