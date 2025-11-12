import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TransferTransactionsDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (targetAccountId: string | null) => void;
  accountToDelete: {
    id: string;
    bank_name: string;
    account_number: string;
  } | null;
  transactionCount: number;
  availableAccounts: Array<{
    id: string;
    bank_name: string;
    account_number: string;
  }>;
  loading?: boolean;
}

export function TransferTransactionsDialog({
  open,
  onClose,
  onConfirm,
  accountToDelete,
  transactionCount,
  availableAccounts,
  loading = false,
}: TransferTransactionsDialogProps) {
  const [targetAccountId, setTargetAccountId] = useState<string>("");

  const handleConfirm = () => {
    onConfirm(targetAccountId || null);
  };

  if (!accountToDelete) return null;

  const hasTransactions = transactionCount > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Excluir Conta Bancária</DialogTitle>
          <DialogDescription>
            Você está prestes a excluir a conta:
            <br />
            <strong>
              {accountToDelete.bank_name} - {accountToDelete.account_number}
            </strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {hasTransactions && (
            <>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Esta conta possui <strong>{transactionCount}</strong>{" "}
                  {transactionCount === 1 ? "transação vinculada" : "transações vinculadas"}.
                </AlertDescription>
              </Alert>

              {availableAccounts.length > 0 ? (
                <div className="space-y-2">
                  <Label htmlFor="target-account">
                    Para qual conta deseja transferir as transações?
                  </Label>
                  <Select
                    value={targetAccountId}
                    onValueChange={setTargetAccountId}
                  >
                    <SelectTrigger id="target-account">
                      <SelectValue placeholder="Selecione uma conta ou deixe em branco para excluir" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.bank_name} - {account.account_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Opcional: Se não selecionar nenhuma conta, as transações serão mantidas sem conta vinculada.
                  </p>
                </div>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Não há outras contas bancárias disponíveis. As transações serão mantidas sem conta vinculada.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          {!hasTransactions && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Esta conta não possui transações vinculadas. Ela será excluída permanentemente.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? "Excluindo..." : "Confirmar Exclusão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
