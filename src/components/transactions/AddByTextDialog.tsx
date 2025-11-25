import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Trash2, Check, ArrowUpRight, ArrowDownRight, Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useCategorias } from "@/hooks/useCategorias";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { cn } from "@/lib/utils";

interface ExtractedTransaction {
  type: "revenue" | "expense";
  description: string;
  amount: number;
  due_date: string;
  status: "pending" | "paid";
  categoria_receita_id?: string;
  categoria_despesa_id?: string;
  centro_custo_id?: string;
}

interface AddByTextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddByTextDialog({ open, onOpenChange, onSuccess }: AddByTextDialogProps) {
  const queryClient = useQueryClient();
  const { categorias } = useCategorias();
  const { accounts } = useBankAccounts();
  
  const [text, setText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [extractedTransactions, setExtractedTransactions] = useState<ExtractedTransaction[]>([]);
  const [selectedBankAccount, setSelectedBankAccount] = useState<string>("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const categoriasReceita = categorias?.filter(c => c.tipo === 'receita') || [];
  const categoriasDespesa = categorias?.filter(c => c.tipo === 'despesa') || [];
  const centrosCusto = categorias?.filter(c => c.tipo === 'centro_custo') || [];

  const handleAnalyze = async () => {
    if (!text.trim()) {
      toast.error("Digite um texto para analisar");
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-transactions-text', {
        body: { text }
      });

      if (error) throw error;

      if (data.transactions && data.transactions.length > 0) {
        setExtractedTransactions(data.transactions);
        toast.success(`${data.transactions.length} transação(ões) identificada(s)!`);
      } else {
        toast.info("Nenhuma transação identificada no texto");
        setExtractedTransactions([]);
      }
    } catch (error: any) {
      console.error('Erro ao analisar:', error);
      toast.error(error.message || "Erro ao analisar texto");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRemoveTransaction = (index: number) => {
    setExtractedTransactions(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateTransaction = (index: number, field: keyof ExtractedTransaction, value: any) => {
    setExtractedTransactions(prev => prev.map((t, i) => 
      i === index ? { ...t, [field]: value } : t
    ));
  };

  const handleSaveAll = async () => {
    if (extractedTransactions.length === 0) {
      toast.error("Nenhuma transação para salvar");
      return;
    }

    if (!selectedBankAccount) {
      toast.error("Selecione uma conta bancária");
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

      // Prepare transactions for insert
      const transactionsToInsert = extractedTransactions.map(t => ({
        company_id: profile.company_id,
        type: t.type,
        description: t.description,
        amount: t.amount,
        due_date: t.due_date,
        status: t.status,
        payment_date: t.status === 'paid' ? t.due_date : null,
        bank_account_id: selectedBankAccount,
        account_from_id: t.type === 'expense' ? selectedBankAccount : null,
        account_to_id: t.type === 'revenue' ? selectedBankAccount : null,
        categoria_receita_id: t.type === 'revenue' ? t.categoria_receita_id : null,
        categoria_despesa_id: t.type === 'expense' ? t.categoria_despesa_id : null,
        centro_custo_id: t.centro_custo_id || null,
        created_by: user.id
      }));

      const { error } = await supabase
        .from("transactions")
        .insert(transactionsToInsert);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['pending-transactions'] });

      toast.success(`${extractedTransactions.length} transação(ões) criada(s) com sucesso!`);
      
      // Reset state
      setText("");
      setExtractedTransactions([]);
      setSelectedBankAccount("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast.error(error.message || "Erro ao salvar transações");
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (value: number | null | undefined) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value ?? 0);
  };

  const totalReceitas = extractedTransactions
    .filter(t => t.type === 'revenue')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalDespesas = extractedTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Adicionar Transações por Texto
          </DialogTitle>
          <DialogDescription>
            Descreva suas transações em texto livre e a IA irá identificá-las automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Text Input */}
          <div className="space-y-2">
            <Textarea
              placeholder={`Exemplos:\n- Recebi R$ 5.000 de venda de produtos dia 15\n- Pagar conta de luz R$ 350 amanhã\n- Aluguel de R$ 2.500 pendente para o dia 10\n- Salários de 15 mil pagos hoje`}
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

          {/* Extracted Transactions */}
          {extractedTransactions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Transações Identificadas</h3>
                <div className="flex gap-4 text-sm">
                  <span className="text-green-600">
                    Receitas: {formatCurrency(totalReceitas)}
                  </span>
                  <span className="text-red-600">
                    Despesas: {formatCurrency(totalDespesas)}
                  </span>
                </div>
              </div>

              {/* Bank Account Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Conta Bancária *</label>
                <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta para as transações" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts?.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.bank_name} - {account.account_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Transaction List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {extractedTransactions.map((transaction, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <div className={cn(
                          "p-1.5 rounded-full",
                          transaction.type === 'revenue' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                        )}>
                          {transaction.type === 'revenue' ? (
                            <ArrowUpRight className="h-4 w-4" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4" />
                          )}
                        </div>
                        
                        {editingIndex === index ? (
                          <div className="flex-1 space-y-2">
                            <Input
                              value={transaction.description}
                              onChange={(e) => handleUpdateTransaction(index, 'description', e.target.value)}
                              placeholder="Descrição"
                            />
                            <div className="grid grid-cols-3 gap-2">
                              <Input
                                type="number"
                                value={transaction.amount}
                                onChange={(e) => handleUpdateTransaction(index, 'amount', parseFloat(e.target.value) || 0)}
                                placeholder="Valor"
                              />
                              <Input
                                type="date"
                                value={transaction.due_date}
                                onChange={(e) => handleUpdateTransaction(index, 'due_date', e.target.value)}
                              />
                              <Select
                                value={transaction.status}
                                onValueChange={(value) => handleUpdateTransaction(index, 'status', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pendente</SelectItem>
                                  <SelectItem value="paid">Pago</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {transaction.type === 'revenue' ? (
                                <Select
                                  value={transaction.categoria_receita_id || ""}
                                  onValueChange={(value) => handleUpdateTransaction(index, 'categoria_receita_id', value)}
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
                                  value={transaction.categoria_despesa_id || ""}
                                  onValueChange={(value) => handleUpdateTransaction(index, 'categoria_despesa_id', value)}
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
                                value={transaction.centro_custo_id || ""}
                                onValueChange={(value) => handleUpdateTransaction(index, 'centro_custo_id', value)}
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
                            <Button size="sm" onClick={() => setEditingIndex(null)}>
                              <Check className="h-4 w-4 mr-1" /> Confirmar
                            </Button>
                          </div>
                        ) : (
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{transaction.description}</span>
                              <Badge variant={transaction.status === 'paid' ? 'default' : 'secondary'}>
                                {transaction.status === 'paid' ? 'Pago' : 'Pendente'}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground flex gap-3">
                              <span className={cn(
                                "font-medium",
                                transaction.type === 'revenue' ? "text-green-600" : "text-red-600"
                              )}>
                                {formatCurrency(transaction.amount)}
                              </span>
                              <span>{new Date(transaction.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                            </div>
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
                            onClick={() => handleRemoveTransaction(index)}
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
                <Button variant="outline" onClick={() => setExtractedTransactions([])}>
                  Limpar
                </Button>
                <Button 
                  onClick={handleSaveAll} 
                  disabled={isSaving || !selectedBankAccount}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Salvar {extractedTransactions.length} Transação(ões)
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
