import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Download } from "lucide-react";
import { toast } from "sonner";
import { TransactionDialog } from "@/components/transactions/TransactionDialog";
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
}

const Transactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
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
          categories(name, icon, color)
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
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta transação?")) return;

    try {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
      toast.success("Transação excluída com sucesso!");
      loadTransactions();
    } catch (error: any) {
      toast.error(sanitizeError(error));
    }
  };

  const handleDialogClose = (refresh?: boolean) => {
    setDialogOpen(false);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transações</h1>
          <p className="text-muted-foreground">Gerencie todas as transações financeiras</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="lg">
          <Plus className="w-4 h-4 mr-2" />
          Nova Transação
        </Button>
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

      {/* Dialog */}
      <TransactionDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        transaction={selectedTransaction}
      />
    </div>
  );
};

export default Transactions;
