import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SelectCentroCusto } from "@/components/shared/SelectCentroCusto";
import { useCategoriasFiltradas } from "@/hooks/useCategoriasFiltradas";

interface ParsedTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "revenue" | "expense";
  ignore: boolean;
  centroCustoId: string;
  categoriaId: string;
  bankAccountId: string;
}

interface ImportBankStatementDialogProps {
  open: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export function ImportBankStatementDialog({ open, onClose, onImportComplete }: ImportBankStatementDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedTransaction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedBankAccount, setSelectedBankAccount] = useState<string>("");
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carregar contas bancárias ao abrir
  useState(() => {
    if (open) {
      loadBankAccounts();
    }
  });

  const loadBankAccounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) return;

      const { data } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("company_id", profile.company_id)
        .eq("is_active", true)
        .order("bank_name");

      if (data) setBankAccounts(data);
    } catch (error) {
      console.error("Erro ao carregar contas bancárias:", error);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error("Por favor, selecione um arquivo CSV");
      return;
    }

    setFile(selectedFile);
    parseCSV(selectedFile);
  };

  const parseCSV = (file: File) => {
    setIsProcessing(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const transactions: ParsedTransaction[] = results.data.map((row: any, index: number) => {
            // Detectar formato do CSV (pode variar entre bancos)
            const date = row.Data || row.data || row.DATE || row.date;
            const description = row.Descrição || row.Descricao || row.descricao || row.DESCRIPTION || row.description;
            const value = row.Valor || row.valor || row.VALUE || row.value || row.Amount || row.amount;
            const tipo = row.Tipo || row.tipo || row.TYPE || row.type;

            // Limpar e converter valor
            let amount = 0;
            if (typeof value === 'string') {
              // Remover R$, pontos de milhar e substituir vírgula por ponto
              const cleanValue = value.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
              amount = parseFloat(cleanValue);
            } else {
              amount = parseFloat(value);
            }

            // Determinar tipo (receita ou despesa)
            let transactionType: "revenue" | "expense" = "expense";
            if (tipo) {
              const t = tipo.toLowerCase();
              if (t.includes('c') || t.includes('credit') || t.includes('receita')) {
                transactionType = "revenue";
              }
            } else if (amount > 0) {
              transactionType = "revenue";
            } else {
              transactionType = "expense";
              amount = Math.abs(amount);
            }

            // Converter data
            let formattedDate = '';
            try {
              if (date) {
                // Tentar vários formatos de data
                const dateStr = String(date);
                if (dateStr.includes('/')) {
                  const [day, month, year] = dateStr.split('/');
                  formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                } else if (dateStr.includes('-')) {
                  formattedDate = dateStr;
                } else {
                  formattedDate = format(new Date(), 'yyyy-MM-dd');
                }
              } else {
                formattedDate = format(new Date(), 'yyyy-MM-dd');
              }
            } catch (e) {
              formattedDate = format(new Date(), 'yyyy-MM-dd');
            }

            return {
              id: `temp-${index}`,
              date: formattedDate,
              description: description || 'Sem descrição',
              amount: isNaN(amount) ? 0 : amount,
              type: transactionType,
              ignore: false,
              centroCustoId: "",
              categoriaId: "",
              bankAccountId: selectedBankAccount
            };
          });

          setParsedData(transactions);
          toast.success(`${transactions.length} transações carregadas do arquivo`);
        } catch (error) {
          console.error("Erro ao processar CSV:", error);
          toast.error("Erro ao processar o arquivo CSV");
        } finally {
          setIsProcessing(false);
        }
      },
      error: (error) => {
        console.error("Erro ao ler CSV:", error);
        toast.error("Erro ao ler o arquivo CSV");
        setIsProcessing(false);
      }
    });
  };

  const handleUpdateTransaction = (id: string, field: string, value: any) => {
    setParsedData(prev =>
      prev.map(t => t.id === id ? { ...t, [field]: value } : t)
    );
  };

  const handleImport = async () => {
    if (!selectedBankAccount) {
      toast.error("Selecione uma conta bancária");
      return;
    }

    const toImport = parsedData.filter(t => !t.ignore);

    if (toImport.length === 0) {
      toast.error("Nenhuma transação selecionada para importar");
      return;
    }

    // Validar se todas têm categoria
    const missingCategory = toImport.find(t => !t.categoriaId);
    if (missingCategory) {
      toast.error("Todas as transações devem ter uma categoria");
      return;
    }

    setIsProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      const transactionsToInsert = toImport.map(t => ({
        company_id: profile.company_id,
        type: t.type,
        description: t.description,
        amount: t.amount,
        due_date: t.date,
        status: 'pending',
        bank_account_id: selectedBankAccount,
        account_from_id: t.type === 'expense' ? selectedBankAccount : null,
        account_to_id: t.type === 'revenue' ? selectedBankAccount : null,
        centro_custo_id: t.centroCustoId || null,
        categoria_receita_id: t.type === 'revenue' ? t.categoriaId : null,
        categoria_despesa_id: t.type === 'expense' ? t.categoriaId : null,
        created_by: user.id
      }));

      const { error } = await supabase
        .from("transactions")
        .insert(transactionsToInsert);

      if (error) throw error;

      toast.success(`${toImport.length} transações importadas com sucesso!`);
      onImportComplete();
      handleClose();
    } catch (error: any) {
      console.error("Erro ao importar transações:", error);
      toast.error(error.message || "Erro ao importar transações");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedData([]);
    setSelectedBankAccount("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Extrato Bancário</DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo CSV e edite as transações antes de importar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Seleção de conta bancária */}
          <div className="space-y-2">
            <Label>Conta Bancária</Label>
            <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a conta bancária" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map(account => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.bank_name} - {account.account_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Upload de arquivo */}
          <div className="space-y-2">
            <Label>Arquivo CSV</Label>
            <div className="flex gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={!selectedBankAccount || isProcessing}
              />
              {file && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setFile(null);
                    setParsedData([]);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Formato esperado: Data, Descrição, Valor, Tipo (opcional)
            </p>
          </div>

          {/* Tabela de prévia editável */}
          {parsedData.length > 0 && (
            <div className="border rounded-lg">
              <div className="p-4 bg-muted/50 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-accent" />
                  <span className="font-medium">
                    {parsedData.filter(t => !t.ignore).length} transações para importar
                  </span>
                </div>
                <Button onClick={handleImport} disabled={isProcessing}>
                  {isProcessing ? "Importando..." : "Importar Selecionadas"}
                </Button>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Ignorar</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="w-48">Centro de Custo</TableHead>
                      <TableHead className="w-48">Categoria</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((transaction) => (
                      <TransactionRow
                        key={transaction.id}
                        transaction={transaction}
                        bankAccountId={selectedBankAccount}
                        onUpdate={handleUpdateTransaction}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {parsedData.length === 0 && file && (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma transação encontrada no arquivo</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Componente separado para cada linha da tabela
function TransactionRow({
  transaction,
  bankAccountId,
  onUpdate
}: {
  transaction: ParsedTransaction;
  bankAccountId: string;
  onUpdate: (id: string, field: string, value: any) => void;
}) {
  const { categorias } = useCategoriasFiltradas({
    contaBancariaId: bankAccountId,
    centroCustoId: transaction.centroCustoId,
    tipo: transaction.type === 'revenue' ? 'receita' : 'despesa'
  });

  return (
    <TableRow className={transaction.ignore ? "opacity-50" : ""}>
      <TableCell>
        <Checkbox
          checked={transaction.ignore}
          onCheckedChange={(checked) => onUpdate(transaction.id, "ignore", checked)}
        />
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {format(new Date(transaction.date), "dd/MM/yyyy", { locale: ptBR })}
      </TableCell>
      <TableCell>
        <Input
          value={transaction.description}
          onChange={(e) => onUpdate(transaction.id, "description", e.target.value)}
          disabled={transaction.ignore}
          className="min-w-[200px]"
        />
      </TableCell>
      <TableCell className={transaction.type === 'revenue' ? 'text-accent font-semibold' : 'text-destructive font-semibold'}>
        R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </TableCell>
      <TableCell>
        <Select
          value={transaction.type}
          onValueChange={(value) => onUpdate(transaction.id, "type", value)}
          disabled={transaction.ignore}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="revenue">Receita</SelectItem>
            <SelectItem value="expense">Despesa</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <SelectCentroCusto
          value={transaction.centroCustoId}
          onChange={(value) => onUpdate(transaction.id, "centroCustoId", value)}
          disabled={transaction.ignore}
          placeholder="Opcional"
        />
      </TableCell>
      <TableCell>
        <Select
          value={transaction.categoriaId}
          onValueChange={(value) => onUpdate(transaction.id, "categoriaId", value)}
          disabled={transaction.ignore}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione..." />
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
    </TableRow>
  );
}
