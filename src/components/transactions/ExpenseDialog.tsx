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
import { Loader2, TrendingDown, AlertCircle } from "lucide-react";
import { z } from "zod";
import { sanitizeError } from "@/lib/errorMapping";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const expenseSchema = z.object({
  amount: z.number().positive("O valor deve ser maior que zero"),
  description: z.string().min(1, "Descrição é obrigatória"),
  due_date: z.string().min(1, "Data de vencimento é obrigatória"),
  status: z.enum(["pending", "paid", "overdue", "cancelled"]),
  supplier_name: z.string().nullable().optional(),
  account_from_id: z.string().uuid("Selecione a conta de origem"),
});

interface Props {
  open: boolean;
  onClose: (refresh?: boolean) => void;
}

export function ExpenseDialog({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: undefined as number | undefined,
    description: "",
    due_date: new Date().toISOString().split("T")[0],
    status: "pending" as const,
    supplier_name: "",
    category_id: null as string | null,
    account_from_id: null as string | null,
  });
  const [categories, setCategories] = useState<any[]>([]);
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
    return account.current_balance - formData.amount;
  };

  useEffect(() => {
    if (open) {
      loadCategories();
      setFormData({
        amount: undefined,
        description: "",
        due_date: new Date().toISOString().split("T")[0],
        status: "pending",
        supplier_name: "",
        category_id: null,
        account_from_id: null,
      });
    }
  }, [open]);

  const loadCategories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) return;

      const { data } = await supabase
        .from("categories")
        .select("id, name, icon, color")
        .eq("company_id", profile.company_id)
        .eq("type", "expense")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("name");

      setCategories(data || []);
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
    }
  };

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

      const validationResult = expenseSchema.safeParse({
        ...formData,
        supplier_name: formData.supplier_name || null,
      });

      if (!validationResult.success) {
        const errorMessages = validationResult.error.errors.map(err => err.message).join(", ");
        throw new Error(errorMessages);
      }

      const dataToSave = {
        type: "expense" as const,
        amount: formData.amount,
        description: formData.description,
        due_date: formData.due_date,
        status: formData.status,
        company_id: profile.company_id,
        created_by: user.id,
        category_id: formData.category_id,
        supplier_name: formData.supplier_name || null,
        account_from_id: formData.account_from_id,
      };

      const { error } = await supabase.from("transactions").insert([dataToSave]);
      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      toast.success("Despesa criada com sucesso!");
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
            <TrendingDown className="h-5 w-5 text-destructive" />
            Nova Despesa
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
              placeholder="Ex: Pagamento de fornecedor"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
              <Label>Categoria</Label>
              <Select
                value={formData.category_id || ""}
                onValueChange={(value) =>
                  setFormData({ ...formData, category_id: value || null })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        {category.icon && <span>{category.icon}</span>}
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nome do Fornecedor</Label>
            <Input
              value={formData.supplier_name}
              onChange={(e) =>
                setFormData({ ...formData, supplier_name: e.target.value })
              }
              placeholder="Ex: Fornecedor XYZ"
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

          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Conta de Origem (Débito) *
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
                    getNewBalance(formData.account_from_id)! < 0 ? "text-destructive" : "text-foreground"
                  )}>
                    Novo saldo: {formatCurrency(getNewBalance(formData.account_from_id) || 0)}
                    {getNewBalance(formData.account_from_id)! < 0 && (
                      <span className="ml-2">(⚠️ Ficará negativo!)</span>
                    )}
                  </p>
                )}
              </div>
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
                  Criando...
                </>
              ) : (
                "Criar Despesa"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
