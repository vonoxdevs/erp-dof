import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, TrendingDown, Calendar, FileDown, Loader2, X } from "lucide-react";
import { getReportData, type ReportData } from "@/services/reportService";
import { ReportCharts } from "@/components/reports/ReportCharts";
import { ReportInsights } from "@/components/reports/ReportInsights";
import { AIReportAnalysis } from "@/components/reports/AIReportAnalysis";
import { GenerateReportButton } from "@/components/reports/GenerateReportButton";
import { HistoricalReportsDialog } from "@/components/reports/HistoricalReportsDialog";
import { exportTransactionsToPDF, convertTransactionsToCSV, downloadCSV } from "@/lib/exportUtils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { DateRange } from "react-day-picker";
import { startOfMonth, endOfMonth, format as formatDate } from "date-fns";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useCategorias } from "@/hooks/useCategorias";

const Reports = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<number>(30);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  const { accounts } = useBankAccounts();
  const { categorias } = useCategorias();

  const loadReportData = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {
        dateRange,
        accountId: selectedAccount !== "all" ? selectedAccount : undefined,
        type: selectedType !== "all" ? selectedType as "revenue" | "expense" : undefined,
        status: selectedStatus !== "all" ? selectedStatus as "pending" | "paid" | "overdue" : undefined,
        categoryId: selectedCategory !== "all" ? selectedCategory : undefined,
      };
      
      const data = await getReportData(selectedPeriod, filters);
      if (!data) {
        setError("Não foi possível carregar os dados do relatório");
        toast.error("Erro ao carregar relatório");
      }
      setReportData(data);
    } catch (err) {
      console.error('Error loading report data:', err);
      setError("Erro ao carregar relatório");
      toast.error("Erro ao carregar relatório");
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setDateRange(undefined);
    setSelectedAccount("all");
    setSelectedType("all");
    setSelectedStatus("all");
    setSelectedCategory("all");
    toast.info("Filtros limpos");
  };

  useEffect(() => {
    const getCompanyId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();
        
        if (profile?.company_id) {
          setCompanyId(profile.company_id);
        }
      }
    };

    getCompanyId();
  }, []);

  useEffect(() => {
    loadReportData();
  }, [selectedPeriod, dateRange, selectedAccount, selectedType, selectedStatus, selectedCategory]);

  // Realtime updates
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel('reports-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `company_id=eq.${companyId}`
        },
        () => {
          console.log('📊 Transação atualizada, recarregando relatório...');
          loadReportData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, selectedPeriod]);

  const handleExportPDF = async () => {
    if (!reportData || !reportData.transactions.length) {
      toast.error("Nenhuma transação para exportar");
      return;
    }
    
    exportTransactionsToPDF(reportData.transactions, "Minha Empresa");
    toast.success("PDF exportado com sucesso!");
  };

  const handleExportCSV = () => {
    if (!reportData || !reportData.transactions.length) {
      toast.error("Nenhuma transação para exportar");
      return;
    }

    const csv = convertTransactionsToCSV(reportData.transactions);
    downloadCSV(csv, `relatorio_${reportData.period.start}_${reportData.period.end}.csv`);
    toast.success("CSV exportado com sucesso!");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    const prefix = value > 0 ? '+' : '';
    return `${prefix}${value.toFixed(1)}%`;
  };

  if (loading && !reportData) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">Análises e relatórios financeiros detalhados</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportPDF} disabled={!reportData?.transactions.length}>
            <FileDown className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
          <Button variant="outline" onClick={handleExportCSV} disabled={!reportData?.transactions.length}>
            <FileDown className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
          <GenerateReportButton />
          <HistoricalReportsDialog />
        </div>
      </div>

      {/* Filtros */}
      <Card className="p-6 glass">
        <h3 className="text-lg font-semibold mb-4">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Data Range */}
          <div className="space-y-2">
            <Label>Período</Label>
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />
          </div>

          {/* Conta Bancária */}
          <div className="space-y-2">
            <Label>Conta</Label>
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as contas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as contas</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.bank_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="revenue">Receitas</SelectItem>
                <SelectItem value="expense">Despesas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="overdue">Vencido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categorias
                  .filter(cat => cat.ativo)
                  .map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.nome}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Botão limpar filtros */}
        <div className="mt-4">
          <Button variant="outline" onClick={handleClearFilters} size="sm">
            <X className="w-4 h-4 mr-2" />
            Limpar Filtros
          </Button>
        </div>
      </Card>

      <Tabs value={selectedPeriod.toString()} onValueChange={(v) => setSelectedPeriod(Number(v))}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="7">7 dias</TabsTrigger>
          <TabsTrigger value="15">15 dias</TabsTrigger>
          <TabsTrigger value="30">30 dias</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedPeriod.toString()} className="space-y-6 mt-6">
          {error && (
            <Card className="p-6 glass border-destructive">
              <p className="text-destructive font-semibold">⚠️ {error}</p>
            </Card>
          )}
          
          {reportData && (
            <>
              {/* Cards de Resumo */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-6 glass">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground">Receitas do Período</p>
                      <p className="text-2xl font-bold truncate">{formatCurrency(reportData.summary.totalRevenue)}</p>
                      {reportData.trends.revenueGrowth !== 0 && (
                        <p className={`text-xs ${reportData.trends.revenueGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {formatPercentage(reportData.trends.revenueGrowth)} vs período anterior
                        </p>
                      )}
                    </div>
                  </div>
                </Card>

                <Card className="p-6 glass">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-destructive/10 rounded-lg">
                      <TrendingDown className="w-6 h-6 text-destructive" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground">Despesas do Período</p>
                      <p className="text-2xl font-bold truncate">{formatCurrency(reportData.summary.totalExpenses)}</p>
                      {reportData.trends.expenseGrowth !== 0 && (
                        <p className={`text-xs ${reportData.trends.expenseGrowth > 0 ? 'text-red-500' : 'text-green-500'}`}>
                          {formatPercentage(reportData.trends.expenseGrowth)} vs período anterior
                        </p>
                      )}
                    </div>
                  </div>
                </Card>

                <Card className="p-6 glass">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${reportData.summary.balance >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      <DollarSign className={`w-6 h-6 ${reportData.summary.balance >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground">Saldo do Período</p>
                      <p className={`text-2xl font-bold truncate ${reportData.summary.balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {formatCurrency(reportData.summary.balance)}
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 glass">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground">Transações</p>
                      <p className="text-2xl font-bold">{reportData.summary.transactionCount}</p>
                      <p className="text-xs text-muted-foreground">
                        Ticket médio: {formatCurrency(reportData.summary.averageTicket)}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Insights */}
              <ReportInsights data={reportData} />

              {/* Análise com IA */}
              <AIReportAnalysis reportData={reportData} />

              {/* Gráficos */}
              {reportData.breakdown.dailyFlow.length > 0 && (
                <ReportCharts
                  dailyFlow={reportData.breakdown.dailyFlow}
                  revenueByCategory={reportData.breakdown.revenueByCategory}
                  expensesByCategory={reportData.breakdown.expensesByCategory}
                  topCategories={reportData.breakdown.topCategories}
                />
              )}

              {/* Mensagem se não houver dados */}
              {reportData.breakdown.dailyFlow.length === 0 && (
                <Card className="p-8 glass text-center">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">Nenhuma transação no período</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Não há transações registradas para o período selecionado. 
                    Crie transações para visualizar os gráficos e análises.
                  </p>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
