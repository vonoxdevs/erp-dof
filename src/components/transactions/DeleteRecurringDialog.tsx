import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface DeleteRecurringDialogProps {
  open: boolean;
  onClose: () => void;
  onDeleteOne: () => void;
  onDeleteAll: () => void;
  onDeleteFromThis: () => void;
  isRecurring: boolean;
  hasRecurrences: boolean;
}

export function DeleteRecurringDialog({
  open,
  onClose,
  onDeleteOne,
  onDeleteAll,
  onDeleteFromThis,
  isRecurring,
  hasRecurrences,
}: DeleteRecurringDialogProps) {
  // Se não é recorrente e não tem recorrências, apenas confirma exclusão
  if (!isRecurring && !hasRecurrences) {
    return (
      <AlertDialog open={open} onOpenChange={onClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onDeleteOne} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Se é recorrente ou tem recorrências, dá opções
  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir transação recorrente</AlertDialogTitle>
          <AlertDialogDescription>
            {isRecurring
              ? "Esta é a transação original que gera as recorrências. O que você deseja fazer?"
              : "Esta transação faz parte de uma série de recorrências. O que você deseja fazer?"}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button
            variant="outline"
            onClick={() => {
              onDeleteOne();
              onClose();
            }}
            className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            Excluir apenas esta
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              onDeleteFromThis();
              onClose();
            }}
            className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
          >
            Excluir desta em diante
          </Button>
          <Button
            onClick={() => {
              onDeleteAll();
              onClose();
            }}
            className="bg-destructive hover:bg-destructive/90"
          >
            Excluir todas as recorrências
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
