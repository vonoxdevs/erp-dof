import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
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
  const [categoriaParaExcluir, setCategoriaParaExcluir] = useState<string | null>(null);
  const { toast } = useToast();

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
              <TableHead>Disponível em</TableHead>
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
                
                <TableCell>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      {tipo === 'centro_custo' 
                        ? '✓ Todas as contas bancárias'
                        : '✓ Todos os centros de custo'
                      }
                    </span>
                  </div>
                </TableCell>
                
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
