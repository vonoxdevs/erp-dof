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
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Calendar, CalendarRange, AlertTriangle } from "lucide-react";

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
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <AlertDialogTitle className="text-xl">Excluir transação recorrente</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base pt-2">
            Esta transação faz parte de uma série recorrente (contrato ou recorrência). Escolha como deseja proceder com a exclusão:
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid gap-3 py-4">
          <Card 
            className="cursor-pointer transition-all hover:border-destructive/50 hover:bg-destructive/5"
            onClick={() => {
              onDeleteOne();
              onClose();
            }}
          >
            <CardContent className="flex items-start gap-4 p-4">
              <div className="rounded-full bg-destructive/10 p-2">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-1">Excluir apenas esta transação</h4>
                <p className="text-xs text-muted-foreground">
                  Remove apenas esta ocorrência específica. As demais permanecerão intactas.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer transition-all hover:border-orange-500/50 hover:bg-orange-500/5"
            onClick={() => {
              onDeleteFromThis();
              onClose();
            }}
          >
            <CardContent className="flex items-start gap-4 p-4">
              <div className="rounded-full bg-orange-500/10 p-2">
                <CalendarRange className="h-5 w-5 text-orange-500" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-1">Excluir desta em diante</h4>
                <p className="text-xs text-muted-foreground">
                  Remove esta transação e todas as futuras. As anteriores permanecerão.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer transition-all hover:border-destructive hover:bg-destructive/5 border-destructive/30"
            onClick={() => {
              onDeleteAll();
              onClose();
            }}
          >
            <CardContent className="flex items-start gap-4 p-4">
              <div className="rounded-full bg-destructive/10 p-2">
                <Calendar className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-1 text-destructive">
                  Excluir todas as recorrências
                </h4>
                <p className="text-xs text-muted-foreground">
                  Remove a transação original e todas as recorrências geradas. Esta ação não pode ser desfeita.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
