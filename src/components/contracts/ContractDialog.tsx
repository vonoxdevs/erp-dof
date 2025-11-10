import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Contract {
  id: string;
  name: string;
  description: string | null;
  type: string;
  amount: number;
  frequency: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
}

interface Props {
  open: boolean;
  onClose: (refresh?: boolean) => void;
  contract: Contract | null;
}

export function ContractDialog({ open, onClose, contract }: Props) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "revenue",
    amount: "",
    frequency: "monthly",
    start_date: "",
    end_date: "",
    is_active: true,
  });

  useEffect(() => {
    if (contract) {
      setFormData({
        name: contract.name,
        description: contract.description || "",
        type: contract.type,
        amount: contract.amount.toString(),
        frequency: contract.frequency,
        start_date: contract.start_date,
        end_date: contract.end_date || "",
        is_active: contract.is_active,
      });
    } else {
      setFormData({
        name: "",
        description: "",
        type: "revenue",
        amount: "",
        frequency: "monthly",
        start_date: new Date().toISOString().split("T")[0],
        end_date: "",
        is_active: true,
      });
    }
  }, [contract, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name?.trim()) {
      toast.error("Nome do contrato é obrigatório");
      return;
    }
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error("Valor deve ser maior que zero");
      return;
    }
    
    if (!formData.start_date) {
      toast.error("Data de início é obrigatória");
      return;
    }
    
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("company_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Erro ao buscar perfil:", profileError);
        toast.error("Erro ao buscar dados do usuário");
        return;
      }

      if (!profile?.company_id) {
        toast.error("Empresa não encontrada no seu perfil");
        return;
      }

      // Validar campos obrigatórios
      if (!formData.name.trim()) {
        toast.error("Nome do contrato é obrigatório");
        setLoading(false);
        return;
      }

      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        toast.error("Valor deve ser maior que zero");
        setLoading(false);
        return;
      }

      const contractData = {
        company_id: profile.company_id,
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        type: formData.type,
        amount: amount,
        frequency: formData.frequency,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        is_active: formData.is_active,
        auto_generate: true,
        generation_day: 1,
        next_generation_date: formData.start_date, // Adicionar data de próxima geração
      };

      console.log("Dados do contrato a serem salvos:", contractData);

      if (contract) {
        // Atualizar contrato existente
        const { data, error } = await supabase
          .from("contracts")
          .update(contractData)
          .eq("id", contract.id)
          .eq("company_id", profile.company_id) // Garantir company isolation
          .select();
        
        if (error) {
          console.error("Erro detalhado ao atualizar contrato:", error);
          toast.error(`Erro ao atualizar contrato: ${error.message || error.details || "Erro desconhecido"}`);
          return;
        }
        
        if (!data || data.length === 0) {
          toast.error("Contrato não encontrado ou sem permissão para editar");
          return;
        }
        
        console.log("Contrato atualizado com sucesso:", data);
        toast.success("Contrato atualizado com sucesso!");
      } else {
        // Criar novo contrato
        const { data, error } = await supabase
          .from("contracts")
          .insert([contractData])
          .select();
        
        if (error) {
          console.error("Erro detalhado ao criar contrato:", error);
          
          // Mensagens de erro específicas
          if (error.message?.includes("violates row-level security policy")) {
            toast.error("Você não tem permissão para criar contratos");
          } else if (error.message?.includes("company_id")) {
            toast.error("Empresa não encontrada. Faça logout e login novamente.");
          } else {
            toast.error(`Erro ao criar contrato: ${error.message || error.details || "Erro desconhecido"}`);
          }
          return;
        }
        
        if (!data || data.length === 0) {
          toast.error("Erro ao criar contrato: resposta vazia do servidor");
          return;
        }
        
        console.log("Contrato criado com sucesso:", data);
        toast.success("Contrato criado com sucesso!");
      }

      onClose(true);
    } catch (error: any) {
      console.error("Erro inesperado:", error);
      toast.error(`Erro inesperado: ${error.message || "Erro desconhecido"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{contract ? "Editar Contrato" : "Novo Contrato"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Contrato *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
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
              <Label htmlFor="amount">Valor Mensal *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequência *</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) => setFormData({ ...formData, frequency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="semiannual">Semestral</SelectItem>
                  <SelectItem value="annual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Data de Início *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="end_date">Data de Término (opcional)</Label>
            <Input
              id="end_date"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onClose()}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {contract ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
