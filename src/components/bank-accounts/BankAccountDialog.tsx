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
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { sanitizeError } from "@/lib/errorMapping";

// Validation schema
const bankAccountSchema = z.object({
  bank_name: z.string()
    .trim()
    .min(1, "Nome do banco é obrigatório")
    .max(100, "Nome do banco deve ter no máximo 100 caracteres"),
  bank_code: z.string()
    .trim()
    .max(20, "Código do banco deve ter no máximo 20 caracteres")
    .optional(),
  agency_number: z.string()
    .trim()
    .max(20, "Número da agência deve ter no máximo 20 caracteres")
    .optional(),
  account_number: z.string()
    .trim()
    .min(1, "Número da conta é obrigatório")
    .max(30, "Número da conta deve ter no máximo 30 caracteres"),
  account_digit: z.string()
    .trim()
    .max(5, "Dígito da conta deve ter no máximo 5 caracteres")
    .optional(),
  account_type: z.enum(["checking", "savings", "investment", "credit_card", "cdb"], {
    errorMap: () => ({ message: "Tipo de conta inválido" })
  }),
  credit_limit: z.number().min(0, "Limite deve ser positivo").nullable().optional(),
  closing_day: z.number().min(1, "Dia deve estar entre 1 e 31").max(31, "Dia deve estar entre 1 e 31").nullable().optional(),
  due_day: z.number().min(1, "Dia deve estar entre 1 e 31").max(31, "Dia deve estar entre 1 e 31").nullable().optional(),
  holder_name: z.string()
    .trim()
    .max(100, "Nome do titular deve ter no máximo 100 caracteres")
    .optional(),
  holder_document: z.string()
    .trim()
    .max(20, "Documento do titular deve ter no máximo 20 caracteres")
    .optional(),
  pix_key: z.string()
    .trim()
    .max(100, "Chave Pix deve ter no máximo 100 caracteres")
    .optional(),
  pix_key_type: z.enum(["cpf", "cnpj", "email", "phone", "random", ""], {
    errorMap: () => ({ message: "Tipo de chave Pix inválido" })
  }).optional(),
  initial_balance: z.number()
    .min(-999999999999, "Saldo inválido")
    .max(999999999999, "Saldo muito alto")
    .finite("Saldo deve ser um número válido"),
  is_active: z.boolean(),
  is_default: z.boolean(),
});

interface BankAccount {
  id?: string;
  bank_code?: string;
  bank_name: string;
  agency_number?: string;
  account_number: string;
  account_digit?: string;
  account_type: string;
  holder_name?: string;
  holder_document?: string;
  pix_key?: string;
  pix_key_type?: string;
  initial_balance: number;
  current_balance?: number;
  is_active: boolean;
  is_default: boolean;
  credit_limit?: number;
  closing_day?: number;
  due_day?: number;
  available_credit?: number;
}

interface Props {
  open: boolean;
  onClose: (refresh?: boolean) => void;
  account: BankAccount | null;
}

