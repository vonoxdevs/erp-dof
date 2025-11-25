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

interface EditRecurringDialogProps {
  open: boolean;
  onClose: () => void;
  onEditOne: () => void;
  onEditAll: () => void;
  onEditFromThis: () => void;
  isRecurring: boolean;
  hasContract: boolean;
}

export function EditRecurringDialog({
  open,
  onClose,
  onEditOne,
  onEditAll,
  onEditFromThis,
  isRecurring,
  hasContract,
}: EditRecurringDialogProps) {
  // Se não é recorrente e não tem contrato, não mostra o dialog
  const shouldShow = open && (isRecurring || hasContract);

  return (
    <AlertDialog open={shouldShow} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            <AlertDialogTitle className="text-xl">Editar transação recorrente</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base pt-2">
            Esta transação faz parte de uma série recorrente. Escolha como deseja aplicar as alterações:
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid gap-3 py-4">
          <Card 
            className="cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5"
            onClick={() => {
              onEditOne();
              onClose();
            }}
          >
            <CardContent className="flex items-start gap-4 p-4">
              <div className="rounded-full bg-primary/10 p-2">
                <Edit className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-1">Editar apenas esta transação</h4>
                <p className="text-xs text-muted-foreground">
                  Altera apenas esta ocorrência específica. As demais permanecerão com os dados originais.
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
                <h4 className="font-semibold text-sm mb-1">Editar desta em diante</h4>
                <p className="text-xs text-muted-foreground">
                  Altera esta transação e todas as futuras da mesma série. As anteriores permanecem inalteradas.
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
                  Editar todas as recorrências
                </h4>
                <p className="text-xs text-muted-foreground">
                  Altera todas as transações desta série recorrente (passadas, presentes e futuras).
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
