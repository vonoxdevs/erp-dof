import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, ArrowRightLeft, AlertCircle, Repeat } from "lucide-react";
import { z } from "zod";
import { sanitizeError } from "@/lib/errorMapping";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { getTodayForInput, formatDateForInput } from '@/lib/dateUtils';
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

const transferSchema = z.object({
  amount: z.number().positive("O valor deve ser maior que zero"),
  description: z.string().min(1, "Descrição é obrigatória"),
  due_date: z.string().min(1, "Data é obrigatória"),
  status: z.enum(["pending", "paid", "overdue", "cancelled"]),
  account_from_id: z.string().uuid("Selecione a conta de origem"),
  account_to_id: z.string().uuid("Selecione a conta de destino"),
}).refine(
  (data) => data.account_from_id !== data.account_to_id,
  { message: "As contas devem ser diferentes", path: ["account_to_id"] }
);

interface Transaction {
  id: string;
  amount: number;
  description: string;
  due_date: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
  account_from_id?: string | null;
  account_to_id?: string | null;
  is_recurring?: boolean;
  recurrence_config?: {
    frequency: string;
    total_installments?: number | null;
    end_date?: string | null;
  } | null;
}

interface Props {
  open: boolean;
  onClose: (refresh?: boolean) => void;
  transaction?: Transaction | null;
}

