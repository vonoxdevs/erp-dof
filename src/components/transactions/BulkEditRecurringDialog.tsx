import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Edit, Calendar, CalendarRange, AlertTriangle } from "lucide-react";

interface BulkEditRecurringDialogProps {
  open: boolean;
  onClose: () => void;
  onEditSelected: () => void;
  onEditAll: () => void;
  onEditFromThis: () => void;
  hasRecurring: boolean;
  action: "delete" | "markAsPaid";
}

export function BulkEditRecurringDialog({
  open,
  onClose,
  onEditSelected,
  onEditAll,
  onEditFromThis,
  hasRecurring,
  action,
}: BulkEditRecurringDialogProps) {
  if (!hasRecurring) {
    return null;
  }

  const actionLabels = {
    delete: {
      title: "Excluir transações em lote",
      description: "Algumas transações selecionadas fazem parte de séries recorrentes. Escolha como deseja aplicar a exclusão:",
      one: "Excluir apenas as selecionadas",
      oneDesc: "Exclui somente as transações que você selecionou. As demais da série permanecem.",
      fromThis: "Excluir das selecionadas em diante",
      fromThisDesc: "Exclui as transações selecionadas e todas as futuras das mesmas séries.",
      all: "Excluir todas as recorrências",
      allDesc: "Exclui todas as transações das séries recorrentes selecionadas (passadas, presentes e futuras).",
    },
    markAsPaid: {
      title: "Marcar transações como pagas em lote",
      description: "Algumas transações selecionadas fazem parte de séries recorrentes. Escolha como deseja aplicar a marcação:",
      one: "Marcar apenas as selecionadas",
      oneDesc: "Marca como paga somente as transações que você selecionou.",
      fromThis: "Marcar das selecionadas em diante",
      fromThisDesc: "Marca como paga as transações selecionadas e todas as futuras das mesmas séries.",
      all: "Marcar todas as recorrências",
      allDesc: "Marca como paga todas as transações das séries recorrentes selecionadas.",
    },
  };

  const labels = actionLabels[action];

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            <AlertDialogTitle className="text-xl">{labels.title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base pt-2">
            {labels.description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid gap-3 py-4">
          <Card 
            className="cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5"
            onClick={() => {
              onEditSelected();
              onClose();
            }}
          >
            <CardContent className="flex items-start gap-4 p-4">
              <div className="rounded-full bg-primary/10 p-2">
                <Edit className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-1">{labels.one}</h4>
                <p className="text-xs text-muted-foreground">
                  {labels.oneDesc}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer transition-all hover:border-orange-500/50 hover:bg-orange-500/5"
            onClick={() => {
              onEditFromThis();
              onClose();
            }}
          >
            <CardContent className="flex items-start gap-4 p-4">
              <div className="rounded-full bg-orange-500/10 p-2">
                <CalendarRange className="h-5 w-5 text-orange-500" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-1">{labels.fromThis}</h4>
                <p className="text-xs text-muted-foreground">
                  {labels.fromThisDesc}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer transition-all hover:border-blue-500/50 hover:bg-blue-500/5"
            onClick={() => {
              onEditAll();
              onClose();
            }}
          >
            <CardContent className="flex items-start gap-4 p-4">
              <div className="rounded-full bg-blue-500/10 p-2">
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-1">
                  {labels.all}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {labels.allDesc}
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
