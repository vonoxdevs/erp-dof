import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, Search, HelpCircle, ChevronDown, ArrowUpRight, ArrowDownRight, ArrowRightLeft, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { RevenueDialog } from "@/components/transactions/RevenueDialog";
import { ExpenseDialog } from "@/components/transactions/ExpenseDialog";
import { TransferDialog } from "@/components/transactions/TransferDialog";
import { DeleteRecurringDialog } from "@/components/transactions/DeleteRecurringDialog";
import { BulkEditRecurringDialog } from "@/components/transactions/BulkEditRecurringDialog";
import { ImportStatementAIDialog } from "@/components/bank-accounts/ImportStatementAIDialog";
import { AddByTextDialog } from "@/components/transactions/AddByTextDialog";
import { ReceiptDialog } from "@/components/transactions/ReceiptDialog";
import { sanitizeError } from "@/lib/errorMapping";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import type { DateRange } from "react-day-picker";
import { toSaoPauloTime } from '@/lib/dateUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { usePendingTransactions } from "@/hooks/usePendingTransactions";
import { MultiSelectAccounts } from "@/components/shared/MultiSelectAccounts";

interface Transaction {
  id: string;
  company_id: string;
  type: "revenue" | "expense" | "transfer";
  amount: number;
  description: string;
  due_date: string;
  payment_date: string | null;
  status: "pending" | "paid" | "overdue" | "cancelled";
  category_id: string | null;
  bank_account_id: string | null;
  contact_id: string | null;
  created_at: string;
  account_from_id?: string | null;
  account_to_id?: string | null;
  is_recurring?: boolean;
  reference_number?: string | null;
  contract_id?: string | null;
  centro_custo_id?: string | null;
  categoria_receita_id?: string | null;
  categoria_despesa_id?: string | null;
  categories?: {
    name: string;
    icon?: string;
    color?: string;
  } | null;
  centro_custo?: {
    id: string;
    nome: string;
    cor?: string;
    icon?: string;
  } | null;
  categoria_receita?: {
    id: string;
    nome: string;
    cor?: string;
    icon?: string;
  } | null;
  categoria_despesa?: {
    id: string;
    nome: string;
    cor?: string;
    icon?: string;
  } | null;
  bank_account?: {
    id: string;
    bank_name: string;
    account_number: string;
  } | null;
  account_from?: {
    id: string;
    bank_name: string;
    account_number: string;
  } | null;
  account_to?: {
    id: string;
    bank_name: string;
    account_number: string;
  } | null;
}

