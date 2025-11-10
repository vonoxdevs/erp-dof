import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Download, TrendingUp, TrendingDown, ArrowRightLeft, Repeat } from "lucide-react";
import { toast } from "sonner";
import { TransactionDialog } from "@/components/transactions/TransactionDialog";
import { RevenueDialog } from "@/components/transactions/RevenueDialog";
import { ExpenseDialog } from "@/components/transactions/ExpenseDialog";
import { TransferDialog } from "@/components/transactions/TransferDialog";
import { RecurringTransactionDialog } from "@/components/transactions/RecurringTransactionDialog";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { sanitizeError } from "@/lib/errorMapping";
import { exportTransactionsToPDF } from "@/lib/exportUtils";

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
  categories?: {
    name: string;
    icon?: string;
    color?: string;
  } | null;
  bank_accounts?: {
    id: string;
    bank_name: string;
    account_number: string;
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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [revenueDialogOpen, setRevenueDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [companyName, setCompanyName] = useState<string>("Minha Empresa");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
    loadTransactions();
  }, []);

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
        console.error('❌ Usuário sem empresa associada');
        toast.error('Complete o cadastro da empresa primeiro');
        setLoading(false);
        return;
      }

      // Buscar nome da empresa
      const { data: company } = await supabase
        .from("companies")
        .select("name")
        .eq("id", profile.company_id)
        .single();

      if (company) setCompanyName(company.name);

      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          categories(name, icon, color),
          bank_account:bank_accounts!bank_account_id(id, bank_name, account_number),
          account_from:bank_accounts!account_from_id(id, bank_name, account_number),
          account_to:bank_accounts!account_to_id(id, bank_name, account_number)
        `)
        .eq("company_id", profile.company_id)
        .order("due_date", { ascending: false });

      if (error) throw error;
      setTransactions((data || []) as Transaction[]);
    } catch (error: any) {
      toast.error(sanitizeError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    // Abrir o dialog correto baseado no tipo da transação
    if (transaction.type === "revenue") {
      setRevenueDialogOpen(true);
    } else if (transaction.type === "expense") {
      setExpenseDialogOpen(true);
    } else if (transaction.type === "transfer") {
      setTransferDialogOpen(true);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta transação?")) return;

    try {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
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

  const handleDialogClose = (refresh?: boolean) => {
    setDialogOpen(false);
    setRevenueDialogOpen(false);
    setExpenseDialogOpen(false);
    setTransferDialogOpen(false);
    setSelectedTransaction(null);
    if (refresh) loadTransactions();
  };

  const handleExport = () => {
    try {
      if (filteredTransactions.length === 0) {
        toast.warning("Não há transações para exportar");
        return;
      }

      exportTransactionsToPDF(filteredTransactions, companyName);
      
      toast.success(`${filteredTransactions.length} transações exportadas em PDF!`);
    } catch (error) {
      console.error('Erro ao exportar transações:', error);
      toast.error("Erro ao exportar transações");
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || t.type === typeFilter;
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || t.category_id === categoryFilter;
    
    return matchesSearch && matchesType && matchesStatus && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Transações</h1>
          <p className="text-muted-foreground">Gerencie todas as transações financeiras</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setRevenueDialogOpen(true)} size="lg" variant="default" className="bg-accent hover:bg-accent/90">
            <TrendingUp className="w-4 h-4 mr-2" />
            Receita
          </Button>
          <Button onClick={() => setExpenseDialogOpen(true)} size="lg" variant="destructive">
            <TrendingDown className="w-4 h-4 mr-2" />
            Despesa
          </Button>
          <Button onClick={() => setTransferDialogOpen(true)} size="lg" variant="outline">
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            Transferência
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 glass">
          <p className="text-sm text-muted-foreground">Total Receitas</p>
          <p className="text-2xl font-bold text-accent">
            R${" "}
            {filteredTransactions
              .filter((t) => t.type === "revenue" && t.status === "paid")
              .reduce((acc, t) => acc + Number(t.amount), 0)
              .toLocaleString("pt-BR")}
          </p>
        </Card>
        <Card className="p-4 glass">
          <p className="text-sm text-muted-foreground">Total Despesas</p>
          <p className="text-2xl font-bold text-destructive">
            R${" "}
            {filteredTransactions
              .filter((t) => t.type === "expense" && t.status === "paid")
              .reduce((acc, t) => acc + Number(t.amount), 0)
              .toLocaleString("pt-BR")}
          </p>
        </Card>
        <Card className="p-4 glass">
          <p className="text-sm text-muted-foreground">Pendentes</p>
          <p className="text-2xl font-bold">
            {filteredTransactions.filter((t) => t.status === "pending").length}
          </p>
        </Card>
        <Card className="p-4 glass">
          <p className="text-sm text-muted-foreground">Vencidas</p>
          <p className="text-2xl font-bold text-warning">
            {filteredTransactions.filter((t) => t.status === "overdue").length}
          </p>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="p-4 glass">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar transações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
        {showFilters && (
          <TransactionFilters
            typeFilter={typeFilter}
            statusFilter={statusFilter}
            categoryFilter={categoryFilter}
            onTypeChange={setTypeFilter}
            onStatusChange={setStatusFilter}
            onCategoryChange={setCategoryFilter}
          />
        )}
      </Card>

      {/* Table */}
      <Card className="glass">
        <TransactionTable
          transactions={filteredTransactions}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </Card>

      {/* Dialogs */}
      <TransactionDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        transaction={selectedTransaction}
      />
      
      <RevenueDialog
        open={revenueDialogOpen}
        onClose={(refresh) => {
          setRevenueDialogOpen(false);
          setSelectedTransaction(null);
          if (refresh) loadTransactions();
        }}
        transaction={selectedTransaction}
      />
      
      <ExpenseDialog
        open={expenseDialogOpen}
        onClose={(refresh) => {
          setExpenseDialogOpen(false);
          setSelectedTransaction(null);
          if (refresh) loadTransactions();
        }}
        transaction={selectedTransaction}
      />
      
      <TransferDialog
        open={transferDialogOpen}
        onClose={(refresh) => {
          setTransferDialogOpen(false);
          setSelectedTransaction(null);
          if (refresh) loadTransactions();
        }}
        transaction={selectedTransaction}
      />
    </div>
  );
};

export default Transactions;
