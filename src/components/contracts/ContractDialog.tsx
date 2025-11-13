import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, X, FileText } from "lucide-react";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { SelectCentroCusto } from '@/components/shared/SelectCentroCusto';
import { SelectCategoria } from '@/components/shared/SelectCategoria';
import { SelectCliente } from '@/components/shared/SelectCliente';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { useQueryClient } from "@tanstack/react-query";

interface Contract {
  id: string;
  contract_name: string | null;
  contact_id: string | null;
  description: string | null;
  service_description: string | null;
  type: string;
  amount: number;
  frequency: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  bank_account_id: string | null;
  centro_custo_id: string | null;
  categoria_receita_id: string | null;
  attachments: any[] | null;
}

interface Props {
  open: boolean;
  onClose: (refresh?: boolean) => void;
  contract: Contract | null;
}

export function ContractDialog({ open, onClose, contract }: Props) {
  const [loading, setLoading] = useState(false);
  const { accounts, isLoading: loadingAccounts } = useBankAccounts();
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [linkedAccounts, setLinkedAccounts] = useState<any[]>([]);
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    contract_name: "",
    contact_id: "",
    description: "",
    service_description: "",
    amount: 0,
    bank_account_id: "",
    centro_custo_id: "",
    categoria_receita_id: "",
    frequency: "monthly",
    start_date: "",
    end_date: "",
    is_active: true,
  });

  // Buscar contas vinculadas ao centro de custo
  useEffect(() => {
    async function fetchLinkedAccounts() {
      if (!formData.centro_custo_id) {
        setLinkedAccounts([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('categoria_conta_bancaria')
          .select(`
            conta_bancaria_id,
            bank_accounts:conta_bancaria_id (
              id,
              bank_name,
              account_number
            )
          `)
          .eq('categoria_id', formData.centro_custo_id)
          .eq('habilitado', true);

        if (error) throw error;

        const accounts = data
          ?.map(item => item.bank_accounts)
          .filter(Boolean) || [];

        setLinkedAccounts(accounts);

        // Se havia uma conta selecionada mas não está mais na lista, limpar
        if (formData.bank_account_id && !accounts.find(acc => acc.id === formData.bank_account_id)) {
          setFormData(prev => ({ ...prev, bank_account_id: "" }));
        }
      } catch (error) {
        console.error('Erro ao buscar contas vinculadas:', error);
        setLinkedAccounts([]);
      }
    }

    fetchLinkedAccounts();
  }, [formData.centro_custo_id]);

  useEffect(() => {
    if (contract) {
      setFormData({
        contract_name: contract.contract_name || "",
        contact_id: contract.contact_id || "",
        description: contract.description || "",
        service_description: contract.service_description || "",
        amount: contract.amount,
        bank_account_id: contract.bank_account_id || "",
        centro_custo_id: contract.centro_custo_id || "",
        categoria_receita_id: contract.categoria_receita_id || "",
        frequency: contract.frequency,
        start_date: contract.start_date,
        end_date: contract.end_date || "",
        is_active: contract.is_active,
      });
      setAttachments(contract.attachments || []);
    } else {
      setFormData({
        contract_name: "",
        contact_id: "",
        description: "",
        service_description: "",
        amount: 0,
        bank_account_id: "",
        centro_custo_id: "",
        categoria_receita_id: "",
        frequency: "monthly",
        start_date: new Date().toISOString().split("T")[0],
        end_date: "",
        is_active: true,
      });
      setAttachments([]);
    }
  }, [contract, open]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("company_id")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      const uploadedFiles = [];
      
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${profile.company_id}/${fileName}`;

        const { error: uploadError, data } = await supabase.storage
          .from('contract-attachments')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        uploadedFiles.push({
          name: file.name,
          path: filePath,
          size: file.size,
          type: file.type,
          uploaded_at: new Date().toISOString(),
        });
      }

      setAttachments([...attachments, ...uploadedFiles]);
      toast.success(`${uploadedFiles.length} arquivo(s) anexado(s)`);
    } catch (error: any) {
      toast.error(`Erro ao fazer upload: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAttachment = async (index: number) => {
    const attachment = attachments[index];
    try {
      await supabase.storage
        .from('contract-attachments')
        .remove([attachment.path]);
      
      setAttachments(attachments.filter((_, i) => i !== index));
      toast.success("Arquivo removido");
    } catch (error: any) {
      toast.error(`Erro ao remover arquivo: ${error.message}`);
    }
  };

  const handleDownloadAttachment = async (attachment: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('contract-attachments')
        .download(attachment.path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(`Erro ao baixar arquivo: ${error.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (!formData.contract_name?.trim()) {
      toast.error("Nome do contrato é obrigatório");
      return;
    }
    
    if (!formData.contact_id) {
      toast.error("Cliente é obrigatório");
      return;
    }
    
    if (!formData.centro_custo_id) {
      toast.error("Centro de custo é obrigatório");
      return;
    }
    
    if (!formData.bank_account_id) {
      toast.error("Conta bancária é obrigatória");
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

      if (profileError || !profile?.company_id) {
        toast.error("Erro ao buscar dados do usuário");
        return;
      }

      const contractData = {
        company_id: profile.company_id,
        name: formData.contract_name.trim(), // Manter compatibilidade com schema antigo
        contract_name: formData.contract_name.trim(),
        contact_id: formData.contact_id,
        description: formData.description?.trim() || null,
        service_description: formData.service_description?.trim() || null,
        type: "income",
        amount: formData.amount,
        frequency: formData.frequency,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        is_active: formData.is_active,
        auto_generate: true,
        generation_day: 1,
        next_generation_date: formData.start_date,
        bank_account_id: formData.bank_account_id || null,
        centro_custo_id: formData.centro_custo_id,
        categoria_receita_id: formData.categoria_receita_id || null,
        attachments: attachments,
      };

      if (contract) {
        // Atualizar contrato existente
        const { data, error } = await supabase
          .from("contracts")
          .update(contractData)
          .eq("id", contract.id)
          .eq("company_id", profile.company_id)
          .select();
        
        if (error) {
          toast.error(`Erro ao atualizar contrato: ${error.message}`);
          return;
        }
        
        if (!data || data.length === 0) {
          toast.error("Contrato não encontrado ou sem permissão");
          return;
        }
        
        // Atualizar transações pendentes do contrato
        const { error: updateTxError } = await supabase
          .from('transactions')
          .update({
            amount: contractData.amount,
            centro_custo_id: contractData.centro_custo_id,
            categoria_receita_id: contractData.categoria_receita_id,
            bank_account_id: contractData.bank_account_id,
            account_to_id: contractData.bank_account_id,
            contact_id: contractData.contact_id,
            description: `${contractData.contract_name} - Parcela`,
          })
          .eq('contract_id', contract.id)
          .eq('status', 'pending');

        if (updateTxError) {
          console.error("Erro ao atualizar transações:", updateTxError);
        }
        
        toast.success("Contrato atualizado!");
      } else {
        // Criar novo contrato
        const { data, error } = await supabase
          .from("contracts")
          .insert([contractData])
          .select();
        
        if (error) {
          toast.error(`Erro ao criar contrato: ${error.message}`);
          return;
        }
        
        if (!data || data.length === 0) {
          toast.error("Erro ao criar contrato");
          return;
        }
        
        toast.success("Contrato criado!");
      }

      // Gera automaticamente as transações recorrentes
      toast.info("Gerando transações recorrentes...");
      const { error: generateError } = await supabase.functions.invoke(
        "generate-contract-transactions"
      );

      if (generateError) {
        console.error("Erro ao gerar transações:", generateError);
        toast.warning("Contrato salvo, mas houve erro ao gerar transações");
      } else {
        toast.success("Transações geradas!");
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bank-accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['pending-transactions'] })
      ]);

      onClose(true);
    } catch (error: any) {
      console.error("Erro:", error);
      toast.error(`Erro: ${error.message}`);
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
          {/* 1. Nome do Contrato */}
          <div className="space-y-2">
            <Label htmlFor="contract_name">Nome do Contrato *</Label>
            <Input
              id="contract_name"
              value={formData.contract_name}
              onChange={(e) => setFormData({ ...formData, contract_name: e.target.value })}
              placeholder="Ex: Manutenção de Software"
              required
            />
          </div>

          {/* 2. Cliente */}
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <SelectCliente
              value={formData.contact_id}
              onChange={(value) => setFormData({ ...formData, contact_id: value })}
              placeholder="Selecione o cliente"
            />
          </div>

          {/* 3. Observações */}
          <div className="space-y-2">
            <Label htmlFor="description">Observações</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              placeholder="Observações gerais sobre o contrato"
            />
          </div>

          {/* 4. Descrição do Serviço */}
          <div className="space-y-2">
            <Label htmlFor="service_description">Descrição do Serviço</Label>
            <Textarea
              id="service_description"
              value={formData.service_description}
              onChange={(e) => setFormData({ ...formData, service_description: e.target.value })}
              rows={4}
              placeholder="Descreva detalhadamente o serviço contratado..."
            />
          </div>

          {/* 5. Valor Mensal Líquido */}
          <div className="space-y-2">
            <Label htmlFor="amount">Valor Mensal Líquido *</Label>
            <CurrencyInput
              value={formData.amount}
              onChange={(value) => setFormData({ ...formData, amount: value })}
              placeholder="R$ 0,00"
              required
            />
          </div>

          {/* 6. Centro de Custo */}
          <div className="space-y-2">
            <Label>Centro de Custo *</Label>
            <SelectCentroCusto
              value={formData.centro_custo_id}
              onChange={(value) => {
                setFormData({ 
                  ...formData, 
                  centro_custo_id: value
                });
              }}
              placeholder="Selecione o centro de custo"
            />
          </div>

          {/* 6.5. Conta Bancária (vinculada ao centro de custo) */}
          <div className="space-y-2">
            <Label>Conta Bancária *</Label>
            <Select
              value={formData.bank_account_id}
              onValueChange={(value) => setFormData({ ...formData, bank_account_id: value })}
              disabled={!formData.centro_custo_id}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !formData.centro_custo_id 
                    ? "Selecione um centro de custo primeiro" 
                    : "Selecione a conta bancária"
                } />
              </SelectTrigger>
              <SelectContent>
                {linkedAccounts.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    {formData.centro_custo_id 
                      ? "Nenhuma conta vinculada a este centro de custo" 
                      : "Selecione um centro de custo"}
                  </div>
                ) : (
                  linkedAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.bank_name} - {account.account_number}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {formData.centro_custo_id && linkedAccounts.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Este centro de custo não possui contas bancárias vinculadas. Configure em Categorias Financeiras.
              </p>
            )}
          </div>

          {/* 7. Categoria de Receita */}
          <div className="space-y-2">
            <Label>Categoria de Receita</Label>
            <SelectCategoria
              tipo="receita"
              contaBancariaId={formData.bank_account_id}
              centroCustoId={formData.centro_custo_id}
              value={formData.categoria_receita_id}
              onChange={(value) => setFormData({ ...formData, categoria_receita_id: value })}
              placeholder="Selecione a categoria"
            />
          </div>

          {/* 8. Frequência */}
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
                <SelectItem value="daily">Diário</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="yearly">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 8. Datas */}
          <div className="grid md:grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <Label htmlFor="end_date">Data de Término</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          {/* 9. Anexar Contrato */}
          <div className="space-y-2">
            <Label>Anexar Contrato</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  className="flex-1"
                />
                {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              
              {attachments.length > 0 && (
                <div className="space-y-2 p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium">Arquivos anexados:</p>
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-background rounded">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">{file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownloadAttachment(file)}
                        >
                          Download
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveAttachment(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onClose()}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {contract ? "Atualizar Contrato" : "Criar Contrato"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