export function TransferDialog({ open, onClose, transaction }: Props) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: undefined as number | undefined,
    description: "",
    due_date: getTodayForInput(),
    status: "pending" as "pending" | "paid" | "overdue" | "cancelled",
    account_from_id: null as string | null,
    account_to_id: null as string | null,
    is_recurring: false,
    frequency: "monthly",
    total_installments: undefined as number | undefined,
    end_date: "",
  });
  const { accounts: bankAccounts, isLoading: accountsLoading } = useBankAccounts();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getNewBalance = (accountId: string | null, isDebit: boolean) => {
    if (!accountId || !formData.amount) return null;
    const account = bankAccounts?.find(acc => acc.id === accountId);
    if (!account) return null;
    return isDebit 
      ? account.current_balance - formData.amount 
      : account.current_balance + formData.amount;
  };

  useEffect(() => {
    if (open) {
      if (transaction) {
        setFormData({
          amount: transaction.amount,
          description: transaction.description,
          due_date: transaction.due_date,
          status: transaction.status,
          account_from_id: transaction.account_from_id || null,
          account_to_id: transaction.account_to_id || null,
          is_recurring: transaction.is_recurring || false,
          frequency: transaction.recurrence_config?.frequency || "monthly",
          total_installments: transaction.recurrence_config?.total_installments || undefined,
          end_date: transaction.recurrence_config?.end_date || "",
        });
      } else {
        setFormData({
          amount: undefined,
          description: "",
          due_date: getTodayForInput(),
          status: "pending",
          account_from_id: null,
          account_to_id: null,
          is_recurring: false,
          frequency: "monthly",
          total_installments: undefined,
          end_date: "",
        });
      }
    }
  }, [open, transaction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile) throw new Error("Perfil não encontrado");

      const validationResult = transferSchema.safeParse(formData);

      if (!validationResult.success) {
        const errorMessages = validationResult.error.errors.map(err => err.message).join(", ");
        throw new Error(errorMessages);
      }

      const recurrenceConfig = formData.is_recurring
        ? {
            frequency: formData.frequency,
            total_installments: formData.total_installments || null,
            end_date: formData.end_date || null,
          }
        : null;

      const dataToSave = {
        type: "transfer" as const,
        amount: formData.amount,
        description: formData.description,
        due_date: formData.due_date,
        status: formData.status,
        company_id: profile.company_id,
        created_by: user.id,
        account_from_id: formData.account_from_id || null,
        account_to_id: formData.account_to_id || null,
        is_recurring: formData.is_recurring,
        recurrence_config: recurrenceConfig,
      };

      if (transaction) {
        const { error } = await supabase
          .from("transactions")
          .update(dataToSave)
          .eq("id", transaction.id);
        if (error) throw error;
        toast.success("Transferência atualizada com sucesso!");
      } else {
        const { error } = await supabase.from("transactions").insert([dataToSave]);
        if (error) throw error;
        toast.success("Transferência criada com sucesso!");
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bank-accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['pending-transactions'] })
      ]);
      onClose(true);
    } catch (error: any) {
      console.error('❌ Erro ao salvar transferência:', error);
      const errorMessage = sanitizeError(error);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            {transaction ? "Editar Transferência" : "Nova Transferência"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="overdue">Vencido</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount || ""}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value ? parseFloat(e.target.value) : undefined })
                }
                placeholder="0,00"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição *</Label>
            <Input
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Ex: Transferência entre contas"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Data da Transferência *</Label>
            <Input
              type="date"
              value={formData.due_date}
              onChange={(e) =>
                setFormData({ ...formData, due_date: e.target.value })
              }
              required
            />
          </div>

          {!accountsLoading && (!bankAccounts || bankAccounts.length < 2) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Cadastre pelo menos duas contas bancárias para realizar transferências.
              </AlertDescription>
            </Alert>
          )}

          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  De: Conta de Origem *
                </Label>
                <Select 
                  value={formData.account_from_id || ""}
                  onValueChange={(value) =>
                    setFormData({ ...formData, account_from_id: value || null })
                  }
                  disabled={accountsLoading || !bankAccounts?.length}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta de origem" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts?.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex justify-between items-center w-full gap-4">
                          <span>{account.bank_name} - {account.account_number}</span>
                          <span className="text-sm text-muted-foreground">
                            {formatCurrency(account.current_balance)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.account_from_id && formData.amount && (
                  <p className={cn(
                    "text-sm mt-2 font-medium",
                    getNewBalance(formData.account_from_id, true)! < 0 ? "text-destructive" : "text-foreground"
                  )}>
                    Novo saldo: {formatCurrency(getNewBalance(formData.account_from_id, true) || 0)}
                    {getNewBalance(formData.account_from_id, true)! < 0 && (
                      <span className="ml-2">(⚠️ Ficará negativo!)</span>
                    )}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-accent/30 bg-accent/5">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Para: Conta de Destino *
                </Label>
                <Select 
                  value={formData.account_to_id || ""}
                  onValueChange={(value) =>
                    setFormData({ ...formData, account_to_id: value || null })
                  }
                  disabled={accountsLoading || !bankAccounts?.length}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta de destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts
                      ?.filter(acc => acc.id !== formData.account_from_id)
                      .map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex justify-between items-center w-full gap-4">
                            <span>{account.bank_name} - {account.account_number}</span>
                            <span className="text-sm text-muted-foreground">
                              {formatCurrency(account.current_balance)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {formData.account_to_id && formData.amount && (
                  <p className="text-sm mt-2 font-medium text-foreground">
                    Novo saldo: {formatCurrency(getNewBalance(formData.account_to_id, false) || 0)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recorrência */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_recurring"
                  checked={formData.is_recurring}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_recurring: checked as boolean })
                  }
                />
                <Label htmlFor="is_recurring" className="flex items-center gap-2 cursor-pointer">
                  <Repeat className="h-4 w-4" />
                  Transação Recorrente
                </Label>
              </div>

              {formData.is_recurring && (
                <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                  <div className="space-y-2">
                    <Label>Frequência *</Label>
                    <Select
                      value={formData.frequency}
                      onValueChange={(value) =>
                        setFormData({ ...formData, frequency: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Diária</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                        <SelectItem value="quarterly">Trimestral</SelectItem>
                        <SelectItem value="semiannual">Semestral</SelectItem>
                        <SelectItem value="annual">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Total de Parcelas</Label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.total_installments || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            total_installments: e.target.value ? parseInt(e.target.value) : undefined,
                          })
                        }
                        placeholder="Ex: 12"
                      />
                      <p className="text-xs text-muted-foreground">
                        Deixe vazio para recorrência sem fim
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Data de Término</Label>
                      <Input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) =>
                          setFormData({ ...formData, end_date: e.target.value })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Alternativa ao total de parcelas
                      </p>
                    </div>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {formData.total_installments && formData.end_date
                        ? "⚠️ Quando ambos são definidos, o que atingir primeiro será usado."
                        : formData.total_installments
                        ? `Serão geradas ${formData.total_installments} parcelas automaticamente.`
                        : formData.end_date
                        ? `Parcelas serão geradas até ${new Date(formData.end_date).toLocaleDateString("pt-BR")}.`
                        : "Parcelas serão geradas indefinidamente (até cancelar)."}
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onClose()}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !bankAccounts || bankAccounts.length < 2}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {transaction ? "Atualizando..." : "Criando..."}
                </>
              ) : (
                transaction ? "Atualizar Transferência" : "Criar Transferência"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
