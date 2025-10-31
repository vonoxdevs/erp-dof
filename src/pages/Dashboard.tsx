import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Building2,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  Users,
  FileText,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { Link } from "react-router-dom";

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
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadStats();
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile) return;

      // Calcular data de 30 dias atrás
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateFilter = thirtyDaysAgo.toISOString().split('T')[0];

      // Load transactions dos últimos 30 dias para receitas e despesas
      const { data: recentTransactions } = await supabase
        .from("transactions")
        .select("*")
        .eq("company_id", profile.company_id)
        .gte("due_date", dateFilter);

      // Load todas as transações para pendentes/vencidas
      const { data: allTransactions } = await supabase
        .from("transactions")
        .select("*")
        .eq("company_id", profile.company_id);

      if (recentTransactions && allTransactions) {
        const revenue = recentTransactions
          .filter((t) => t.type === "revenue" && t.status === "paid")
          .reduce((sum, t) => sum + Number(t.amount), 0);

        const expenses = recentTransactions
          .filter((t) => t.type === "expense" && t.status === "paid")
          .reduce((sum, t) => sum + Number(t.amount), 0);

        const today = new Date().toISOString().split('T')[0];
        
        const pending = allTransactions.filter((t) => t.status === "pending" || t.status === "overdue").length;
        const overdue = allTransactions.filter((t) => 
          (t.status === "pending" || t.status === "overdue") && t.due_date < today
        ).length;

        // Load bank accounts
        const { data: accounts } = await supabase
          .from("bank_accounts")
          .select("current_balance")
          .eq("company_id", profile.company_id)
          .eq("is_active", true);

        const totalBalance = accounts?.reduce((sum, acc) => sum + Number(acc.current_balance), 0) || 0;

        setStats({
          totalBalance,
          monthlyRevenue: revenue,
          monthlyExpenses: expenses,
          pendingCount: pending,
          overdueCount: overdue,
        });
      }
    } catch (error: any) {
      console.error("Error loading stats:", error);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8 animate-fade-in">
          <h2 className="text-3xl font-bold mb-2">Dashboard Executivo</h2>
          <p className="text-muted-foreground">Visão 360° das suas finanças em tempo real</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-slide-up">
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
              R$ {stats.totalBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
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
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Receitas Pagas</h3>
            <p className="text-3xl font-bold mb-2 text-accent">
              R$ {stats.monthlyRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <div className="flex items-center gap-1 text-accent text-sm">
              <ArrowUpRight className="w-4 h-4" />
              <span>Performance positiva</span>
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
              R$ {stats.monthlyExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <div className="flex items-center gap-1 text-muted-foreground text-sm">
              <ArrowDownRight className="w-4 h-4" />
              <span>Custos operacionais</span>
            </div>
          </Card>

          <Card 
            className="p-6 glass border-l-4 border-l-warning hover:shadow-xl transition-all cursor-pointer"
            onClick={() => navigate('/dashboard/overdue')}
          >
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

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-scale-in">
          <Link to="/transactions">
            <Card className="p-6 glass hover:shadow-xl transition-all cursor-pointer border-l-4 border-l-primary">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Transações</h3>
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
        <Card className="p-8 text-center glass-strong animate-fade-in">
          <div className="max-w-2xl mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Sistema Operacional</h3>
            <p className="text-muted-foreground mb-4">
              Todas as funcionalidades principais estão ativas e prontas para uso
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <span className="px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium">
                ✓ Transações
              </span>
              <span className="px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium">
                ✓ Contas Bancárias
              </span>
              <span className="px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium">
                ✓ Assistente IA
              </span>
              <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm font-medium">
                → Categorias (em breve)
              </span>
              <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm font-medium">
                → Relatórios (em breve)
              </span>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
