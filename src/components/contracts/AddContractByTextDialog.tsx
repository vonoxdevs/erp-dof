import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Trash2, Check, ArrowUpRight, ArrowDownRight, Edit2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCategorias } from "@/hooks/useCategorias";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { cn } from "@/lib/utils";

interface ExtractedContract {
  contract_name: string;
  type: "revenue" | "expense";
  amount: number;
  frequency: "weekly" | "monthly" | "quarterly" | "yearly";
  start_date: string;
  end_date?: string | null;
  description?: string;
  contact_id?: string;
  categoria_receita_id?: string;
  categoria_despesa_id?: string;
  centro_custo_id?: string;
  is_active: boolean;
}

interface AddContractByTextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const frequencyLabels: Record<string, string> = {
  weekly: "Semanal",
  monthly: "Mensal",
  quarterly: "Trimestral",
  yearly: "Anual"
};

export function AddContractByTextDialog({ open, onOpenChange, onSuccess }: AddContractByTextDialogProps) {
  const { categorias } = useCategorias();
  const { accounts } = useBankAccounts();
  
  const [text, setText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [extractedContracts, setExtractedContracts] = useState<ExtractedContract[]>([]);
  const [selectedBankAccount, setSelectedBankAccount] = useState<string>("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [contacts, setContacts] = useState<{ id: string; name: string; type: string }[]>([]);

  const categoriasReceita = categorias?.filter(c => c.tipo === 'receita') || [];
  const categoriasDespesa = categorias?.filter(c => c.tipo === 'despesa') || [];
  const centrosCusto = categorias?.filter(c => c.tipo === 'centro_custo') || [];

  const loadContacts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile?.company_id) return;

    const { data } = await supabase
      .from("contacts")
      .select("id, name, type")
      .eq("company_id", profile.company_id)
      .eq("is_active", true);

    setContacts(data || []);
  };

  const handleAnalyze = async () => {
    if (!text.trim()) {
      toast.error("Digite um texto para analisar");
      return;
    }

    setIsAnalyzing(true);
    await loadContacts();
    
    try {
      const { data, error } = await supabase.functions.invoke('parse-contracts-text', {
        body: { text }
      });

      if (error) throw error;

      if (data.contracts && data.contracts.length > 0) {
        setExtractedContracts(data.contracts);
        toast.success(`${data.contracts.length} contrato(s) identificado(s)!`);
      } else {
        toast.info("Nenhum contrato identificado no texto");
        setExtractedContracts([]);
      }
    } catch (error: any) {
      console.error('Erro ao analisar:', error);
      toast.error(error.message || "Erro ao analisar texto");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRemoveContract = (index: number) => {
    setExtractedContracts(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateContract = (index: number, field: keyof ExtractedContract, value: any) => {
    setExtractedContracts(prev => prev.map((c, i) => 
      i === index ? { ...c, [field]: value } : c
    ));
  };

  const handleSaveAll = async () => {
    if (extractedContracts.length === 0) {
      toast.error("Nenhum contrato para salvar");
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      // Prepare contracts for insert
      const contractsToInsert = extractedContracts.map(c => ({
        company_id: profile.company_id,
        name: c.contract_name,
        contract_name: c.contract_name,
        type: c.type,
        amount: c.amount,
        frequency: c.frequency,
        start_date: c.start_date,
        end_date: c.end_date || null,
        description: c.description || null,
        contact_id: c.contact_id || null,
        bank_account_id: selectedBankAccount || null,
        categoria_receita_id: c.type === 'revenue' ? c.categoria_receita_id : null,
        categoria_despesa_id: c.type === 'expense' ? c.categoria_despesa_id : null,
        centro_custo_id: c.centro_custo_id || null,
        is_active: c.is_active,
        auto_generate: true,
        generation_day: new Date(c.start_date).getDate()
      }));

      const { error } = await supabase
        .from("contracts")
        .insert(contractsToInsert);

      if (error) throw error;

      toast.success(`${extractedContracts.length} contrato(s) criado(s) com sucesso!`);
      
      // Reset state
      setText("");
      setExtractedContracts([]);
      setSelectedBankAccount("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast.error(error.message || "Erro ao salvar contratos");
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const totalReceitas = extractedContracts
    .filter(c => c.type === 'revenue')
    .reduce((sum, c) => sum + c.amount, 0);
  
  const totalDespesas = extractedContracts
    .filter(c => c.type === 'expense')
    .reduce((sum, c) => sum + c.amount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Adicionar Contratos por Texto
          </DialogTitle>
          <DialogDescription>
            Descreva seus contratos em texto livre e a IA irá identificá-los automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Text Input */}
          <div className="space-y-2">
            <Textarea
              placeholder={`Exemplos:\n- Aluguel mensal de R$ 2.500 com a Imobiliária XYZ a partir de janeiro\n- Contrato de internet com a Vivo por R$ 199,90 mensais\n- Mensalidade do software CRM de R$ 500 por mês\n- Prestação de serviço para Cliente ABC de R$ 10 mil mensais por 12 meses`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[150px] resize-none"
              disabled={isAnalyzing}
            />
            <div className="flex justify-end">
              <Button 
                onClick={handleAnalyze} 
                disabled={isAnalyzing || !text.trim()}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Analisar com IA
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Extracted Contracts */}
          {extractedContracts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Contratos Identificados</h3>
                <div className="flex gap-4 text-sm">
                  <span className="text-green-600">
                    Receitas: {formatCurrency(totalReceitas)}/mês
                  </span>
                  <span className="text-red-600">
                    Despesas: {formatCurrency(totalDespesas)}/mês
                  </span>
                </div>
              </div>

              {/* Bank Account Selection (Optional) */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Conta Bancária (opcional)</label>
                <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta padrão para os contratos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {accounts?.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.bank_name} - {account.account_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Contract List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {extractedContracts.map((contract, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <div className={cn(
                          "p-1.5 rounded-full",
                          contract.type === 'revenue' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                        )}>
                          {contract.type === 'revenue' ? (
                            <ArrowUpRight className="h-4 w-4" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4" />
                          )}
                        </div>
                        
                        {editingIndex === index ? (
                          <div className="flex-1 space-y-2">
                            <Input
                              value={contract.contract_name}
                              onChange={(e) => handleUpdateContract(index, 'contract_name', e.target.value)}
                              placeholder="Nome do contrato"
                            />
                            <div className="grid grid-cols-3 gap-2">
                              <Input
                                type="number"
                                value={contract.amount}
                                onChange={(e) => handleUpdateContract(index, 'amount', parseFloat(e.target.value) || 0)}
                                placeholder="Valor"
                              />
                              <Select
                                value={contract.frequency}
                                onValueChange={(value) => handleUpdateContract(index, 'frequency', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="weekly">Semanal</SelectItem>
                                  <SelectItem value="monthly">Mensal</SelectItem>
                                  <SelectItem value="quarterly">Trimestral</SelectItem>
                                  <SelectItem value="yearly">Anual</SelectItem>
                                </SelectContent>
                              </Select>
                              <Select
                                value={contract.type}
                                onValueChange={(value) => handleUpdateContract(index, 'type', value)}
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
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                type="date"
                                value={contract.start_date}
                                onChange={(e) => handleUpdateContract(index, 'start_date', e.target.value)}
                                placeholder="Data de início"
                              />
                              <Input
                                type="date"
                                value={contract.end_date || ""}
                                onChange={(e) => handleUpdateContract(index, 'end_date', e.target.value || null)}
                                placeholder="Data de término"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {contract.type === 'revenue' ? (
                                <Select
                                  value={contract.categoria_receita_id || ""}
                                  onValueChange={(value) => handleUpdateContract(index, 'categoria_receita_id', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Categoria de Receita" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {categoriasReceita.map((cat) => (
                                      <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Select
                                  value={contract.categoria_despesa_id || ""}
                                  onValueChange={(value) => handleUpdateContract(index, 'categoria_despesa_id', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Categoria de Despesa" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {categoriasDespesa.map((cat) => (
                                      <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                              <Select
                                value={contract.centro_custo_id || ""}
                                onValueChange={(value) => handleUpdateContract(index, 'centro_custo_id', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Centro de Custo" />
                                </SelectTrigger>
                                <SelectContent>
                                  {centrosCusto.map((cc) => (
                                    <SelectItem key={cc.id} value={cc.id}>{cc.nome}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Select
                              value={contract.contact_id || ""}
                              onValueChange={(value) => handleUpdateContract(index, 'contact_id', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Cliente/Fornecedor" />
                              </SelectTrigger>
                              <SelectContent>
                                {contacts.map((contact) => (
                                  <SelectItem key={contact.id} value={contact.id}>
                                    {contact.name} ({contact.type === 'customer' ? 'Cliente' : 'Fornecedor'})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              value={contract.description || ""}
                              onChange={(e) => handleUpdateContract(index, 'description', e.target.value)}
                              placeholder="Descrição (opcional)"
                            />
                            <Button size="sm" onClick={() => setEditingIndex(null)}>
                              <Check className="h-4 w-4 mr-1" /> Confirmar
                            </Button>
                          </div>
                        ) : (
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{contract.contract_name}</span>
                              <Badge variant={contract.is_active ? 'default' : 'secondary'}>
                                {contract.is_active ? 'Ativo' : 'Inativo'}
                              </Badge>
                              <Badge variant="outline">
                                {frequencyLabels[contract.frequency]}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground flex gap-3 mt-1">
                              <span className={cn(
                                "font-medium",
                                contract.type === 'revenue' ? "text-green-600" : "text-red-600"
                              )}>
                                {formatCurrency(contract.amount)}
                              </span>
                              <span>
                                Início: {new Date(contract.start_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                              </span>
                              {contract.end_date && (
                                <span>
                                  Término: {new Date(contract.end_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                </span>
                              )}
                            </div>
                            {contract.description && (
                              <p className="text-xs text-muted-foreground mt-1">{contract.description}</p>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {editingIndex !== index && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingIndex(index)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveContract(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              {/* Save Button */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setExtractedContracts([])}>
                  Limpar
                </Button>
                <Button 
                  onClick={handleSaveAll} 
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Salvar {extractedContracts.length} Contrato(s)
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
