import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, Sparkles, CheckCircle2, Trash2 } from "lucide-react";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useCategoriasFiltradas } from "@/hooks/useCategoriasFiltradas";
import * as XLSX from 'xlsx';

interface ImportStatementAIDialogProps {
  open: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'revenue' | 'expense';
  bankAccountId?: string;
  centroCustoId?: string;
  categoriaId?: string;
  ignore?: boolean;
}

export function ImportStatementAIDialog({ open, onClose, onImportComplete }: ImportStatementAIDialogProps) {
  const { toast } = useToast();
  const { accounts, isLoading: loadingAccounts } = useBankAccounts();
  
  const [file, setFile] = useState<File | null>(null);
  const [selectedBankAccount, setSelectedBankAccount] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const isValidTxt = selectedFile.name.toLowerCase().endsWith('.txt') || 
                         selectedFile.type === 'text/plain';
      const isValidCsv = selectedFile.name.toLowerCase().endsWith('.csv') ||
                         selectedFile.type === 'text/csv' ||
                         selectedFile.type === 'application/csv';
      const isValidExcel = selectedFile.name.toLowerCase().endsWith('.xlsx') ||
                          selectedFile.name.toLowerCase().endsWith('.xls') ||
                          selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                          selectedFile.type === 'application/vnd.ms-excel';
      const isValidImage = selectedFile.type.startsWith('image/') &&
                          (selectedFile.name.toLowerCase().endsWith('.jpg') ||
                           selectedFile.name.toLowerCase().endsWith('.jpeg') ||
                           selectedFile.name.toLowerCase().endsWith('.png') ||
                           selectedFile.name.toLowerCase().endsWith('.webp'));
      
      if (!isValidTxt && !isValidCsv && !isValidExcel && !isValidImage) {
        toast({
          title: "Formato inválido",
          description: "Por favor, selecione um arquivo TXT, CSV, Excel ou Imagem (JPG, PNG, WEBP).",
          variant: "destructive",
        });
        event.target.value = '';
        return;
      }
      
      // Check file size (max 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 5MB.",
          variant: "destructive",
        });
        event.target.value = '';
        return;
      }
      
      setFile(selectedFile);
      setParsedTransactions([]);
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      toast({
        title: "Arquivo necessário",
        description: "Por favor, selecione um arquivo para análise.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedBankAccount) {
      toast({
        title: "Conta bancária necessária",
        description: "Por favor, selecione uma conta bancária.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      console.log('Reading file:', file.name, 'Size:', file.size, 'Type:', file.type);
      
      let fileContent = '';
      let isImage = false;
      
      // Check if it's an image file
      if (file.type.startsWith('image/')) {
        isImage = true;
        
        // Check image size (recommend max 2MB for better performance)
        if (file.size > 2 * 1024 * 1024) {
          toast({
            title: "Imagem muito grande",
            description: "Para melhor performance, use imagens menores que 2MB. A análise pode demorar mais.",
            variant: "default",
          });
        }
        
        // Read image as base64
        const reader = new FileReader();
        fileContent = await new Promise<string>((resolve, reject) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        console.log('Image file converted to base64, size:', fileContent.length);
      }
      // Check if it's a CSV file
      else if (file.name.toLowerCase().endsWith('.csv') ||
               file.type === 'text/csv' ||
               file.type === 'application/csv') {
        // Read CSV file
        console.log('Reading CSV file...');
        fileContent = await file.text();
        console.log('CSV content length:', fileContent.length, 'rows:', fileContent.split('\n').length);
        console.log('First 200 chars:', fileContent.substring(0, 200));
        
        // Validate that CSV has content beyond just headers
        const lines = fileContent.split('\n').filter(line => line.trim().length > 0);
        if (lines.length < 2) {
          toast({
            title: "CSV sem dados",
            description: "O arquivo não contém linhas de dados (apenas cabeçalhos ou vazio).",
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }
      }
      // Check if it's an Excel file
      else if (file.name.toLowerCase().endsWith('.xlsx') || 
               file.name.toLowerCase().endsWith('.xls') ||
               file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
               file.type === 'application/vnd.ms-excel') {
        // Read Excel file
        console.log('Reading Excel file...');
        const arrayBuffer = await file.arrayBuffer();
        console.log('ArrayBuffer size:', arrayBuffer.byteLength);
        
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        console.log('Workbook sheets:', workbook.SheetNames);
        
        if (workbook.SheetNames.length === 0) {
          toast({
            title: "Excel vazio",
            description: "O arquivo Excel não contém planilhas.",
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }
        
        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        console.log('Reading sheet:', firstSheetName);
        
        // Convert to CSV format for AI analysis
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        fileContent = csv;
        
        console.log('Excel converted to CSV, length:', csv.length, 'rows:', csv.split('\n').length);
        console.log('First 200 chars:', csv.substring(0, 200));
        
        // Validate that CSV has content beyond just headers
        const lines = csv.split('\n').filter(line => line.trim().length > 0);
        if (lines.length < 2) {
          toast({
            title: "Excel sem dados",
            description: "A planilha não contém linhas de dados (apenas cabeçalhos ou vazia).",
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }
      } else {
        // Read text file
        fileContent = await file.text();
      }
      
      if (!fileContent || fileContent.trim().length === 0) {
        toast({
          title: "Arquivo vazio",
          description: "O arquivo não contém dados para análise.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }
      
      console.log('File content ready, length:', fileContent.length);
      console.log('Is image:', isImage);
      console.log('Sending to AI for analysis...');
      
      try {
        const startTime = Date.now();
        console.log('Calling edge function at:', new Date().toISOString());
        
        // Use fetch directly instead of supabase.functions.invoke
        const response = await fetch(
          `https://agpeebvrrcytghmilzss.supabase.co/functions/v1/analyze-bank-statement`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
              content: fileContent,
              isImage: isImage
            })
          }
        );

        const endTime = Date.now();
        console.log('Edge function returned after', (endTime - startTime) / 1000, 'seconds');
        console.log('Response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Edge function error:', response.status, errorText);
          toast({
            title: "Erro ao processar",
            description: `Erro ${response.status}: ${errorText}`,
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }

        const data = await response.json();
        console.log('Edge function data:', { 
          hasTransactions: !!data.transactions,
          transactionsCount: data.transactions?.length 
        });

        if (!data.transactions || !Array.isArray(data.transactions)) {
          console.error('Invalid response format:', data);
          toast({
            title: "Resposta inválida",
            description: "A IA retornou um formato inválido.",
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }

        if (data.transactions.length === 0) {
          toast({
            title: "Nenhuma transação encontrada",
            description: "A IA não conseguiu identificar transações no arquivo.",
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }

        console.log('Transactions found:', data.transactions.length);

        // Add default bank account to all transactions
        const transactionsWithAccount = data.transactions.map((t: ParsedTransaction) => ({
          ...t,
          bankAccountId: selectedBankAccount,
          ignore: false
        }));

        setParsedTransactions(transactionsWithAccount);
        
        toast({
          title: "Análise concluída",
          description: `${transactionsWithAccount.length} transações identificadas.`,
        });
      } catch (error: any) {
        console.error('Error calling edge function:', error);
        toast({
          title: "Erro na análise",
          description: error.message || "Erro ao analisar o extrato.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

    } catch (error) {
      console.error('Error analyzing statement:', error);
      toast({
        title: "Erro na análise",
        description: error instanceof Error ? error.message : "Erro ao analisar o extrato.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateTransaction = (index: number, field: string, value: any) => {
    setParsedTransactions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveTransaction = (index: number) => {
    setParsedTransactions(prev => prev.filter((_, i) => i !== index));
  };

  const handleImport = async () => {
    const activeTransactions = parsedTransactions.filter(t => !t.ignore);
    
    if (activeTransactions.length === 0) {
      toast({
        title: "Nenhuma transação selecionada",
        description: "Selecione pelo menos uma transação para importar.",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      // Prepare transactions for insert
      const transactionsToInsert = activeTransactions.map(t => ({
        company_id: profile.company_id,
        type: t.type,
        description: t.description,
        amount: t.amount,
        due_date: t.date,
        status: 'pending',
        bank_account_id: t.bankAccountId,
        account_from_id: t.type === 'expense' ? t.bankAccountId : null,
        account_to_id: t.type === 'revenue' ? t.bankAccountId : null,
        centro_custo_id: t.centroCustoId || null,
        categoria_receita_id: t.type === 'revenue' ? t.categoriaId : null,
        categoria_despesa_id: t.type === 'expense' ? t.categoriaId : null,
        created_by: user.id,
      }));

      const { error } = await supabase
        .from('transactions')
        .insert(transactionsToInsert);

      if (error) throw error;

      toast({
        title: "Importação concluída",
        description: `${activeTransactions.length} transações importadas com sucesso.`,
      });

      handleClose();
      onImportComplete();

    } catch (error) {
      console.error('Error importing transactions:', error);
      toast({
        title: "Erro na importação",
        description: error instanceof Error ? error.message : "Erro ao importar transações.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setSelectedBankAccount("");
    setParsedTransactions([]);
    setIsProcessing(false);
    setIsImporting(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Importar Extrato com IA
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload Section */}
          {parsedTransactions.length === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bankAccount">Conta Bancária</Label>
                <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta bancária" />
                  </SelectTrigger>
                  <SelectContent>
                    {(accounts || [])
                      .filter(acc => acc.is_active)
                      .map(account => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.bank_name} - {account.account_number}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">Arquivo do Extrato</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="file"
                    type="file"
                    accept=".txt,.csv,.xlsx,.xls,.jpg,.jpeg,.png,.webp,text/plain,text/csv,application/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,image/*"
                    onChange={handleFileChange}
                    disabled={isProcessing}
                  />
                  <Button
                    onClick={handleAnalyze}
                    disabled={!file || !selectedBankAccount || isProcessing}
                    className="whitespace-nowrap"
                  >
                    {isProcessing ? (
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
                <p className="text-sm text-muted-foreground">
                  Formatos aceitos: TXT, CSV, Excel (.xlsx, .xls), Imagens (JPG, PNG, WEBP)
                </p>
                {file && (
                  <p className="text-xs text-primary mt-1">
                    ✓ {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Review Section */}
          {parsedTransactions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {parsedTransactions.filter(t => !t.ignore).length} transações para importar
                </p>
                <Button
                  onClick={handleImport}
                  disabled={isImporting}
                  className="gap-2"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Confirmar Importação
                    </>
                  )}
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="w-[120px]">Tipo</TableHead>
                      <TableHead className="w-[120px]">Valor</TableHead>
                      <TableHead className="w-[200px]">Centro de Custo</TableHead>
                      <TableHead className="w-[200px]">Categoria</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedTransactions.map((transaction, index) => (
                      <TransactionReviewRow
                        key={index}
                        transaction={transaction}
                        index={index}
                        onUpdate={handleUpdateTransaction}
                        onRemove={handleRemoveTransaction}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface TransactionReviewRowProps {
  transaction: ParsedTransaction;
  index: number;
  onUpdate: (index: number, field: string, value: any) => void;
  onRemove: (index: number) => void;
}

function TransactionReviewRow({ transaction, index, onUpdate, onRemove }: TransactionReviewRowProps) {
  const { categorias: categoriasCentroCusto } = useCategoriasFiltradas({ 
    tipo: 'centro_custo',
    contaBancariaId: transaction.bankAccountId 
  });
  const { categorias: categoriasReceita } = useCategoriasFiltradas({ tipo: 'receita' });
  const { categorias: categoriasDespesa } = useCategoriasFiltradas({ tipo: 'despesa' });

  const categorias = transaction.type === 'revenue' ? categoriasReceita : categoriasDespesa;

  return (
    <TableRow className={transaction.ignore ? "opacity-50" : ""}>
      <TableCell>
        <Input
          type="date"
          value={transaction.date}
          onChange={(e) => onUpdate(index, 'date', e.target.value)}
          className="w-full"
        />
      </TableCell>
      <TableCell>
        <Input
          value={transaction.description}
          onChange={(e) => onUpdate(index, 'description', e.target.value)}
          className="w-full"
        />
      </TableCell>
      <TableCell>
        <Select
          value={transaction.type}
          onValueChange={(value) => onUpdate(index, 'type', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="revenue">Receita</SelectItem>
            <SelectItem value="expense">Despesa</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          type="number"
          step="0.01"
          value={transaction.amount}
          onChange={(e) => onUpdate(index, 'amount', parseFloat(e.target.value))}
          className="w-full"
        />
      </TableCell>
      <TableCell>
        <Select
          value={transaction.centroCustoId || ""}
          onValueChange={(value) => onUpdate(index, 'centroCustoId', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {categoriasCentroCusto.map(cc => (
              <SelectItem key={cc.id} value={cc.id}>
                {cc.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Select
          value={transaction.categoriaId || ""}
          onValueChange={(value) => onUpdate(index, 'categoriaId', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {categorias.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(index)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
