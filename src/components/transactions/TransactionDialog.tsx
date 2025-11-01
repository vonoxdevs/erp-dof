import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { sanitizeError } from "@/lib/errorMapping";

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
});

interface Transaction {
  id?: string;
  company_id?: string;
  type: "revenue" | "expense" | "transfer";
  amount: number;
  description: string;
  due_date: string;
  payment_date?: string | null;
  status: "pending" | "paid" | "overdue" | "cancelled";
  category_id?: string | null;
  bank_account_id?: string | null;
  contact_id?: string | null;
}

interface Props {
  open: boolean;
  onClose: (refresh?: boolean) => void;
  transaction: Transaction | null;
}

export function TransactionDialog({ open, onClose, transaction }: Props) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Transaction>>({
    type: "expense",
    amount: undefined,
    description: "",
    due_date: new Date().toISOString().split("T")[0],
    status: "pending",
  });
  const [categories, setCategories] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

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

      // Buscar categorias ativas
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("id, name, type, icon, color")
        .eq("company_id", profile.company_id)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("name");

      // Buscar contas bancárias ativas
      const { data: accountsData } = await supabase
        .from("bank_accounts")
        .select("id, bank_name, account_number")
        .eq("company_id", profile.company_id)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("bank_name");

      // Buscar contatos ativos
      const { data: contactsData } = await supabase
        .from("contacts")
        .select("id, name, type")
        .eq("company_id", profile.company_id)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("name");

      setCategories(categoriesData || []);
      setBankAccounts(accountsData || []);
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
    } else {
      setFormData({
        type: "expense",
        amount: undefined,
        description: "",
        due_date: new Date().toISOString().split("T")[0],
        status: "pending",
      });
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
      });

      console.log('✅ Dados validados:', validationResult);

      if (!validationResult.success) {
        const errorMessages = validationResult.error.errors.map(err => err.message).join(", ");
        throw new Error(errorMessages);
      }

      const validatedData = validationResult.data;

      const dataToSave = {
        type: validatedData.type,
        amount: validatedData.amount,
        description: validatedData.description,
        due_date: validatedData.due_date,
        status: validatedData.status,
        company_id: profile.company_id,
        created_by: user.id,
        payment_date: validatedData.payment_date || null,
        category_id: formData.category_id || null,
        bank_account_id: formData.bank_account_id || null,
        contact_id: formData.contact_id || null,
      };

      console.log('💾 Dados a serem salvos:', dataToSave);

      if (transaction?.id) {
        // Update
        const { error } = await supabase
          .from("transactions")
          .update(dataToSave)
          .eq("id", transaction.id);
        if (error) throw error;
        toast.success("Transação atualizada com sucesso!");
      } else {
        // Create
        const { error } = await supabase.from("transactions").insert([dataToSave]);
        if (error) throw error;
        console.log('🎉 Transação criada com sucesso');
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
                onValueChange={(value: any) =>
                  setFormData({ ...formData, type: value })
                }
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  {categories
                    .filter(cat => cat.type === formData.type || cat.type === 'both')
                    .map((category) => (
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

            <div className="space-y-2">
              <Label>Conta Bancária</Label>
              <Select
                value={formData.bank_account_id || ""}
                onValueChange={(value) =>
                  setFormData({ ...formData, bank_account_id: value || null })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma conta" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.bank_name} - {account.account_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(formData.type === 'expense' || formData.type === 'revenue') && (
            <div className="space-y-2">
              <Label>
                {formData.type === 'expense' ? 'Fornecedor' : 'Cliente'}
              </Label>
              <Select
                value={formData.contact_id || ""}
                onValueChange={(value) =>
                  setFormData({ ...formData, contact_id: value || null })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Selecione um ${formData.type === 'expense' ? 'fornecedor' : 'cliente'}`} />
                </SelectTrigger>
                <SelectContent>
                  {contacts
                    .filter(contact => 
                      formData.type === 'expense' 
                        ? contact.type === 'supplier' || contact.type === 'both'
                        : contact.type === 'customer' || contact.type === 'both'
                    )
                    .map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
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
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {transaction ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
