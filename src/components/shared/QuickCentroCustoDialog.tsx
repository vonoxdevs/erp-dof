import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { ColorPicker } from "./ColorPicker";

const centroCustoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
  cor: z.string().optional(),
});

interface Props {
  open: boolean;
  onClose: () => void;
  onCentroCustoCreated: (centroCustoId: string) => void;
  contaBancariaId?: string;
}

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
}

export function QuickCentroCustoDialog({ open, onClose, onCentroCustoCreated, contaBancariaId }: Props) {
  const [loading, setLoading] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    cor: "#3b82f6",
  });

  useEffect(() => {
    if (open) {
      fetchBankAccounts();
      if (contaBancariaId) {
        setSelectedAccounts([contaBancariaId]);
      }
    }
  }, [open, contaBancariaId]);

  const fetchBankAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('id, bank_name, account_number')
        .eq('is_active', true)
        .order('bank_name');

      if (error) throw error;
      setBankAccounts(data || []);
    } catch (error) {
      console.error('Erro ao buscar contas bancárias:', error);
    }
  };

  const handleToggleAccount = (accountId: string, checked: boolean) => {
    if (checked) {
      setSelectedAccounts(prev => [...prev, accountId]);
    } else {
      setSelectedAccounts(prev => prev.filter(id => id !== accountId));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      // Validação
      const validation = centroCustoSchema.safeParse(formData);
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }

      // Validar seleção de contas
      if (selectedAccounts.length === 0) {
        toast.error("Selecione pelo menos uma conta bancária");
        return;
      }

      // Buscar company_id do usuário
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) {
        throw new Error("Empresa não encontrada");
      }

      // Criar centro de custo
      const { data: centroCusto, error: insertError } = await supabase
        .from("categorias")
        .insert({
          company_id: profile.company_id,
          nome: formData.nome.trim(),
          descricao: formData.descricao.trim() || null,
          tipo: "centro_custo",
          cor: formData.cor,
          ativo: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Criar vínculos com contas bancárias
      const vinculos = selectedAccounts.map(accountId => ({
        categoria_id: centroCusto.id,
        conta_bancaria_id: accountId,
        habilitado: true
      }));

      const { error: vinculoError } = await supabase
        .from('categoria_conta_bancaria')
        .insert(vinculos);

      if (vinculoError) throw vinculoError;

      toast.success("Centro de custo criado com sucesso!");
      onCentroCustoCreated(centroCusto.id);
      handleClose();
    } catch (error: any) {
      console.error("Erro ao criar centro de custo:", error);
      toast.error(error.message || "Erro ao criar centro de custo");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      nome: "",
      descricao: "",
      cor: "#3b82f6",
    });
    setSelectedAccounts([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen && !loading) {
        handleClose();
      }
    }}>
      <DialogContent 
        className="sm:max-w-[500px]" 
        onInteractOutside={(e) => {
          // Permitir interação fora apenas se não estiver carregando
          if (loading) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (loading) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Novo Centro de Custo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Nome do centro de custo"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Descrição opcional"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <ColorPicker
              value={formData.cor}
              onChange={(cor) => setFormData({ ...formData, cor })}
            />
          </div>

          <div className="space-y-2">
            <Label>
              Contas Bancárias <span className="text-destructive">*</span>
            </Label>
            <div className="border rounded-md p-4 space-y-3 max-h-[200px] overflow-y-auto">
              {bankAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma conta bancária cadastrada
                </p>
              ) : (
                bankAccounts.map(account => (
                  <div key={account.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`account-${account.id}`}
                      checked={selectedAccounts.includes(account.id)}
                      onCheckedChange={(checked) =>
                        handleToggleAccount(account.id, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={`account-${account.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {account.bank_name} - {account.account_number}
                    </Label>
                  </div>
                ))
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Selecione em quais contas este centro de custo estará disponível
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar Centro de Custo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
