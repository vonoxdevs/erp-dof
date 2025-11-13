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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calculator } from "lucide-react";
import { CurrencyInput } from "@/components/shared/CurrencyInput";

interface AdjustBalanceDialogProps {
  open: boolean;
  onClose: (refresh?: boolean) => void;
  account: {
    id: string;
    bank_name: string;
    current_balance: number;
  } | null;
}

export function AdjustBalanceDialog({ open, onClose, account }: AdjustBalanceDialogProps) {
  const [newBalance, setNewBalance] = useState<number | undefined>();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!account || newBalance === undefined) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (!reason.trim()) {
      toast.error("Informe o motivo do ajuste");
      return;
    }

    setLoading(true);
    try {
      const adjustment = newBalance - account.current_balance;

      // Atualizar saldo da conta
      const { error: updateError } = await supabase
        .from("bank_accounts")
        .update({
          current_balance: newBalance,
          available_balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq("id", account.id);

      if (updateError) throw updateError;

      // Criar transação de ajuste para registro
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile) throw new Error("Perfil não encontrado");

      // Criar transação de ajuste (sem categorias para evitar problemas de foreign key)
      const { error: transactionError } = await supabase
        .from("transactions")
        .insert({
          company_id: profile.company_id,
          type: adjustment >= 0 ? "revenue" : "expense",
          description: `Ajuste manual de saldo - ${reason}`,
          amount: Math.abs(adjustment),
          due_date: new Date().toISOString().split('T')[0],
          payment_date: new Date().toISOString().split('T')[0],
          status: "paid",
          bank_account_id: account.id,
          account_to_id: adjustment >= 0 ? account.id : null,
          account_from_id: adjustment < 0 ? account.id : null,
          notes: `Ajuste manual: Saldo anterior R$ ${account.current_balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} → Novo saldo R$ ${newBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          created_by: user.id,
          category_id: null,
          contact_id: null,
          centro_custo_id: null,
          categoria_receita_id: null,
          categoria_despesa_id: null
        });

      if (transactionError) throw transactionError;

      toast.success("Saldo ajustado com sucesso!");
      setNewBalance(undefined);
      setReason("");
      onClose(true);
    } catch (error: any) {
      toast.error(error.message || "Erro ao ajustar saldo");
    } finally {
      setLoading(false);
    }
  };

  const adjustment = account && newBalance !== undefined 
    ? newBalance - account.current_balance 
    : 0;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Ajustar Saldo Manualmente
          </DialogTitle>
          <DialogDescription>
            {account && (
              <>
                Conta: {account.bank_name}
                <br />
                Saldo atual: R$ {account.current_balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Novo Saldo (R$) *</Label>
            <CurrencyInput
              value={newBalance}
              onChange={setNewBalance}
              placeholder="0,00"
            />
            {newBalance !== undefined && account && (
              <p className={`text-sm ${adjustment >= 0 ? 'text-accent' : 'text-destructive'}`}>
                Ajuste: {adjustment >= 0 ? '+' : ''}R$ {Math.abs(adjustment).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Motivo do Ajuste *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Conciliação bancária, correção de lançamento, etc."
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {reason.length}/500 caracteres
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onClose()}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Ajustando..." : "Confirmar Ajuste"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
