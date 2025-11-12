import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, X, FileText } from "lucide-react";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { SelectCentroCusto } from '@/components/shared/SelectCentroCusto';
import { SelectCategoria } from '@/components/shared/SelectCategoria';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { useQueryClient } from "@tanstack/react-query";

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
  bank_account_id: string | null;
  service_description: string | null;
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
  const [centroCustoId, setCentroCustoId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "income",
    amount: 0,
    frequency: "monthly",
    start_date: "",
    end_date: "",
    is_active: true,
    bank_account_id: "",
    service_description: "",
  });

  useEffect(() => {
    if (contract) {
      setFormData({
        name: contract.name,
        description: contract.description || "",
        type: contract.type,
        amount: contract.amount,
        frequency: contract.frequency,
        start_date: contract.start_date,
        end_date: contract.end_date || "",
        is_active: contract.is_active,
        bank_account_id: contract.bank_account_id || "",
        service_description: contract.service_description || "",
      });
      setAttachments(contract.attachments || []);
      setCentroCustoId("");
      setCategoriaId("");
    } else {
      setFormData({
        name: "",
        description: "",
        type: "income",
        amount: 0,
        frequency: "monthly",
        start_date: new Date().toISOString().split("T")[0],
        end_date: "",
        is_active: true,
        bank_account_id: "",
        service_description: "",
      });
      setAttachments([]);
      setCentroCustoId("");
      setCategoriaId("");
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
    
    if (!formData.name?.trim()) {
      toast.error("Nome do contrato é obrigatório");
      return;
    }
    
    if (!formData.amount || formData.amount <= 0) {
      toast.error("Valor deve ser maior que zero");
      return;
    }
    
    if (!formData.start_date) {
      toast.error("Data de início é obrigatória");
      return;
    }
    
    if (!formData.bank_account_id) {
      toast.error("Selecione uma conta bancária para receber as receitas");
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

      const contractData = {
        company_id: profile.company_id,
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        type: formData.type,
        amount: formData.amount,
        frequency: formData.frequency,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        is_active: formData.is_active,
        auto_generate: true,
        generation_day: 1,
        next_generation_date: formData.start_date,
        bank_account_id: formData.bank_account_id,
        centro_custo_id: centroCustoId || null,
        categoria_despesa_id: formData.type === 'expense' ? categoriaId || null : null,
        service_description: formData.service_description?.trim() || null,
        attachments: attachments,
      };

      console.log("Dados do contrato a serem salvos:", contractData);

      if (contract) {
        // Atualizar contrato existente
        const { data, error } = await supabase
          .from("contracts")
          .update(contractData)
          .eq("id", contract.id)
          .eq("company_id", profile.company_id)
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
        
        // Atualizar transações pendentes do contrato
        const { error: updateTxError } = await supabase
          .from('transactions')
          .update({
            amount: contractData.amount,
            centro_custo_id: contractData.centro_custo_id,
            categoria_despesa_id: contractData.categoria_despesa_id,
            bank_account_id: contractData.bank_account_id,
            account_to_id: contractData.type === 'income' ? contractData.bank_account_id : null,
            description: `${contractData.name} - Parcela`,
          })
          .eq('contract_id', contract.id)
          .eq('status', 'pending');

        if (updateTxError) {
          console.error("Erro ao atualizar transações:", updateTxError);
          toast.warning("Contrato atualizado, mas houve erro ao atualizar transações pendentes");
        }
        
        console.log("Contrato atualizado com sucesso:", data);
        toast.success("Contrato e transações pendentes atualizados!");
      } else {
        // Criar novo contrato
        const { data, error } = await supabase
          .from("contracts")
          .insert([contractData])
          .select();
        
        if (error) {
          console.error("Erro detalhado ao criar contrato:", error);
          
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

      // Gera automaticamente as transações recorrentes
      toast.info("Gerando transações recorrentes...");
      const { error: generateError } = await supabase.functions.invoke(
        "generate-recurring-transactions"
      );

      if (generateError) {
        console.error("Erro ao gerar transações:", generateError);
        toast.warning("Contrato salvo, mas houve erro ao gerar transações");
      } else {
        toast.success("Transações geradas e saldos atualizados!");
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bank-accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['pending-transactions'] })
      ]);

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
            <Label htmlFor="description">Observações</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="service_description">Descrição do Serviço *</Label>
            <Textarea
              id="service_description"
              value={formData.service_description}
              onChange={(e) => setFormData({ ...formData, service_description: e.target.value })}
              rows={3}
              placeholder="Descreva detalhadamente o tipo de serviço contratado..."
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
                  <SelectItem value="income">Receita</SelectItem>
                  <SelectItem value="expense">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Valor Mensal *</Label>
              <CurrencyInput
                value={formData.amount}
                onChange={(value) => setFormData({ ...formData, amount: value })}
                placeholder="R$ 0,00"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bank_account_id">Conta Bancária *</Label>
            <Select
              value={formData.bank_account_id}
              onValueChange={(value) => {
                setFormData({ ...formData, bank_account_id: value });
                setCentroCustoId("");
                setCategoriaId("");
              }}
              disabled={loadingAccounts}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingAccounts ? "Carregando..." : "Selecione a conta"} />
              </SelectTrigger>
              <SelectContent>
                {accounts?.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.bank_name} - {account.account_number}
                    {account.account_digit && `-${account.account_digit}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Centro de Custo e Categoria */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="centro_custo">Centro de Custo *</Label>
              <SelectCentroCusto
                contaBancariaId={formData.bank_account_id}
                value={centroCustoId}
                onChange={(value) => {
                  setCentroCustoId(value);
                  setCategoriaId("");
                }}
                placeholder="Selecione o centro de custo"
                disabled={!formData.bank_account_id}
              />
            </div>

            {formData.type === 'expense' && (
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria de Despesa</Label>
                <SelectCategoria
                  centroCustoId={centroCustoId}
                  tipo="despesa"
                  value={categoriaId}
                  onChange={setCategoriaId}
                  placeholder="Selecione a categoria"
                  disabled={!centroCustoId}
                />
              </div>
            )}
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
                  <SelectItem value="daily">Diário</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
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

          {/* Anexos */}
          <div className="space-y-2">
            <Label>Anexar Contrato (Opcional)</Label>
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
              {contract ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