export function BankAccountDialog({ open, onClose, account }: Props) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<BankAccount>>({
    bank_name: "",
    account_number: "",
    account_type: "checking",
    initial_balance: 0,
    is_active: true,
    is_default: false,
    credit_limit: 0,
    closing_day: undefined,
    due_day: undefined,
    pix_key: "",
    pix_key_type: "",
  });

  useEffect(() => {
    if (open) {
      if (account) {
        setFormData(account);
      } else {
        setFormData({
          bank_name: "",
          account_number: "",
          account_type: "checking",
          initial_balance: 0,
          is_active: true,
          is_default: false,
          credit_limit: 0,
          closing_day: undefined,
          due_day: undefined,
          pix_key: "",
          pix_key_type: "",
        });
      }
    }
  }, [account, open]);

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

      // Validate form data with zod schema
      const validationResult = bankAccountSchema.safeParse({
        bank_name: formData.bank_name,
        bank_code: formData.bank_code,
        agency_number: formData.agency_number,
        account_number: formData.account_number,
        account_digit: formData.account_digit,
        account_type: formData.account_type || "checking",
        holder_name: formData.holder_name,
        holder_document: formData.holder_document,
        pix_key: formData.pix_key || undefined,
        pix_key_type: formData.pix_key_type || undefined,
        initial_balance: formData.initial_balance || 0,
        is_active: formData.is_active !== false,
        is_default: formData.is_default || false,
        credit_limit: formData.credit_limit || undefined,
        closing_day: formData.closing_day || undefined,
        due_day: formData.due_day || undefined,
      });

      if (!validationResult.success) {
        const errorMessages = validationResult.error.errors.map(err => err.message).join(", ");
        throw new Error(errorMessages);
      }

      const validatedData = validationResult.data;

      const dataToSave: any = {
        bank_name: validatedData.bank_name,
        bank_code: validatedData.bank_code || "000",
        agency_number: validatedData.agency_number || "0000",
        account_number: validatedData.account_number,
        account_digit: validatedData.account_digit || "0",
        account_type: validatedData.account_type,
        holder_name: validatedData.holder_name || user.user_metadata?.full_name || "Titular",
        holder_document: validatedData.holder_document || "00000000000",
        pix_key: validatedData.pix_key || null,
        pix_key_type: validatedData.pix_key_type || null,
        initial_balance: validatedData.initial_balance,
        is_active: validatedData.is_active,
        is_default: validatedData.is_default,
        company_id: profile.company_id,
        credit_limit: validatedData.credit_limit || 0,
        closing_day: validatedData.closing_day,
        due_day: validatedData.due_day,
      };

      if (account?.id) {
        // Na edição, permite alterar initial_balance mas não current_balance
        // Remove current_balance e available_balance para não sobrescrevê-los
        const { current_balance, available_balance, ...editableData } = dataToSave;
        const { error } = await supabase
          .from("bank_accounts")
          .update(editableData)
          .eq("id", account.id);
        if (error) throw error;
        
        // Recalcular saldo após atualizar initial_balance
        const { error: recalcError } = await supabase.rpc('recalculate_bank_account_balance', {
          account_id: account.id
        });
        if (recalcError) throw recalcError;
        
        toast.success("Conta atualizada com sucesso!");
      } else {
        // Na criação, define current_balance E available_balance iguais ao initial_balance
        dataToSave.current_balance = validatedData.initial_balance;
        dataToSave.available_balance = validatedData.initial_balance;
        const { data: newAccount, error } = await supabase
          .from("bank_accounts")
          .insert([dataToSave])
          .select()
          .single();
        if (error) throw error;
        
        // Recalcular saldo para garantir consistência
        if (newAccount) {
          const { error: recalcError } = await supabase.rpc('recalculate_bank_account_balance', {
            account_id: newAccount.id
          });
          if (recalcError) console.warn('Erro ao recalcular saldo:', recalcError);
        }
        
        toast.success("Conta criada com sucesso!");
      }
      onClose(true);
    } catch (error: any) {
      toast.error(sanitizeError(error));
    } finally {
      setLoading(false);
    }
  };

  // Key para forçar remontagem limpa do Dialog
  const dialogKey = account?.id || 'new';

  return (
    <Dialog key={dialogKey} open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {account ? "Editar Conta Bancária" : "Nova Conta Bancária"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Nome do Banco *</Label>
              <Input
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                placeholder="Ex: Banco do Brasil"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Número da Conta *</Label>
              <Input
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                placeholder="12345-6"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Conta *</Label>
              {/*
                Radix Select dentro de Dialog pode gerar erros intermitentes de DOM (removeChild)
                em alguns navegadores/situações. Para este campo, usamos um <select> nativo
                para máxima estabilidade sem alterar a regra de negócio.
              */}
              <select
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={formData.account_type || "checking"}
                onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                required
              >
                <option value="checking">Conta Corrente</option>
                <option value="savings">Poupança</option>
                <option value="investment">Investimento</option>
                <option value="credit_card">Cartão de Crédito</option>
                <option value="cdb">CDB</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Saldo Inicial (R$) *</Label>
              <CurrencyInput
                value={formData.initial_balance}
                onChange={(value) => setFormData({ ...formData, initial_balance: value })}
                placeholder="R$ 0,00"
              />
              {account?.id && (
                <p className="text-xs text-muted-foreground">
                  Alterar o saldo inicial não afeta o saldo atual calculado pelas transações.
                </p>
              )}
              {account?.id && account.current_balance !== undefined && (
                <p className="text-sm font-semibold text-accent mt-2">
                  Saldo Atual: R$ {account.current_balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Agência</Label>
              <Input
                value={formData.agency_number || ""}
                onChange={(e) => setFormData({ ...formData, agency_number: e.target.value })}
                placeholder="0000"
              />
            </div>

            <div className="space-y-2">
              <Label>Nome do Titular</Label>
              <Input
                value={formData.holder_name || ""}
                onChange={(e) => setFormData({ ...formData, holder_name: e.target.value })}
                placeholder="Nome completo ou Razão Social"
              />
            </div>

            <div className="space-y-2">
              <Label>CPF/CNPJ do Titular</Label>
              <Input
                value={formData.holder_document || ""}
                onChange={(e) => setFormData({ ...formData, holder_document: e.target.value })}
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Chave Pix</Label>
              <Select
                value={formData.pix_key_type || undefined}
                onValueChange={(value) => setFormData({ ...formData, pix_key_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent
                  className="bg-popover"
                  position="popper"
                  sideOffset={4}
                >
                  <SelectItem value="cpf">CPF</SelectItem>
                  <SelectItem value="cnpj">CNPJ</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="phone">Telefone</SelectItem>
                  <SelectItem value="random">Chave Aleatória</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Chave Pix</Label>
              <Input
                value={formData.pix_key || ""}
                onChange={(e) => setFormData({ ...formData, pix_key: e.target.value })}
                placeholder={
                  formData.pix_key_type === 'cpf' ? '000.000.000-00' :
                  formData.pix_key_type === 'cnpj' ? '00.000.000/0000-00' :
                  formData.pix_key_type === 'email' ? 'email@exemplo.com' :
                  formData.pix_key_type === 'phone' ? '+55 11 99999-9999' :
                  formData.pix_key_type === 'random' ? 'Chave aleatória' :
                  'Digite a chave Pix'
                }
              />
            </div>
          </div>

          {/* Campos específicos para Cartão de Crédito */}
          {formData.account_type === 'credit_card' && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
              <h4 className="font-semibold text-sm">Informações do Cartão de Crédito</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Limite do Cartão (R$) *</Label>
                  <CurrencyInput
                    value={formData.credit_limit || 0}
                    onChange={(value) => setFormData({ ...formData, credit_limit: value })}
                    placeholder="R$ 0,00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Dia de Fechamento</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.closing_day || ""}
                    onChange={(e) => setFormData({ ...formData, closing_day: parseInt(e.target.value) || undefined })}
                    placeholder="Ex: 10"
                  />
                  <p className="text-xs text-muted-foreground">Dia do mês (1-31)</p>
                </div>

                <div className="space-y-2">
                  <Label>Dia de Vencimento</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.due_day || ""}
                    onChange={(e) => setFormData({ ...formData, due_day: parseInt(e.target.value) || undefined })}
                    placeholder="Ex: 20"
                  />
                  <p className="text-xs text-muted-foreground">Dia do mês (1-31)</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label>Conta Ativa</Label>
              <p className="text-sm text-muted-foreground">
                Conta aparecerá nas transações
              </p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label>Conta Padrão</Label>
              <p className="text-sm text-muted-foreground">
                Usar como conta padrão nas transações
              </p>
            </div>
            <Switch
              checked={formData.is_default}
              onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onClose()}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {account ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
