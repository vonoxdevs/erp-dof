import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCategorias } from '@/hooks/useCategorias';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TipoCategoria } from '@/types/categoria';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface FinancialCategoryTableProps {
  tipo: TipoCategoria;
  onEditar: (id: string) => void;
}

export function FinancialCategoryTable({ tipo, onEditar }: FinancialCategoryTableProps) {
  const { categorias, loading, refetch } = useCategorias(tipo);
  const [contasBancarias, setContasBancarias] = useState<any[]>([]);
  const [categoriaParaExcluir, setCategoriaParaExcluir] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchContasBancarias() {
      if (tipo === 'centro_custo') {
        const { data } = await supabase
          .from('bank_accounts')
          .select('id, bank_name, account_number')
          .eq('is_active', true)
          .order('bank_name');
        
        setContasBancarias(data || []);
      }
    }
    fetchContasBancarias();
  }, [tipo]);

  const handleToggleContaBancaria = async (
    categoriaId: string,
    contaBancariaId: string,
    habilitado: boolean
  ) => {
    try {
      const { data: existente } = await supabase
        .from('categoria_conta_bancaria')
        .select('id')
        .eq('categoria_id', categoriaId)
        .eq('conta_bancaria_id', contaBancariaId)
        .maybeSingle();

      if (existente) {
        const { error } = await supabase
          .from('categoria_conta_bancaria')
          .update({ habilitado })
          .eq('id', existente.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('categoria_conta_bancaria')
          .insert({
            categoria_id: categoriaId,
            conta_bancaria_id: contaBancariaId,
            habilitado
          });

        if (error) throw error;
      }

      toast({
        title: 'Conta bancária atualizada',
        description: habilitado 
          ? 'Categoria habilitada para esta conta' 
          : 'Categoria desabilitada para esta conta'
      });

      refetch();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleExcluir = async () => {
    if (!categoriaParaExcluir) return;

    try {
      const { error } = await supabase
        .from('categorias')
        .update({ ativo: false })
        .eq('id', categoriaParaExcluir);

      if (error) throw error;

      toast({
        title: 'Categoria excluída',
        description: 'A categoria foi desativada com sucesso'
      });

      refetch();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setCategoriaParaExcluir(null);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando categorias...</div>;
  }

  if (categorias.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma categoria cadastrada ainda
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              
              {tipo === 'centro_custo' && contasBancarias.map(conta => (
                <TableHead key={conta.id} className="text-center">
                  {conta.bank_name}
                </TableHead>
              ))}
              
              {(tipo === 'receita' || tipo === 'despesa') && (
                <TableHead>Disponível em Todos</TableHead>
              )}
              
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categorias.map(categoria => (
              <TableRow key={categoria.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: categoria.cor || '#3b82f6' }}
                    />
                    {categoria.nome}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {categoria.descricao || '-'}
                </TableCell>
                
                {tipo === 'centro_custo' && contasBancarias.map(conta => (
                  <TableCell key={conta.id} className="text-center">
                    <Checkbox
                      checked={categoria.contas_habilitadas?.includes(conta.id)}
                      onCheckedChange={(checked) =>
                        handleToggleContaBancaria(
                          categoria.id,
                          conta.id,
                          checked as boolean
                        )
                      }
                    />
                  </TableCell>
                ))}
                
                {(tipo === 'receita' || tipo === 'despesa') && (
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        ✓ Todos os centros de custo
                      </span>
                    </div>
                  </TableCell>
                )}
                
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditar(categoria.id)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCategoriaParaExcluir(categoria.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog 
        open={!!categoriaParaExcluir} 
        onOpenChange={() => setCategoriaParaExcluir(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleExcluir}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