const Transactions = () => {
  const queryClient = useQueryClient();
  const { accounts, totalBalance } = useBankAccounts();
  const { pendingBalances } = usePendingTransactions();
  const [searchParams, setSearchParams] = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string>(searchParams.get("type") || "all");
  const [selectedStatus, setSelectedStatus] = useState<string>(searchParams.get("status") || "all");
  const [currentPeriod, setCurrentPeriod] = useState(new Date());
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [revenueDialogOpen, setRevenueDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [bulkRecurringDialogOpen, setBulkRecurringDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<"delete" | "markAsPaid">("delete");
  const [importAIDialogOpen, setImportAIDialogOpen] = useState(false);
  const [addByTextDialogOpen, setAddByTextDialogOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [transactionForReceipt, setTransactionForReceipt] = useState<Transaction | null>(null);

  // Sincronização em tempo real
  useRealtimeSync(
    ['transactions', 'bank_accounts', 'contracts'],
    [['transactions'], ['bank-accounts']]
  );

  // Aplicar filtros da URL ao carregar
  useEffect(() => {
    const typeParam = searchParams.get("type");
    const statusParam = searchParams.get("status");
    
    if (typeParam) {
      setSelectedType(typeParam);
    }
    if (statusParam) {
      setSelectedStatus(statusParam);
    }
    
    // Limpar params após aplicar para não manter na URL
    if (typeParam || statusParam) {
      setSearchParams({});
    }
  }, []);

  useEffect(() => {
    loadTransactions();
    generateRecurringTransactions();
  }, [currentPeriod, selectedAccounts, dateRange]);

  const generateRecurringTransactions = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-recurring-transactions');
      
      if (error) {
        console.error('Erro ao gerar transações recorrentes:', error);
        return;
      }
      
      if (data?.count > 0) {
        console.log('Transações recorrentes geradas:', data);
        // Recarregar transações
        loadTransactions();
      }
    } catch (error) {
      console.error('Erro ao chamar função de geração:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile || !profile.company_id) {
        toast.error('Complete o cadastro da empresa primeiro');
        setLoading(false);
        return;
      }

      const startDate = format(dateRange?.from || startOfMonth(currentPeriod), 'yyyy-MM-dd');
      const endDate = format(dateRange?.to || endOfMonth(currentPeriod), 'yyyy-MM-dd');

      let query = supabase
        .from("transactions")
        .select(`
          *,
          categories(name, icon, color),
          centro_custo:categorias!centro_custo_id(id, nome, cor, icon),
          categoria_receita:categorias!categoria_receita_id(id, nome, cor, icon),
          categoria_despesa:categorias!categoria_despesa_id(id, nome, cor, icon),
          contact:contacts(name, document),
          bank_account:bank_accounts!transactions_bank_account_id_fkey(id, bank_name, account_number, agency_number, holder_name, holder_document),
          account_from:bank_accounts!transactions_account_from_id_fkey(id, bank_name, account_number, agency_number, holder_name, holder_document),
          account_to:bank_accounts!transactions_account_to_id_fkey(id, bank_name, account_number, agency_number, holder_name, holder_document)
        `)
        .eq("company_id", profile.company_id)
        .is("deleted_at", null)
        .gte("due_date", startDate)
        .lte("due_date", endDate)
        .order("due_date", { ascending: false });

      // Filtro por contas selecionadas (multi-select)
      if (selectedAccounts.length > 0) {
        const accountFilters = selectedAccounts.map(accountId => 
          `bank_account_id.eq.${accountId},account_from_id.eq.${accountId},account_to_id.eq.${accountId}`
        ).join(',');
        query = query.or(accountFilters);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Log para debug: verificar se contract_id está vindo
      console.log('Transações carregadas:', data?.slice(0, 3).map(t => ({
        id: t.id,
        description: t.description,
        contract_id: t.contract_id,
        is_recurring: t.is_recurring
      })));
      
      setTransactions((data || []) as Transaction[]);
    } catch (error: any) {
      toast.error(sanitizeError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    const transactionToEdit = {
      ...transaction,
      // Mapear os campos corretamente para os diálogos
      bank_account_id: transaction.type === 'revenue' 
        ? transaction.account_to_id 
        : transaction.account_from_id,
      centro_custo_id: transaction.centro_custo_id || null,
      categoria_receita_id: transaction.categoria_receita_id || null,
      categoria_despesa_id: transaction.categoria_despesa_id || null,
    };
    
    setSelectedTransaction(transactionToEdit as any);
    if (transaction.type === "revenue") {
      setRevenueDialogOpen(true);
    } else if (transaction.type === "expense") {
      setExpenseDialogOpen(true);
    } else if (transaction.type === "transfer") {
      setTransferDialogOpen(true);
    }
  };

  const handleEmitReceipt = (transaction: Transaction) => {
    if (!['paid', 'pending', 'overdue'].includes(transaction.status || '')) {
      toast.error('Apenas transações pagas, pendentes ou vencidas podem gerar recibo');
      return;
    }
    setTransactionForReceipt(transaction);
    setReceiptDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;
    
    // Log para debug
    console.log('Excluindo transação:', {
      id: transaction.id,
      description: transaction.description,
      is_recurring: transaction.is_recurring,
      contract_id: transaction.contract_id,
      reference_number: transaction.reference_number
    });
    
    setTransactionToDelete(transaction);
    setDeleteDialogOpen(true);
  };

  const handleDeleteOne = async () => {
    if (!transactionToDelete) return;

    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transactionToDelete.id);
        
      if (error) throw error;
      
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bank-accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['pending-transactions'] })
      ]);
      
      toast.success("Transação excluída com sucesso!");
      loadTransactions();
    } catch (error: any) {
      toast.error(sanitizeError(error));
    }
  };

  const handleDeleteAll = async () => {
    if (!transactionToDelete) return;

    try {
      // Se tem contract_id, excluir todas as transações desse contrato
      if (transactionToDelete.contract_id) {
        const { error } = await supabase
          .from("transactions")
          .delete()
          .eq("contract_id", transactionToDelete.contract_id);
          
        if (error) throw error;
        
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['bank-accounts'] }),
          queryClient.invalidateQueries({ queryKey: ['pending-transactions'] })
        ]);
        
        toast.success("Todas as parcelas do contrato foram excluídas!");
        loadTransactions();
        return;
      }

      // Se é a transação original (is_recurring = true), excluir por reference_number
      // Se é uma gerada (reference_number não null), excluir por reference_number
      const referenceId = transactionToDelete.is_recurring 
        ? transactionToDelete.id 
        : transactionToDelete.reference_number;

      if (!referenceId) {
        // Se não tem reference, é uma transação única
        handleDeleteOne();
        return;
      }

      // Excluir a original e todas as geradas
      const { error } = await supabase
        .from("transactions")
        .delete()
        .or(`id.eq.${referenceId},reference_number.eq.${referenceId}`);
        
      if (error) throw error;
      
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bank-accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['pending-transactions'] })
      ]);
      
      toast.success("Todas as recorrências foram excluídas!");
      loadTransactions();
    } catch (error: any) {
      toast.error(sanitizeError(error));
    }
  };

  const handleDeleteFromThis = async () => {
    if (!transactionToDelete) return;

    try {
      // Se tem contract_id, excluir desta parcela em diante do contrato
      if (transactionToDelete.contract_id) {
        const { error } = await supabase
          .from("transactions")
          .delete()
          .eq("contract_id", transactionToDelete.contract_id)
          .gte("due_date", transactionToDelete.due_date);
          
        if (error) throw error;
        
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['bank-accounts'] }),
          queryClient.invalidateQueries({ queryKey: ['pending-transactions'] })
        ]);
        
        toast.success("Parcelas futuras do contrato excluídas com sucesso!");
        loadTransactions();
        return;
      }

      const referenceId = transactionToDelete.is_recurring 
        ? transactionToDelete.id 
        : transactionToDelete.reference_number;

      if (!referenceId) {
        handleDeleteOne();
        return;
      }

      // Excluir esta e todas as futuras (com due_date >= data desta)
      const { error } = await supabase
        .from("transactions")
        .delete()
        .or(`id.eq.${referenceId},reference_number.eq.${referenceId}`)
        .gte("due_date", transactionToDelete.due_date);
        
      if (error) throw error;
      
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bank-accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['pending-transactions'] })
      ]);
      
      toast.success("Transações futuras excluídas com sucesso!");
      loadTransactions();
    } catch (error: any) {
      toast.error(sanitizeError(error));
    }
  };

  const handleBulkMarkAsPaid = async () => {
    // Verificar se alguma das transações selecionadas é recorrente
    const selectedTransactions = transactions.filter(t => selectedIds.includes(t.id));
    const hasRecurring = selectedTransactions.some(t => t.is_recurring || t.contract_id);

    if (hasRecurring) {
      setBulkAction("markAsPaid");
      setBulkRecurringDialogOpen(true);
      return;
    }

    // Se não tem recorrentes, executa normalmente
    executeBulkMarkAsPaid(selectedIds);
  };

  const executeBulkMarkAsPaid = async (ids: string[]) => {
    try {
      const { error } = await supabase
        .from("transactions")
        .update({ status: 'paid', payment_date: new Date().toISOString().split('T')[0] })
        .in('id', ids);
        
      if (error) throw error;
      
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bank-accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['pending-transactions'] })
      ]);
      
      toast.success(`${ids.length} transação(ões) marcada(s) como paga(s)!`);
      setSelectedIds([]);
      loadTransactions();
    } catch (error: any) {
      toast.error(sanitizeError(error));
    }
  };

  const handleBulkDelete = async () => {
    // Verificar se alguma das transações selecionadas é recorrente
    const selectedTransactions = transactions.filter(t => selectedIds.includes(t.id));
    const hasRecurring = selectedTransactions.some(t => t.is_recurring || t.contract_id);

    if (hasRecurring) {
      setBulkAction("delete");
      setBulkRecurringDialogOpen(true);
      return;
    }

    // Se não tem recorrentes, executa normalmente
    executeBulkDelete(selectedIds);
  };

  const executeBulkDelete = async (ids: string[]) => {
    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .in('id', ids);
        
      if (error) throw error;
      
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bank-accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['pending-transactions'] })
      ]);
      
      toast.success(`${ids.length} transação(ões) excluída(s)!`);
      setSelectedIds([]);
      loadTransactions();
    } catch (error: any) {
      toast.error(sanitizeError(error));
    }
  };

  const handleBulkEditSelected = async () => {
    if (bulkAction === "delete") {
      await executeBulkDelete(selectedIds);
    } else {
      await executeBulkMarkAsPaid(selectedIds);
    }
  };

  const handleBulkEditAll = async () => {
    try {
      const selectedTransactions = transactions.filter(t => selectedIds.includes(t.id));
      const contractIds = [...new Set(selectedTransactions
        .map(t => t.contract_id)
        .filter(Boolean))] as string[];

      if (contractIds.length === 0) {
        handleBulkEditSelected();
        return;
      }

      // Buscar todas as transações das séries recorrentes
      const { data: allRecurringTransactions, error: fetchError } = await supabase
        .from("transactions")
        .select("id")
        .in("contract_id", contractIds);

      if (fetchError) throw fetchError;

      const allIds = allRecurringTransactions?.map(t => t.id) || [];

      if (bulkAction === "delete") {
        await executeBulkDelete(allIds);
      } else {
        await executeBulkMarkAsPaid(allIds);
      }
    } catch (error: any) {
      toast.error(sanitizeError(error));
    }
  };

  const handleBulkEditFromThis = async () => {
    try {
      const selectedTransactions = transactions.filter(t => selectedIds.includes(t.id));
      const minDate = selectedTransactions.reduce((min, t) => 
        t.due_date < min ? t.due_date : min, 
        selectedTransactions[0].due_date
      );

      const contractIds = [...new Set(selectedTransactions
        .map(t => t.contract_id)
        .filter(Boolean))] as string[];

      if (contractIds.length === 0) {
        handleBulkEditSelected();
        return;
      }

      // Buscar todas as transações futuras das séries recorrentes
      const { data: futureTransactions, error: fetchError } = await supabase
        .from("transactions")
        .select("id")
        .in("contract_id", contractIds)
        .gte("due_date", minDate);

      if (fetchError) throw fetchError;

      const futureIds = futureTransactions?.map(t => t.id) || [];

      if (bulkAction === "delete") {
        await executeBulkDelete(futureIds);
      } else {
        await executeBulkMarkAsPaid(futureIds);
      }
    } catch (error: any) {
      toast.error(sanitizeError(error));
    }
  };

  const handleDialogClose = (refresh?: boolean) => {
    setRevenueDialogOpen(false);
    setExpenseDialogOpen(false);
    setTransferDialogOpen(false);
    setSelectedTransaction(null);
    if (refresh) loadTransactions();
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedAccounts([]);
    setSelectedType("all");
    setSelectedStatus("all");
    setCurrentPeriod(new Date());
    setDateRange({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    });
    toast.info("Filtros limpos");
  };

  // Filtros para tabela (aplicam search, tipo e status)
  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "all" || t.type === selectedType;
    const matchesStatus = selectedStatus === "all" || t.status === selectedStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Calcular resumos usando transactions (sem filtros de tipo/status)
  // Isso garante que os cards mostrem os totais corretos do período
  const receitasAbertas = transactions
    .filter((t) => t.type === "revenue" && (t.status === "pending" || t.status === "overdue"))
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const receitasRealizadas = transactions
    .filter((t) => t.type === "revenue" && t.status === "paid")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const despesasAbertas = transactions
    .filter((t) => t.type === "expense" && (t.status === "pending" || t.status === "overdue"))
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const despesasRealizadas = transactions
    .filter((t) => t.type === "expense" && t.status === "paid")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalPeriodo = receitasRealizadas - despesasRealizadas;
  
  // Calcular saldo previsto do período (saldo atual + pendentes do período)
  const saldoPrevistoPeriodo = totalBalance + receitasAbertas - despesasAbertas;

  // Calcular saldo acumulado para a tabela (usa filteredTransactions)
  const transactionsWithBalance = filteredTransactions.map((transaction, index) => {
    const previousTransactions = filteredTransactions.slice(index + 1);
    const balance = previousTransactions.reduce((acc, t) => {
      if (t.type === "revenue") return acc + Number(t.amount);
      if (t.type === "expense") return acc - Number(t.amount);
      return acc;
    }, 0) + (transaction.type === "revenue" ? Number(transaction.amount) : -Number(transaction.amount));
    
    return { ...transaction, balance };
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-accent text-accent-foreground">Pago</Badge>;
      case "overdue":
        return <Badge variant="destructive">Vencido</Badge>;
      case "cancelled":
        return <Badge variant="outline">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "revenue":
        return <ArrowUpRight className="w-4 h-4 text-accent" />;
      case "expense":
        return <ArrowDownRight className="w-4 h-4 text-destructive" />;
      case "transfer":
        return <ArrowRightLeft className="w-4 h-4 text-primary" />;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "revenue":
        return "Receita";
      case "expense":
        return "Despesa";
      case "transfer":
        return "Transferência";
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      {/* Header com ações */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Transações</h1>
          <p className="text-muted-foreground">Controle financeiro detalhado</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="lg" className="bg-accent hover:bg-accent/90">
              Nova <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setRevenueDialogOpen(true)}>
              Receita
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setExpenseDialogOpen(true)}>
              Despesa
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTransferDialogOpen(true)}>
              Transferência
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setImportAIDialogOpen(true)}>
              Importar Extrato com IA
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setAddByTextDialogOpen(true)}>
              Adicionar por Texto (IA)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end">
          {/* Filtro de Mês/Ano */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Mês/Ano</label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  const newPeriod = subMonths(currentPeriod, 1);
                  setCurrentPeriod(newPeriod);
                  setDateRange({
                    from: startOfMonth(newPeriod),
                    to: endOfMonth(newPeriod),
                  });
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 text-center font-medium text-primary text-sm">
                {format(currentPeriod, "MMM/yy", { locale: ptBR })}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  const newPeriod = addMonths(currentPeriod, 1);
                  setCurrentPeriod(newPeriod);
                  setDateRange({
                    from: startOfMonth(newPeriod),
                    to: endOfMonth(newPeriod),
                  });
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Filtro de Período Personalizado */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Período Personalizado</label>
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={(range) => {
                setDateRange(range);
                // Atualiza o currentPeriod baseado na data inicial do range
                if (range?.from) {
                  setCurrentPeriod(range.from);
                }
              }}
            />
          </div>

          {/* Pesquisar */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Pesquisar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar"
                className="pl-9"
              />
            </div>
          </div>

          {/* Tipo de Transação */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo</label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="revenue">Receita</SelectItem>
                <SelectItem value="expense">Despesa</SelectItem>
                <SelectItem value="transfer">Transferência</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="overdue">Vencido</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Conta */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Conta</label>
            <MultiSelectAccounts
              accounts={accounts}
              selectedAccounts={selectedAccounts}
              onSelectionChange={setSelectedAccounts}
              placeholder="Selecionar contas"
            />
          </div>

          {/* Limpar filtros */}
          <div className="flex items-end">
            <Button variant="link" onClick={handleClearFilters} className="text-primary">
              Limpar filtros
            </Button>
          </div>
        </div>
      </Card>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-2">Receitas em aberto (R$)</p>
          <p className="text-2xl font-bold text-orange-500">
            {formatCurrency(receitasAbertas)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-2">Receitas realizadas (R$)</p>
          <p className="text-2xl font-bold text-accent">
            {formatCurrency(receitasRealizadas)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-2">Despesas em aberto (R$)</p>
          <p className="text-2xl font-bold text-orange-500">
            {formatCurrency(despesasAbertas)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-2">Despesas realizadas (R$)</p>
          <p className="text-2xl font-bold text-destructive">
            {formatCurrency(despesasRealizadas)}
          </p>
        </Card>
        <Card className="p-4 border-primary/50">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-sm text-muted-foreground">Saldo Previsto (R$)</p>
            <HelpCircle className="h-3 w-3 text-muted-foreground" />
          </div>
          <p className={cn(
            "text-2xl font-bold flex items-center gap-1",
            saldoPrevistoPeriodo >= 0 ? "text-primary" : "text-destructive"
          )}>
            <TrendingUp className="h-5 w-5" />
            {formatCurrency(saldoPrevistoPeriodo)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Período selecionado
          </p>
        </Card>
        <Card className="p-4 border-primary/50">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-sm text-muted-foreground">Total do período (R$)</p>
            <HelpCircle className="h-3 w-3 text-muted-foreground" />
          </div>
          <p className={cn(
            "text-2xl font-bold",
            totalPeriodo >= 0 ? "text-accent" : "text-destructive"
          )}>
            {formatCurrency(totalPeriodo)}
          </p>
        </Card>
      </div>

      {/* Ações em lote */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
          <span className="text-sm">{selectedIds.length} registro(s) selecionado(s)</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Ações em lote <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleBulkMarkAsPaid}>Marcar como pago</DropdownMenuItem>
              <DropdownMenuItem onClick={handleBulkDelete} className="text-destructive">
                Excluir selecionados
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Tabela de transações */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="border-b">
                <th className="p-3 text-left">
                  <Checkbox
                    checked={selectedIds.length === filteredTransactions.length}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedIds(filteredTransactions.map(t => t.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                  />
                </th>
                <th className="p-3 text-left text-sm font-medium">Data</th>
                <th className="p-3 text-left text-sm font-medium">Tipo</th>
                <th className="p-3 text-left text-sm font-medium">Descrição</th>
                <th className="p-3 text-left text-sm font-medium">Situação</th>
                <th className="p-3 text-right text-sm font-medium">Valor (R$)</th>
                <th className="p-3 text-right text-sm font-medium flex items-center justify-end gap-1">
                  Saldo (R$)
                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                </th>
                <th className="p-3 text-center text-sm font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {transactionsWithBalance.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-muted-foreground">
                    Nenhuma transação encontrada neste período
                  </td>
                </tr>
              ) : (
                transactionsWithBalance.map((transaction) => (
                  <tr key={transaction.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <Checkbox
                        checked={selectedIds.includes(transaction.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedIds([...selectedIds, transaction.id]);
                          } else {
                            setSelectedIds(selectedIds.filter(id => id !== transaction.id));
                          }
                        }}
                      />
                    </td>
                    <td className="p-3 text-sm">
                      {format(toSaoPauloTime(transaction.due_date), "dd/MM/yyyy", { locale: ptBR })}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(transaction.type)}
                        <span className="text-sm font-medium">{getTypeLabel(transaction.type)}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div>
                        <p className="font-medium text-sm">{transaction.description}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {/* Badge de Contrato */}
                          {transaction.contract_id && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 font-medium border border-purple-500/20">
                              📋 Contrato
                            </span>
                          )}
                          
                          {/* Conta Bancária */}
                          {transaction.type === 'transfer' ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              🏦 {transaction.account_from?.bank_name || 'Conta origem'} → {transaction.account_to?.bank_name || 'Conta destino'}
                            </span>
                          ) : transaction.type === 'revenue' ? (
                            transaction.account_to && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                🏦 {transaction.account_to.bank_name}
                              </span>
                            )
                          ) : transaction.type === 'expense' ? (
                            transaction.account_from && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                🏦 {transaction.account_from.bank_name}
                              </span>
                            )
                          ) : transaction.bank_account && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              🏦 {transaction.bank_account.bank_name}
                            </span>
                          )}
                          
                          {/* Centro de Custo */}
                          {transaction.centro_custo && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                              {transaction.centro_custo.icon} {transaction.centro_custo.nome}
                            </span>
                          )}
                          
                          {/* Categoria de Receita */}
                          {transaction.type === 'revenue' && transaction.categoria_receita && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                              {transaction.categoria_receita.icon} {transaction.categoria_receita.nome}
                            </span>
                          )}
                          
                          {/* Categoria de Despesa */}
                          {transaction.type === 'expense' && transaction.categoria_despesa && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                              {transaction.categoria_despesa.icon} {transaction.categoria_despesa.nome}
                            </span>
                          )}
                          
                          {/* Categoria antiga (fallback) */}
                          {transaction.categories && !transaction.centro_custo && !transaction.categoria_receita && !transaction.categoria_despesa && (
                            <span className="text-xs text-muted-foreground">
                              {transaction.categories.icon} {transaction.categories.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      {getStatusBadge(transaction.status)}
                    </td>
                    <td className="p-3 text-right">
                      <span className={cn(
                        "font-semibold",
                        transaction.type === "revenue" ? "text-accent" : "text-destructive"
                      )}>
                        {transaction.type === "revenue" ? "+" : "-"}{formatCurrency(Number(transaction.amount))}
                      </span>
                    </td>
                    <td className="p-3 text-right font-medium">
                      <span className={cn(
                        transaction.balance >= 0 ? "text-accent" : "text-destructive"
                      )}>
                        {formatCurrency(transaction.balance)}
                      </span>
                    </td>
                    <td className="p-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            Ações <ChevronDown className="ml-1 h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {["paid", "pending", "overdue"].includes(transaction.status || "") && (
                            <DropdownMenuItem onClick={() => handleEmitReceipt(transaction)}>
                              Emitir Recibo
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleEdit(transaction)}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(transaction.id)} className="text-destructive">
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Dialogs */}
      <RevenueDialog
        open={revenueDialogOpen}
        onClose={handleDialogClose}
        transaction={selectedTransaction}
      />
      <ExpenseDialog
        open={expenseDialogOpen}
        onClose={handleDialogClose}
        transaction={selectedTransaction}
      />
      <TransferDialog
        open={transferDialogOpen}
        onClose={handleDialogClose}
        transaction={selectedTransaction}
      />
      <DeleteRecurringDialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setTransactionToDelete(null);
        }}
        onDeleteOne={handleDeleteOne}
        onDeleteAll={handleDeleteAll}
        onDeleteFromThis={handleDeleteFromThis}
        isRecurring={transactionToDelete?.is_recurring || !!transactionToDelete?.contract_id}
        hasRecurrences={!!transactionToDelete?.reference_number || transactionToDelete?.is_recurring || !!transactionToDelete?.contract_id}
      />
      <BulkEditRecurringDialog
        open={bulkRecurringDialogOpen}
        onClose={() => setBulkRecurringDialogOpen(false)}
        onEditSelected={handleBulkEditSelected}
        onEditAll={handleBulkEditAll}
        onEditFromThis={handleBulkEditFromThis}
        hasRecurring={true}
        action={bulkAction}
      />
      <ImportStatementAIDialog
        open={importAIDialogOpen}
        onClose={() => setImportAIDialogOpen(false)}
        onImportComplete={loadTransactions}
      />
      <AddByTextDialog
        open={addByTextDialogOpen}
        onOpenChange={setAddByTextDialogOpen}
        onSuccess={loadTransactions}
      />
      <ReceiptDialog
        open={receiptDialogOpen}
        onClose={() => {
          setReceiptDialogOpen(false);
          setTransactionForReceipt(null);
        }}
        transaction={transactionForReceipt}
      />
    </div>
  );
};

export default Transactions;
