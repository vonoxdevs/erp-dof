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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Building2, ArrowUpFromLine, ArrowDownToLine, ArrowRightLeft, AlertCircle } from "lucide-react";
import { z } from "zod";
import { sanitizeError } from "@/lib/errorMapping";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { SelectCentroCusto } from '@/components/shared/SelectCentroCusto';
import { SelectCategoria } from '@/components/shared/SelectCategoria';

// Validation schema
const transactionSchema = z.object({
  type: z.enum(["revenue", "expense", "transfer"], {
    errorMap: () => ({ message: "Tipo de transação inválido" })
  }),
  amount: z.number()
    .positive("O valor deve ser maior que zero")
    .max(999999999, "Valor muito alto")
    .finite("O valor deve ser um número válido"),
  description: z.string()
    .trim()
    .min(1, "Descrição é obrigatória")
    .max(500, "Descrição deve ter no máximo 500 caracteres"),
  due_date: z.string()
    .min(1, "Data de vencimento é obrigatória")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data de vencimento inválida"),
  payment_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data de pagamento inválida")
    .nullable()
    .optional(),
  status: z.enum(["pending", "paid", "overdue", "cancelled"], {
    errorMap: () => ({ message: "Status inválido" })
  }),
  customer_name: z.string()
    .trim()
    .max(200, "Nome do cliente deve ter no máximo 200 caracteres")
    .nullable()
    .optional(),
  supplier_name: z.string()
    .trim()
    .max(200, "Nome do fornecedor deve ter no máximo 200 caracteres")
    .nullable()
    .optional(),
  account_from_id: z.string().uuid().optional().nullable(),
  account_to_id: z.string().uuid().optional().nullable(),
}).refine(
  (data) => {
    if (data.type === 'expense') return !!data.account_from_id;
    if (data.type === 'revenue') return !!data.account_to_id;
    if (data.type === 'transfer') return !!data.account_from_id && !!data.account_to_id;
    return true;
  },
  { message: "Selecione a(s) conta(s) necessária(s)", path: ["account_from_id"] }
).refine(
  (data) => {
    if (data.type === 'transfer' && data.account_from_id === data.account_to_id) {
      return false;
    }
    return true;
  },
  { message: "Contas devem ser diferentes em transferências", path: ["account_to_id"] }
);

interface Transaction {
  id?: string;
  company_id?: string;
  type: "revenue" | "expense" | "transfer";
  amount: number;
  description: string;
  due_date: string;
  payment_date?: string | null;
  status: "pending" | "paid" | "overdue" | "cancelled";
  centro_custo_id?: string | null;
  categoria_receita_id?: string | null;
  categoria_despesa_id?: string | null;
  bank_account_id?: string | null;
  account_from_id?: string | null;
  account_to_id?: string | null;
  contact_id?: string | null;
  customer_name?: string | null;
  supplier_name?: string | null;
}

interface Props {
  open: boolean;
  onClose: (refresh?: boolean) => void;
  transaction: Transaction | null;
}

