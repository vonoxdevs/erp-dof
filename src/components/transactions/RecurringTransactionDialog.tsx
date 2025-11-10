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
import { Loader2, Repeat, Calendar, Hash } from "lucide-react";
import { z } from "zod";
import { sanitizeError } from "@/lib/errorMapping";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

const recurringSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  type: z.enum(["revenue", "expense"]),
  amount: z.number().positive("Valor deve ser maior que zero"),
  description: z.string().min(1, "Descrição é obrigatória"),
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  start_date: z.string().min(1, "Data de início é obrigatória"),
  end_date: z.string().optional().nullable(),
  total_installments: z.number().optional().nullable(),
  auto_generate: z.boolean(),
  category_id: z.string().uuid().optional().nullable(),
  bank_account_id: z.string().uuid("Selecione uma conta bancária"),
});

interface Props {
  open: boolean;
  onClose: (refresh?: boolean) => void;
}

export function RecurringTransactionDialog({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const { accounts: bankAccounts, isLoading: accountsLoading } = useBankAccounts();
  
  const [formData, setFormData] = useState({
    name: "",
    type: "expense" as const,
    amount: undefined as number | undefined,
    description: "",
    frequency: "monthly" as const,
    start_date: new Date().toISOString().split("T")[0],
    end_date: null as string | null,
    total_installments: null as number | null,
    auto_generate: true,
    category_id: null as string | null,
    bank_account_id: null as string | null,
  });

  const [useInstallments, setUseInstallments] = useState(false);

  useEffect(() => {
    if (open) {
      loadCategories();
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setFormData({
      name: "",
      type: "expense",
      amount: undefined,
      description: "",
      frequency: "monthly",
      start_date: new Date().toISOString().split("T")[0],
      end_date: null,
      total_installments: null,
      auto_generate: true,
      category_id: null,
      bank_account_id: null,
    });
    setUseInstallments(false);
  };

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
        .select("*")
        .eq("company_id", profile.company_id)
        .order("type", { ascending: true })
        .order("name", { ascending: true });

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

      const validationResult = recurringSchema.safeParse(formData);

      if (!validationResult.success) {
        const errorMessages = validationResult.error.errors.map(err => err.message).join(", ");
        throw new Error(errorMessages);
      }

      // Criar contrato recorrente
      const contractData = {
        company_id: profile.company_id,
        name: formData.name,
        type: formData.type,
        description: formData.description,
        amount: formData.amount,
        frequency: formData.frequency,
        start_date: formData.start_date,
        end_date: formData.end_date,
        total_installments: useInstallments ? formData.total_installments : null,
        auto_generate: formData.auto_generate,
        category_id: formData.category_id,
        bank_account_id: formData.bank_account_id,
        is_active: true,
      };

      const { error } = await supabase
        .from("contracts")
        .insert([contractData]);

      if (error) throw error;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bank-accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['pending-transactions'] })
      ]);

      toast.success("Transação recorrente criada com sucesso!");
      onClose(true);
    } catch (error: any) {
      toast.error(sanitizeError(error));
    } finally {
      setLoading(false);
    }
  };

  const getFrequencyLabel = (freq: string) => {
    const labels = {
      daily: "Diário",
      weekly: "Semanal",
      monthly: "Mensal",
      yearly: "Anual",
    };
    return labels[freq as keyof typeof labels] || freq;
  };

  const filteredCategories = categories.filter(cat => cat.type === formData.type);

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5 text-primary" />
            Nova Transação Recorrente
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da Recorrência *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Aluguel mensal, Salário funcionário"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, type: value, category_id: null })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="revenue">Receita</SelectItem>
                      <SelectItem value="expense">Despesa</SelectItem>
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
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva esta transação recorrente"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                      {filteredCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            {cat.icon && <span>{cat.icon}</span>}
                            <span>{cat.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Conta Bancária *</Label>
                  <Select
                    value={formData.bank_account_id || ""}
                    onValueChange={(value) =>
                      setFormData({ ...formData, bank_account_id: value || null })
                    }
                    disabled={accountsLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts?.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.bank_name} - {account.account_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Configuração de Recorrência
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Frequência *</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, frequency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diário</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de Início *</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Data de Término</Label>
                  <Input
                    type="date"
                    value={formData.end_date || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value || null })
                    }
                    disabled={useInstallments}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Definir número de parcelas
                  </Label>
                  <Switch
                    checked={useInstallments}
                    onCheckedChange={(checked) => {
                      setUseInstallments(checked);
                      if (!checked) {
                        setFormData({ ...formData, total_installments: null });
                      } else {
                        setFormData({ ...formData, end_date: null });
                      }
                    }}
                  />
                </div>

                {useInstallments && (
                  <div className="space-y-2">
                    <Label>Número de Parcelas *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.total_installments || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          total_installments: e.target.value ? parseInt(e.target.value) : null
                        })
                      }
                      placeholder="Ex: 12"
                      required={useInstallments}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <Label>Gerar transações automaticamente</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    As transações serão criadas automaticamente nas datas previstas
                  </p>
                </div>
                <Switch
                  checked={formData.auto_generate}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, auto_generate: checked })
                  }
                />
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
                "Criar Recorrência"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
