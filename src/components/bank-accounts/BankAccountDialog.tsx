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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
  current_balance: number;
  is_active: boolean;
  is_default: boolean;
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
    current_balance: 0,
    is_active: true,
    is_default: false,
  });

  useEffect(() => {
    if (account) {
      setFormData(account);
    } else {
      setFormData({
        bank_name: "",
        account_number: "",
        account_type: "checking",
        current_balance: 0,
        is_active: true,
        is_default: false,
      });
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

      if (!formData.bank_name || !formData.account_number) {
        throw new Error("Preencha todos os campos obrigatórios");
      }

      const dataToSave = {
        bank_name: formData.bank_name,
        bank_code: formData.bank_code || "000",
        agency_number: formData.agency_number || "0000",
        account_number: formData.account_number,
        account_digit: formData.account_digit || "0",
        account_type: formData.account_type || "checking",
        holder_name: formData.holder_name || user.user_metadata?.full_name || "Titular",
        holder_document: formData.holder_document || "00000000000",
        current_balance: formData.current_balance || 0,
        is_active: formData.is_active !== false,
        is_default: formData.is_default || false,
        company_id: profile.company_id,
      };

      if (account?.id) {
        const { error } = await supabase
          .from("bank_accounts")
          .update(dataToSave)
          .eq("id", account.id);
        if (error) throw error;
        toast.success("Conta atualizada com sucesso!");
      } else {
        const { error } = await supabase.from("bank_accounts").insert([dataToSave]);
        if (error) throw error;
        toast.success("Conta criada com sucesso!");
      }
      onClose(true);
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
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
              <Select
                value={formData.account_type}
                onValueChange={(value) => setFormData({ ...formData, account_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Conta Corrente</SelectItem>
                  <SelectItem value="savings">Poupança</SelectItem>
                  <SelectItem value="investment">Investimento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Saldo Inicial (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.current_balance}
                onChange={(e) => setFormData({ ...formData, current_balance: parseFloat(e.target.value) || 0 })}
                placeholder="0,00"
              />
            </div>

            <div className="space-y-2">
              <Label>Agência</Label>
              <Input
                value={formData.agency_number || ""}
                onChange={(e) => setFormData({ ...formData, agency_number: e.target.value })}
                placeholder="0000"
              />
            </div>
          </div>

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