export function TransactionDialog({ open, onClose, transaction }: Props) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [centroCustoId, setCentroCustoId] = useState<string | null>(null);
  const [categoriaReceitaId, setCategoriaReceitaId] = useState<string | null>(null);
  const [categoriaDespesaId, setCategoriaDespesaId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Transaction>>({
    type: "expense",
    amount: undefined,
    description: "",
    due_date: new Date().toISOString().split("T")[0],
    status: "pending",
  });
  const [contacts, setContacts] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  
  // Usar hook de contas bancárias
  const { accounts: bankAccounts, isLoading: accountsLoading } = useBankAccounts();
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  
  const getNewBalance = (accountId: string | null | undefined, isDebit: boolean) => {
    if (!accountId || !formData.amount) return null;
    const account = bankAccounts?.find(acc => acc.id === accountId);
    if (!account) return null;
    return isDebit 
      ? account.current_balance - formData.amount 
      : account.current_balance + formData.amount;
  };

  const loadFormData = async () => {
    setLoadingData(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) return;

      // Buscar contatos ativos
      const { data: contactsData } = await supabase
        .from("contacts")
        .select("id, name, type")
        .eq("company_id", profile.company_id)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("name");

      setContacts(contactsData || []);
    } catch (error) {
      console.error("Erro ao carregar dados do formulário:", error);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadFormData();
    }
    
    if (transaction) {
      setFormData(transaction);
      setCentroCustoId(transaction.centro_custo_id || null);
      setCategoriaReceitaId(transaction.categoria_receita_id || null);
      setCategoriaDespesaId(transaction.categoria_despesa_id || null);
    } else {
      setFormData({
        type: "expense",
        amount: undefined,
        description: "",
        due_date: new Date().toISOString().split("T")[0],
        status: "pending",
      });
      setCentroCustoId(null);
      setCategoriaReceitaId(null);
      setCategoriaDespesaId(null);
    }
  }, [transaction, open]);

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

      if (!profile) {
        throw new Error("Perfil não encontrado. Por favor, faça logout e login novamente.");
      }

      // Validate form data with zod schema
      const validationResult = transactionSchema.safeParse({
        type: formData.type,
        amount: formData.amount,
        description: formData.description,
        due_date: formData.due_date,
        payment_date: formData.payment_date || null,
        status: formData.status,
        customer_name: formData.customer_name || null,
        supplier_name: formData.supplier_name || null,
        account_from_id: formData.account_from_id || null,
        account_to_id: formData.account_to_id || null,
      });

      console.log('✅ Dados validados:', validationResult);

      if (!validationResult.success) {
        const errorMessages = validationResult.error.errors.map(err => err.message).join(", ");
        throw new Error(errorMessages);
      }

      const validatedData = validationResult.data;

      // Preparar dados base
      const baseData = {
        type: validatedData.type,
        amount: validatedData.amount,
        description: validatedData.description,
        due_date: validatedData.due_date,
        status: validatedData.status,
        company_id: profile.company_id,
        payment_date: validatedData.payment_date || null,
        centro_custo_id: centroCustoId,
        categoria_receita_id: validatedData.type === 'revenue' ? categoriaReceitaId : null,
        categoria_despesa_id: validatedData.type === 'expense' ? categoriaDespesaId : null,
        bank_account_id: formData.bank_account_id || null,
        contact_id: formData.contact_id || null,
        customer_name: validatedData.customer_name || null,
        supplier_name: validatedData.supplier_name || null,
        account_from_id: validatedData.account_from_id || null,
        account_to_id: validatedData.account_to_id || null,
      };

      // Adicionar created_by apenas na criação
      const dataToSave = transaction?.id 
        ? baseData 
        : { ...baseData, created_by: user.id };

      console.log('💾 Dados a serem salvos:', dataToSave);

      if (transaction?.id) {
        // Atualizar transação existente
        const { data, error } = await supabase
          .from("transactions")
          .update(dataToSave)
          .eq("id", transaction.id)
          .eq("company_id", profile.company_id) // Garantir company isolation
          .select();
        
        if (error) {
          console.error("Erro ao atualizar transação:", error);
          throw new Error(`Erro ao atualizar: ${error.message || error.details || "Erro desconhecido"}`);
        }
        
        if (!data || data.length === 0) {
          throw new Error("Transação não encontrada ou sem permissão para editar");
        }
        
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['bank-accounts'] }),
          queryClient.invalidateQueries({ queryKey: ['pending-transactions'] })
        ]);
        
        console.log('✅ Transação atualizada:', data);
        toast.success("Transação atualizada com sucesso!");
      } else {
        // Criar nova transação
        const { data, error } = await supabase
          .from("transactions")
          .insert([dataToSave])
          .select();
        
        if (error) {
          console.error("Erro ao criar transação:", error);
          
          // Mensagens de erro específicas
          if (error.message?.includes("violates row-level security policy")) {
            throw new Error("Você não tem permissão para criar transações");
          } else if (error.message?.includes("company_id")) {
            throw new Error("Empresa não encontrada. Faça logout e login novamente.");
          } else {
            throw new Error(`Erro ao criar: ${error.message || error.details || "Erro desconhecido"}`);
          }
        }
        
        if (!data || data.length === 0) {
          throw new Error("Erro ao criar transação: resposta vazia do servidor");
        }
        
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['bank-accounts'] }),
          queryClient.invalidateQueries({ queryKey: ['pending-transactions'] })
        ]);
        
        console.log('🎉 Transação criada com sucesso:', data);
        toast.success("Transação criada com sucesso!");
      }
      onClose(true);
    } catch (error: any) {
      toast.error(sanitizeError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {transaction ? "Editar Transação" : "Nova Transação"}
          </DialogTitle>
        </DialogHeader>

        {loadingData && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">
              Carregando opções...
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: any) => {
                  setFormData({ ...formData, type: value });
                  setCentroCustoId(null);
                  setCategoriaReceitaId(null);
                  setCategoriaDespesaId(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">Receita</SelectItem>
                  <SelectItem value="expense">Despesa</SelectItem>
                  <SelectItem value="transfer">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
          </div>

          <div className="space-y-2">
            <Label>Descrição *</Label>
            <Input
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Ex: Pagamento de aluguel"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
          </div>


          {/* Alerta se não houver contas */}
          {!accountsLoading && (!bankAccounts || bankAccounts.length === 0) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Cadastre pelo menos uma conta bancária antes de registrar transações.
              </AlertDescription>
            </Alert>
          )}

          {/* Conta Origem - Despesas e Transferências */}
          {(formData.type === 'expense' || formData.type === 'transfer') && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
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
          )}

          {/* Conta Destino - Receitas e Transferências */}
          {(formData.type === 'revenue' || formData.type === 'transfer') && (
            <Card className="border-accent/30 bg-accent/5">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Conta de Destino (Crédito) *
                  </Label>
                  <Select 
                    value={formData.account_to_id || ""}
                    onValueChange={(value) => {
                      setFormData({ ...formData, account_to_id: value || null });
                      if (formData.type === 'revenue') {
                        setCentroCustoId(null);
                        setCategoriaReceitaId(null);
                      }
                    }}
                    disabled={accountsLoading || !bankAccounts?.length}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a conta de destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts?.filter(acc => 
                        formData.type !== 'transfer' || acc.id !== formData.account_from_id
                      ).map((account) => (
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
          )}

          {/* Centro de Custo e Categoria - RECEITA */}
          {formData.type === 'revenue' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Centro de Custo *</Label>
                <SelectCentroCusto
                  contaBancariaId={formData.account_to_id}
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
                <SelectCategoria
                  centroCustoId={centroCustoId}
                  tipo="receita"
                  value={categoriaReceitaId || ""}
                  onChange={setCategoriaReceitaId}
                  placeholder="Selecione a categoria"
                  disabled={!centroCustoId}
                />
              </div>
            </div>
          )}

          {/* Centro de Custo e Categoria - DESPESA */}
          {formData.type === 'expense' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Centro de Custo *</Label>
                <SelectCentroCusto
                  contaBancariaId={formData.account_from_id}
                  value={centroCustoId || ""}
                  onChange={(value) => {
                    setCentroCustoId(value);
                    setCategoriaDespesaId(null);
                  }}
                  placeholder="Selecione o centro de custo"
                  disabled={!formData.account_from_id}
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria de Despesa</Label>
                <SelectCategoria
                  centroCustoId={centroCustoId}
                  tipo="despesa"
                  value={categoriaDespesaId || ""}
                  onChange={setCategoriaDespesaId}
                  placeholder="Selecione a categoria"
                  disabled={!centroCustoId}
                />
              </div>
            </div>
          )}

          {formData.type === 'expense' && (
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Input
                value={formData.supplier_name || ""}
                onChange={(e) =>
                  setFormData({ ...formData, supplier_name: e.target.value })
                }
                placeholder="Digite o nome do fornecedor"
                maxLength={200}
              />
            </div>
          )}

          {formData.type === 'revenue' && (
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Input
                value={formData.customer_name || ""}
                onChange={(e) =>
                  setFormData({ ...formData, customer_name: e.target.value })
                }
                placeholder="Digite o nome do cliente"
                maxLength={200}
              />
            </div>
          )}

          {formData.status === "paid" && (
            <div className="space-y-2">
              <Label>Data de Pagamento</Label>
              <Input
                type="date"
                value={formData.payment_date || ""}
                onChange={(e) =>
                  setFormData({ ...formData, payment_date: e.target.value })
                }
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onClose()}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !bankAccounts?.length}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {transaction ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
