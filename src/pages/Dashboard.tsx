import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight, Clock, ChevronLeft, ChevronRight, Search, Calendar, Receipt, Building2, FileText } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { Link } from "react-router-dom";
import { AccountsBalance } from "@/components/dashboard/AccountsBalance";
import { BudgetForecast } from "@/components/dashboard/BudgetForecast";
import { PendingAlerts } from "@/components/dashboard/PendingAlerts";
import { RevenueExpenseChart } from "@/components/dashboard/RevenueExpenseChart";
import { CategoryPieChart } from "@/components/dashboard/CategoryPieChart";
import { CashFlowChart } from "@/components/dashboard/CashFlowChart";
import { format, eachDayOfInterval, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import type { DateRange } from "react-day-picker";
const Dashboard = () => {
  const navigate = useNavigate();
  const { accounts } = useBankAccounts();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [currentPeriod, setCurrentPeriod] = useState(new Date());
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [stats, setStats] = useState({
    totalBalance: 0,
    monthlyRevenue: 0,
    monthlyExpenses: 0,
    pendingCount: 0,
    overdueCount: 0,
    pendingRevenue: 0,
    futureRevenue: 0,
    futureExpenses: 0,
    projectedBalance: 0
  });
  const [overdueTransactions, setOverdueTransactions] = useState<{
    revenues: any[];
    expenses: any[];
  }>({ revenues: [], expenses: [] });
  const [chartData, setChartData] = useState<{
    revenueExpense: any[];
    revenueByCategory: any[];
    expenseByCategory: any[];
    cashFlow: any[];
  }>({
    revenueExpense: [],
    revenueByCategory: [],
    expenseByCategory: [],
    cashFlow: [],
  });
  useEffect(() => {
    let mounted = true;
    
    const initDashboard = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate("/auth");
          return;
        }
        
        if (!mounted) return;
        
        setUser(session.user);
        console.log('📊 Iniciando carregamento do dashboard...');
        
        // Carregar stats primeiro (importante)
        await loadStats();
        
        if (!mounted) return;
        
        // Gerar transações automáticas em background (não bloqueia)
        generateAutomaticTransactions().catch(err => 
          console.warn('⚠️ Erro background em transações automáticas:', err)
        );
        
        setLoading(false);
        console.log('✅ Dashboard carregado');
      } catch (error) {
        console.error('❌ Erro ao inicializar dashboard:', error);
        // Mesmo com erro, tenta mostrar o dashboard
        setLoading(false);
        toast.error('Erro ao carregar alguns dados');
      }
    };
    
    initDashboard();
    
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        navigate("/auth");
      } else if (session && mounted) {
        setUser(session.user);
      }
    });

    // Configurar realtime para atualizações automáticas
    const realtimeChannel = supabase
      .channel('dashboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions'
        },
        () => {
          loadStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bank_accounts'
        },
        () => {
          loadStats();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      subscription.unsubscribe();
      supabase.removeChannel(realtimeChannel);
    };
  }, [navigate]);

  // Recarregar stats quando filtros mudarem
  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [dateRange, selectedAccount]);

  const generateAutomaticTransactions = async () => {
    try {
      console.log('🔄 Iniciando geração automática de transações...');
      
      // Timeout de 5 segundos para cada função
      const timeout = (ms: number) => new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), ms)
      );

      // Gerar parcelas de contratos com timeout
      try {
        await Promise.race([
          supabase.functions.invoke('generate-contract-transactions'),
          timeout(5000)
        ]);
        console.log('✅ Contratos processados');
      } catch (error) {
        console.warn('⚠️ Timeout ou erro ao gerar contratos:', error);
        // Continua mesmo com erro
      }

      // Gerar transações recorrentes com timeout
      try {
        await Promise.race([
          supabase.functions.invoke('generate-recurring-transactions'),
          timeout(5000)
        ]);
        console.log('✅ Recorrências processadas');
      } catch (error) {
        console.warn('⚠️ Timeout ou erro ao gerar recorrências:', error);
        // Continua mesmo com erro
      }
      
      console.log('✅ Geração automática concluída');
    } catch (error) {
      console.error('❌ Erro ao gerar transações automáticas:', error);
      // Não bloqueia o carregamento do dashboard
    }
  };
  const loadStats = async () => {
    try {
      console.log('📊 [v2] Carregando estatísticas...');
      
      // Timeout de 10 segundos
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout ao carregar stats')), 10000)
      );
      
      const loadData = async () => {
        const {
          data: {
            user
          }
        } = await supabase.auth.getUser();
        if (!user) return;
        
        const {
          data: profile
        } = await supabase.from("user_profiles").select("company_id").eq("id", user.id).single();
        if (!profile || !profile.company_id) {
          console.error('❌ Usuário sem empresa associada');
          toast.error('Complete o cadastro da empresa primeiro');
          return;
        }
        
        return { user, profile };
      };
      
      const result = await Promise.race([loadData(), timeout]) as any;
      if (!result) return;
      
      const { user, profile } = result;

      // Calcular datas baseado no período selecionado (date range ou mês atual)
      const startDate = dateRange?.from || startOfMonth(currentPeriod);
      const endDate = dateRange?.to || endOfMonth(currentPeriod);
      const dateFilter = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];

      // Load transactions do período selecionado
      let transactionsQuery = supabase
        .from("transactions")
        .select("*")
        .eq("company_id", profile.company_id)
        .gte("due_date", startDate.toISOString())
        .lte("due_date", endDate.toISOString());

      if (selectedAccount !== "all") {
        transactionsQuery = transactionsQuery.or(`bank_account_id.eq.${selectedAccount},account_from_id.eq.${selectedAccount},account_to_id.eq.${selectedAccount}`);
      }

      const { data: recentTransactions } = await transactionsQuery;

      if (recentTransactions) {
        // ==========================================
        // LÓGICA REFATORADA: Baseada nos filtros do dashboard
        // ==========================================
        
        const today = new Date().toISOString().split('T')[0];
        
        // 1. RECEITAS REALIZADAS (receitas pagas com payment_date no período filtrado)
        const receitasRealizadas = recentTransactions
          .filter(t => 
            t.type === "revenue" && 
            t.status === "paid" &&
            t.due_date >= startDate.toISOString().split('T')[0] &&
            t.due_date <= endDate.toISOString().split('T')[0]
          )
          .reduce((sum, t) => sum + Number(t.amount), 0);
        
        // 2. DESPESAS REALIZADAS (despesas pagas com payment_date no período filtrado)
        const despesasRealizadas = recentTransactions
          .filter(t => 
            t.type === "expense" && 
            t.status === "paid" &&
            t.due_date >= startDate.toISOString().split('T')[0] &&
            t.due_date <= endDate.toISOString().split('T')[0]
          )
          .reduce((sum, t) => sum + Number(t.amount), 0);
        
        // 3. RECEITAS PENDENTES (receitas pendentes/overdue com due_date no período filtrado)
        const receitasPendentes = recentTransactions
          .filter(t => 
            t.type === "revenue" && 
            (t.status === "pending" || t.status === "overdue") &&
            t.due_date >= startDate.toISOString().split('T')[0] &&
            t.due_date <= endDate.toISOString().split('T')[0]
          )
          .reduce((sum, t) => sum + Number(t.amount), 0);
        
        // 4. DESPESAS PENDENTES (despesas pendentes/overdue com due_date no período filtrado)
        const despesasPendentes = recentTransactions
          .filter(t => 
            t.type === "expense" && 
            (t.status === "pending" || t.status === "overdue") &&
            t.due_date >= startDate.toISOString().split('T')[0] &&
            t.due_date <= endDate.toISOString().split('T')[0]
          )
          .reduce((sum, t) => sum + Number(t.amount), 0);
        
        // 5. Contadores (dentro do período filtrado)
        const pending = recentTransactions
          .filter(t => 
            (t.status === "pending" || t.status === "overdue") &&
            t.due_date >= startDate.toISOString().split('T')[0] &&
            t.due_date <= endDate.toISOString().split('T')[0]
          )
          .length;
        
        const overdue = recentTransactions
          .filter(t => 
            (t.status === "pending" || t.status === "overdue") && 
            t.due_date < today &&
            t.due_date >= startDate.toISOString().split('T')[0] &&
            t.due_date <= endDate.toISOString().split('T')[0]
          )
          .length;

        // 6. Separar transações vencidas por tipo (dentro do período filtrado)
        const overdueRevenues = recentTransactions.filter(t => 
          t.type === "revenue" && 
          (t.status === "pending" || t.status === "overdue") && 
          t.due_date < today &&
          t.due_date >= startDate.toISOString().split('T')[0] &&
          t.due_date <= endDate.toISOString().split('T')[0]
        );
        
        const overdueExpenses = recentTransactions.filter(t => 
          t.type === "expense" && 
          (t.status === "pending" || t.status === "overdue") && 
          t.due_date < today &&
          t.due_date >= startDate.toISOString().split('T')[0] &&
          t.due_date <= endDate.toISOString().split('T')[0]
        );

        setOverdueTransactions({ revenues: overdueRevenues, expenses: overdueExpenses });

        // 7. Buscar saldo atual das contas (filtrado por conta selecionada)
        let accountsQuery = supabase
          .from("bank_accounts")
          .select("current_balance")
          .eq("company_id", profile.company_id)
          .eq("is_active", true);
        
        if (selectedAccount !== "all") {
          accountsQuery = accountsQuery.eq("id", selectedAccount);
        }
        
        const { data: accounts } = await accountsQuery;
        const saldoAtual = accounts?.reduce((sum, acc) => sum + Number(acc.current_balance), 0) || 0;

        // Atualizar estados
        setStats({
          totalBalance: saldoAtual,
          monthlyRevenue: receitasRealizadas,
          monthlyExpenses: despesasRealizadas,
          pendingCount: pending,
          overdueCount: overdue,
          pendingRevenue: receitasPendentes,
          futureRevenue: 0,
          futureExpenses: despesasPendentes,
          projectedBalance: 0
        });

        // Preparar dados para gráficos
        await prepareChartData(recentTransactions, recentTransactions, saldoAtual, startDate, endDate);
        
        console.log('✅ Stats carregadas com sucesso');
      }
    } catch (error: any) {
      console.error("❌ Erro ao carregar stats:", error);
      toast.error('Erro ao carregar estatísticas');
    }
  };

  const prepareChartData = async (recentTransactions: any[], periodTransactions: any[], currentBalance: number, startDate: Date, endDate: Date) => {
    try {
      // Gráfico de Receitas vs Despesas (período selecionado)
      const periodDays = eachDayOfInterval({
        start: startDate,
        end: endDate
      });

      const revenueExpenseData = periodDays.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayTransactions = recentTransactions.filter(t => 
          t.due_date === dateStr && t.status === 'paid'
        );
        
        return {
          date: format(date, 'dd/MM'),
          revenue: dayTransactions
            .filter(t => t.type === 'revenue')
            .reduce((sum, t) => sum + Number(t.amount), 0),
          expense: dayTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + Number(t.amount), 0),
        };
      });

      // Buscar categorias para os gráficos de pizza
      const { data: categories } = await supabase
        .from('categorias')
        .select('*')
        .eq('ativo', true);

      // Receitas por Categoria
      const revenueByCategory = categories
        ?.filter(cat => cat.tipo === 'receita')
        .map(cat => {
          const total = recentTransactions
            .filter(t => t.type === 'revenue' && t.status === 'paid' && t.categoria_receita_id === cat.id)
            .reduce((sum, t) => sum + Number(t.amount), 0);
          return {
            name: cat.nome,
            value: total,
            color: cat.cor || '#3b82f6'
          };
        })
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 6) || [];

      // Despesas por Categoria
      const expenseByCategory = categories
        ?.filter(cat => cat.tipo === 'despesa')
        .map(cat => {
          const total = recentTransactions
            .filter(t => t.type === 'expense' && t.status === 'paid' && t.categoria_despesa_id === cat.id)
            .reduce((sum, t) => sum + Number(t.amount), 0);
          return {
            name: cat.nome,
            value: total,
            color: cat.cor || '#ef4444'
          };
        })
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 6) || [];

      // Fluxo de Caixa (período selecionado)
      let runningBalance = currentBalance;
      const cashFlowData = [...periodDays].reverse().map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayTransactions = recentTransactions.filter(t => 
          t.due_date === dateStr && t.status === 'paid'
        );
        
        const dayRevenue = dayTransactions
          .filter(t => t.type === 'revenue')
          .reduce((sum, t) => sum + Number(t.amount), 0);
        
        const dayExpense = dayTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + Number(t.amount), 0);
        
        runningBalance = runningBalance - dayRevenue + dayExpense;
        
        return {
          date: format(date, 'dd/MM'),
          balance: runningBalance,
        };
      }).reverse();

      // Recalcular o saldo corretamente para frente
      let balance = currentBalance;
      for (let i = cashFlowData.length - 1; i >= 0; i--) {
        const dateStr = format(periodDays[i], 'yyyy-MM-dd');
        const dayTransactions = recentTransactions.filter(t => 
          t.due_date === dateStr && t.status === 'paid'
        );
        
        const dayRevenue = dayTransactions
          .filter(t => t.type === 'revenue')
          .reduce((sum, t) => sum + Number(t.amount), 0);
        
        const dayExpense = dayTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + Number(t.amount), 0);
        
        if (i === cashFlowData.length - 1) {
          cashFlowData[i].balance = balance;
        } else {
          balance = balance - dayRevenue + dayExpense;
          cashFlowData[i].balance = balance;
        }
      }

      setChartData({
        revenueExpense: revenueExpenseData,
        revenueByCategory,
        expenseByCategory,
        cashFlow: cashFlowData,
      });
    } catch (error) {
      console.error("Error preparing chart data:", error);
    }
  };

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [currentPeriod, selectedAccount, dateRange, user]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedAccount("all");
    setCurrentPeriod(new Date());
    setDateRange({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    });
    toast.info("Filtros limpos");
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>;
  }
  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8 animate-fade-in">
          <h2 className="text-3xl font-bold mb-2">Dashboard Executivo</h2>
          <p className="text-muted-foreground">Visão 360° das suas finanças em tempo real</p>
        </div>

        {/* Filtros */}
        <Card className="p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
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

            {/* Conta */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Conta</label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Selecionar todas</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.bank_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Limpar filtros */}
            <div className="flex items-end">
              <Button variant="link" onClick={handleClearFilters} className="text-primary">
                Limpar filtros
              </Button>
            </div>
          </div>
        </Card>

        {/* Saldos das Contas Bancárias */}
        <AccountsBalance />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8 animate-slide-up">
          <Card 
            className="p-6 glass border-l-4 border-l-accent hover:shadow-xl transition-all cursor-pointer"
            onClick={() => navigate('/transactions?type=revenue&status=paid')}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-accent" />
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent font-medium">
                Receitas
              </span>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Receitas Recebidas</h3>
            <p className="text-3xl font-bold mb-2 text-accent">
              R$ {stats.monthlyRevenue.toLocaleString("pt-BR", {
              minimumFractionDigits: 2
            })}
            </p>
            <div className="flex items-center gap-1 text-accent text-sm">
              <ArrowUpRight className="w-4 h-4" />
              <span>Performance positiva</span>
            </div>
          </Card>

          <Card 
            className="p-6 glass border-l-4 border-l-destructive hover:shadow-xl transition-all cursor-pointer"
            onClick={() => navigate('/transactions?type=expense&status=paid')}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-destructive" />
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive font-medium">
                Despesas
              </span>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Despesas Pagas</h3>
            <p className="text-3xl font-bold mb-2 text-destructive">
              R$ {stats.monthlyExpenses.toLocaleString("pt-BR", {
              minimumFractionDigits: 2
            })}
            </p>
            <div className="flex items-center gap-1 text-muted-foreground text-sm">
              <ArrowDownRight className="w-4 h-4" />
              <span>Custos operacionais</span>
            </div>
          </Card>

          <Card 
            className="p-6 glass border-l-4 border-l-blue-500 hover:shadow-xl transition-all cursor-pointer"
            onClick={() => navigate('/transactions?type=revenue&status=pending')}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-500" />
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-500 font-medium">
                A Receber
              </span>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Receitas Pendentes</h3>
            <p className="text-3xl font-bold mb-2 text-blue-500">
              R$ {stats.pendingRevenue.toLocaleString("pt-BR", {
              minimumFractionDigits: 2
            })}
            </p>
            <div className="flex items-center gap-1 text-muted-foreground text-sm">
              <Clock className="w-4 h-4" />
              <span>Valores a receber</span>
            </div>
          </Card>

          <Card 
            className="p-6 glass border-l-4 border-l-orange-500 hover:shadow-xl transition-all cursor-pointer"
            onClick={() => navigate('/transactions?type=expense&status=pending')}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-500" />
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-orange-500/10 text-orange-500 font-medium">
                A Pagar
              </span>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Despesas Pendentes</h3>
            <p className="text-3xl font-bold mb-2 text-orange-500">
              R$ {stats.futureExpenses.toLocaleString("pt-BR", {
              minimumFractionDigits: 2
            })}
            </p>
            <div className="flex items-center gap-1 text-muted-foreground text-sm">
              <Clock className="w-4 h-4" />
              <span>Valores a pagar</span>
            </div>
          </Card>

          <Card className="p-6 glass border-l-4 border-l-warning hover:shadow-xl transition-all cursor-pointer" onClick={() => navigate('/dashboard/overdue')}>
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-warning" />
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-warning/10 text-warning font-medium">
                Alertas
              </span>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Pendentes/Vencidas</h3>
            <p className="text-3xl font-bold mb-2">
              {stats.pendingCount} / {stats.overdueCount}
            </p>
            <div className="flex items-center gap-1 text-warning text-sm">
              <span>Clique para ver detalhes →</span>
            </div>
          </Card>
        </div>

        {/* Alertas de Pendências */}
        <div className="mb-8 animate-fade-in">
          <PendingAlerts
            overdueRevenues={overdueTransactions.revenues}
            overdueExpenses={overdueTransactions.expenses}
          />
        </div>

        {/* Gráficos e Visualizações */}
        <div className="space-y-6 mb-8 animate-fade-in">
          <h3 className="text-xl font-semibold">Análise Visual</h3>
          
          {/* Receitas vs Despesas */}
          <RevenueExpenseChart data={chartData.revenueExpense} />

          {/* Gráficos de Pizza */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CategoryPieChart 
              data={chartData.revenueByCategory} 
              title="Receitas por Categoria"
              type="revenue"
            />
            <CategoryPieChart 
              data={chartData.expenseByCategory} 
              title="Despesas por Categoria"
              type="expense"
            />
          </div>

          {/* Fluxo de Caixa */}
          <CashFlowChart data={chartData.cashFlow} />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-scale-in">
          <Link to="/transactions">
            <Card className="p-6 glass hover:shadow-xl transition-all cursor-pointer border-l-4 border-l-primary">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Inserir Transações</h3>
                  <p className="text-sm text-muted-foreground">Gerenciar receitas e despesas</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link to="/bank-accounts">
            <Card className="p-6 glass hover:shadow-xl transition-all cursor-pointer border-l-4 border-l-accent">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Contas Bancárias</h3>
                  <p className="text-sm text-muted-foreground">Gerenciar contas e saldos</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link to="/ai-assistant">
            <Card className="p-6 glass hover:shadow-xl transition-all cursor-pointer border-l-4 border-l-info">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-info" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Assistente IA</h3>
                  <p className="text-sm text-muted-foreground">Insights financeiros inteligentes</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>

        {/* System Status */}
        
      </main>
    </div>;
};
export default Dashboard;