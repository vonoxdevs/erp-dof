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
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, TrendingUp, AlertCircle, Repeat } from "lucide-react";
import { z } from "zod";
import { sanitizeError } from "@/lib/errorMapping";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { SelectCentroCusto } from '@/components/shared/SelectCentroCusto';
import { SelectCategoria } from '@/components/shared/SelectCategoria';
import { SelectCliente } from '@/components/shared/SelectCliente';
import { QuickCategoryDialog } from '@/components/categories/QuickCategoryDialog';
import { Plus } from 'lucide-react';

const revenueSchema = z.object({
  amount: z.number().positive("O valor deve ser maior que zero"),
  description: z.string().min(1, "Descrição é obrigatória"),
  due_date: z.string().min(1, "Data de vencimento é obrigatória"),
  status: z.enum(["pending", "paid", "overdue", "cancelled"]),
  customer_name: z.string().nullable().optional(),
  account_to_id: z.string().uuid("Selecione a conta de destino"),
});

interface Transaction {
  id: string;
  amount: number;
  description: string;
  due_date: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
  customer_name?: string | null;
  contact_id?: string | null;
  centro_custo_id?: string | null;
  categoria_receita_id?: string | null;
  bank_account_id?: string | null;
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

export function RevenueDialog({ open, onClose, transaction }: Props) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [centroCustoId, setCentroCustoId] = useState<string | null>(null);
  const [categoriaReceitaId, setCategoriaReceitaId] = useState<string | null>(null);
  const [quickCategoryOpen, setQuickCategoryOpen] = useState(false);
  const [formData, setFormData] = useState({
    amount: undefined as number | undefined,
    description: "",
    due_date: new Date().toISOString().split("T")[0],
    status: "pending" as "pending" | "paid" | "overdue" | "cancelled",
    customer_name: "",
    contact_id: "",
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

  const getNewBalance = (accountId: string | null) => {
    if (!accountId || !formData.amount) return null;
    const account = bankAccounts?.find(acc => acc.id === accountId);
    if (!account) return null;
    return account.current_balance + formData.amount;
  };

  useEffect(() => {
    if (open) {
      if (transaction) {
        setFormData({
          amount: transaction.amount,
          description: transaction.description,
          due_date: transaction.due_date,
          status: transaction.status,
          customer_name: transaction.customer_name || "",
          contact_id: transaction.contact_id || "",
          account_to_id: transaction.bank_account_id || null,
          is_recurring: transaction.is_recurring || false,
          frequency: transaction.recurrence_config?.frequency || "monthly",
          total_installments: transaction.recurrence_config?.total_installments || undefined,
          end_date: transaction.recurrence_config?.end_date || "",
        });
        setCentroCustoId(transaction.centro_custo_id || null);
        setCategoriaReceitaId(transaction.categoria_receita_id || null);
      } else {
        setFormData({
          amount: undefined,
          description: "",
          due_date: new Date().toISOString().split("T")[0],
          status: "pending",
          customer_name: "",
          contact_id: "",
          account_to_id: null,
          is_recurring: false,
          frequency: "monthly",
          total_installments: undefined,
          end_date: "",
        });
        setCentroCustoId(null);
        setCategoriaReceitaId(null);
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

      const validationResult = revenueSchema.safeParse({
        ...formData,
        customer_name: formData.customer_name || null,
      });

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
        type: "revenue" as const,
        amount: formData.amount,
        description: formData.description,
        due_date: formData.due_date,
        status: formData.status,
        company_id: profile.company_id,
        created_by: user.id,
        centro_custo_id: centroCustoId,
        categoria_receita_id: categoriaReceitaId,
        customer_name: formData.customer_name || null,
        contact_id: formData.contact_id || null,
        account_to_id: formData.account_to_id,
        bank_account_id: formData.account_to_id,
        is_recurring: formData.is_recurring,
        recurrence_config: recurrenceConfig,
      };

      if (transaction) {
        const { error } = await supabase
          .from("transactions")
          .update(dataToSave)
          .eq("id", transaction.id);
        if (error) throw error;
        toast.success("Receita atualizada com sucesso!");
      } else {
        const { error } = await supabase.from("transactions").insert([dataToSave]);
        if (error) throw error;
        toast.success("Receita criada com sucesso!");
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bank-accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['pending-transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['categorias'] })
      ]);
      onClose(true);
    } catch (error: any) {
      toast.error(sanitizeError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent" />
            {transaction ? "Editar Receita" : "Nova Receita"}
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
              <CurrencyInput
                value={formData.amount}
                onChange={(value) =>
                  setFormData({ ...formData, amount: value })
                }
                placeholder="R$ 0,00"
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
              placeholder="Ex: Pagamento de cliente"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Data de Vencimento *</Label>
            <Input
              type="date"
              value={formData.due_date}
              onChange={(e) =>
                setFormData({ ...formData, due_date: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Cliente</Label>
            <SelectCliente
              value={formData.contact_id}
              onChange={(value) => setFormData({ ...formData, contact_id: value })}
              placeholder="Selecione o cliente"
            />
          </div>

          {!accountsLoading && (!bankAccounts || bankAccounts.length === 0) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Cadastre pelo menos uma conta bancária antes de registrar transações.
              </AlertDescription>
            </Alert>
          )}

          <Card className="border-accent/30 bg-accent/5">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Conta de Destino (Crédito) *
                </Label>
                <Select 
                  value={formData.account_to_id || ""}
                  onValueChange={(value) => {
                    setFormData({ ...formData, account_to_id: value || null });
                    setCentroCustoId(null);
                    setCategoriaReceitaId(null);
                  }}
                  disabled={accountsLoading || !bankAccounts?.length}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta de destino" />
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
                {formData.account_to_id && formData.amount && (
                  <p className="text-sm mt-2 font-medium text-foreground">
                    Novo saldo: {formatCurrency(getNewBalance(formData.account_to_id) || 0)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Centro de Custo e Categoria de Receita */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Centro de Custo *</Label>
              <SelectCentroCusto
                value={centroCustoId || ""}
                onChange={(value) => {
                  setCentroCustoId(value);
                  setCategoriaReceitaId(null);
                }}
                placeholder="Selecione o centro de custo"
                disabled={!formData.account_to_id}
              />
            </div>

            <div className="space-y-2">
              <Label>Categoria de Receita</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <SelectCategoria
                    centroCustoId={centroCustoId}
                    tipo="receita"
                    value={categoriaReceitaId || ""}
                    onChange={setCategoriaReceitaId}
                    placeholder="Selecione a categoria"
                    disabled={!centroCustoId}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setQuickCategoryOpen(true)}
                  disabled={!centroCustoId}
                  title="Criar nova categoria"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

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
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {transaction ? "Atualizando..." : "Criando..."}
                </>
              ) : (
                transaction ? "Atualizar Receita" : "Criar Receita"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <QuickCategoryDialog
        tipo="receita"
        centroCustoId={centroCustoId}
        open={quickCategoryOpen}
        onClose={() => setQuickCategoryOpen(false)}
        onCategoryCreated={(categoryId) => {
          setCategoriaReceitaId(categoryId);
          queryClient.invalidateQueries({ queryKey: ['categorias'] });
          setQuickCategoryOpen(false);
        }}
      />
    </Dialog>
  );
}
