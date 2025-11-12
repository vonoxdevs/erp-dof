import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, DollarSign, Building2, Calendar, ArrowUpRight, ArrowDownRight, Receipt, Users, FileText, Clock } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { Link } from "react-router-dom";
import { AccountsBalance } from "@/components/dashboard/AccountsBalance";
import { DashboardPeriodFilter } from "@/components/dashboard/DashboardPeriodFilter";
import { BudgetForecast } from "@/components/dashboard/BudgetForecast";
import { PendingAlerts } from "@/components/dashboard/PendingAlerts";
import { RevenueExpenseChart } from "@/components/dashboard/RevenueExpenseChart";
import { CategoryPieChart } from "@/components/dashboard/CategoryPieChart";
import { CashFlowChart } from "@/components/dashboard/CashFlowChart";
import { DateRange } from "react-day-picker";
import { format, subDays, eachDayOfInterval } from "date-fns";
const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
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
  const [selectedPeriod, setSelectedPeriod] = useState<'30' | '90' | 'custom'>('30');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
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
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadStats();
        setLoading(false);
      }
    });
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        navigate("/auth");
      } else if (session) {
        setUser(session.user);
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);
  const loadStats = async () => {
    try {
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

      // Calcular datas baseado no período selecionado
      let daysAgo = selectedPeriod === '30' ? 30 : 90;
      let startDate: Date;
      let endDate: Date = new Date();

      if (selectedPeriod === 'custom' && dateRange?.from && dateRange?.to) {
        startDate = dateRange.from;
        endDate = dateRange.to;
      } else {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - daysAgo);
      }

      const dateFilter = startDate.toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const futureDate = thirtyDaysFromNow.toISOString().split('T')[0];

      // Load transactions do período selecionado
      const {
        data: recentTransactions
      } = await supabase.from("transactions").select("*").eq("company_id", profile.company_id).gte("due_date", dateFilter);

      // Load todas as transações para pendentes/vencidas
      const {
        data: allTransactions
      } = await supabase.from("transactions").select("*").eq("company_id", profile.company_id);

      // Load transações futuras (próximos 30 dias)
      const {
        data: futureTransactions
      } = await supabase.from("transactions").select("*").eq("company_id", profile.company_id).gt("due_date", today).lte("due_date", futureDate).in("status", ["pending"]);

      if (recentTransactions && allTransactions) {
        const paidRevenue = recentTransactions.filter(t => t.type === "revenue" && t.status === "paid").reduce((sum, t) => sum + Number(t.amount), 0);
        const pendingRevenue = allTransactions.filter(t => t.type === "revenue" && (t.status === "pending" || t.status === "overdue")).reduce((sum, t) => sum + Number(t.amount), 0);
        const expenses = recentTransactions.filter(t => t.type === "expense" && t.status === "paid").reduce((sum, t) => sum + Number(t.amount), 0);
        const pending = allTransactions.filter(t => t.status === "pending" || t.status === "overdue").length;
        const overdue = allTransactions.filter(t => (t.status === "pending" || t.status === "overdue") && t.due_date < today).length;

        // Calcular receitas e despesas futuras
        const futureRevenue = futureTransactions?.filter(t => t.type === "revenue").reduce((sum, t) => sum + Number(t.amount), 0) || 0;
        const futureExpenses = futureTransactions?.filter(t => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0) || 0;

        // Separar transações vencidas por tipo
        const overdueRevenues = allTransactions.filter(t => 
          t.type === "revenue" && 
          (t.status === "pending" || t.status === "overdue") && 
          t.due_date < today
        );
        const overdueExpenses = allTransactions.filter(t => 
          t.type === "expense" && 
          (t.status === "pending" || t.status === "overdue") && 
          t.due_date < today
        );

        setOverdueTransactions({ revenues: overdueRevenues, expenses: overdueExpenses });

        // Load bank accounts
        const {
          data: accounts
        } = await supabase.from("bank_accounts").select("current_balance").eq("company_id", profile.company_id).eq("is_active", true);
        const totalBalance = accounts?.reduce((sum, acc) => sum + Number(acc.current_balance), 0) || 0;

        const projectedBalance = totalBalance + futureRevenue - futureExpenses;

        setStats({
          totalBalance,
          monthlyRevenue: paidRevenue,
          monthlyExpenses: expenses,
          pendingCount: pending,
          overdueCount: overdue,
          pendingRevenue,
          futureRevenue,
          futureExpenses,
          projectedBalance
        });

        // Preparar dados para gráficos
        prepareChartData(recentTransactions, allTransactions, totalBalance);
      }
    } catch (error: any) {
      console.error("Error loading stats:", error);
    }
  };

  const prepareChartData = async (recentTransactions: any[], allTransactions: any[], currentBalance: number) => {
    try {
      // Gráfico de Receitas vs Despesas (últimos 7 dias)
      const last7Days = eachDayOfInterval({
        start: subDays(new Date(), 6),
        end: new Date()
      });

      const revenueExpenseData = last7Days.map(date => {
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

      // Fluxo de Caixa (últimos 7 dias)
      let runningBalance = currentBalance;
      const cashFlowData = [...last7Days].reverse().map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayTransactions = allTransactions.filter(t => 
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
        const dateStr = format(last7Days[i], 'yyyy-MM-dd');
        const dayTransactions = allTransactions.filter(t => 
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
  }, [selectedPeriod, dateRange, user]);
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

        {/* Filtro de Período */}
        <DashboardPeriodFilter
          selectedPeriod={selectedPeriod}
          dateRange={dateRange}
          onPeriodChange={setSelectedPeriod}
          onDateRangeChange={setDateRange}
        />

        {/* Saldos das Contas Bancárias */}
        <AccountsBalance />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8 animate-slide-up">
          <Card className="p-6 glass border-l-4 border-l-primary hover:shadow-xl transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent font-medium">
                Total
              </span>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Saldo Total</h3>
            <p className="text-3xl font-bold mb-2">
              R$ {stats.totalBalance.toLocaleString("pt-BR", {
              minimumFractionDigits: 2
            })}
            </p>
            <div className="flex items-center gap-1 text-accent text-sm">
              <ArrowUpRight className="w-4 h-4" />
              <span>Em contas bancárias</span>
            </div>
          </Card>

          <Card className="p-6 glass border-l-4 border-l-accent hover:shadow-xl transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-accent" />
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent font-medium">
                Receitas
              </span>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Receitas Recebidas (30d)</h3>
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

          <Card className="p-6 glass border-l-4 border-l-info hover:shadow-xl transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-info" />
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-info/10 text-info font-medium">
                A Receber
              </span>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Receitas Pendentes</h3>
            <p className="text-3xl font-bold mb-2 text-info">
              R$ {stats.pendingRevenue.toLocaleString("pt-BR", {
              minimumFractionDigits: 2
            })}
            </p>
            <div className="flex items-center gap-1 text-info text-sm">
              <ArrowUpRight className="w-4 h-4" />
              <span>Aguardando recebimento</span>
            </div>
          </Card>

          <Card className="p-6 glass border-l-4 border-l-destructive hover:shadow-xl transition-all">
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

        {/* Previsão Orçamentária */}
        <div className="mb-8 animate-fade-in">
          <BudgetForecast
            futureRevenue={stats.futureRevenue}
            futureExpenses={stats.futureExpenses}
            projectedBalance={stats.projectedBalance}
          />
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