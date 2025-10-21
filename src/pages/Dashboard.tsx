import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  LogOut,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Building2,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso!");
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
      {/* Header */}
      <header className="border-b border-border/50 glass-strong">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">LSFIN v2.0</h1>
              <p className="text-xs text-muted-foreground">ERP Financeiro Corporativo</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{user?.user_metadata?.full_name || "Usuário"}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Welcome Banner */}
        <div className="mb-8 animate-fade-in">
          <h2 className="text-3xl font-bold mb-2">
            Bem-vindo ao LSFIN v2.0 🚀
          </h2>
          <p className="text-muted-foreground">
            Dashboard executivo com visão 360° das suas finanças
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-slide-up">
          {/* Total Balance */}
          <Card className="p-6 glass border-l-4 border-l-primary">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent font-medium">
                +15.3%
              </span>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              Saldo Total
            </h3>
            <p className="text-3xl font-bold mb-2">R$ 2.3M</p>
            <div className="flex items-center gap-1 text-accent text-sm">
              <ArrowUpRight className="w-4 h-4" />
              <span>vs. mês anterior</span>
            </div>
          </Card>

          {/* Revenue */}
          <Card className="p-6 glass border-l-4 border-l-accent">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-accent" />
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent font-medium">
                +8.2%
              </span>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              Receitas do Mês
            </h3>
            <p className="text-3xl font-bold mb-2">R$ 1.8M</p>
            <div className="flex items-center gap-1 text-accent text-sm">
              <ArrowUpRight className="w-4 h-4" />
              <span>Performance positiva</span>
            </div>
          </Card>

          {/* Expenses */}
          <Card className="p-6 glass border-l-4 border-l-destructive">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-destructive" />
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive font-medium">
                -3.1%
              </span>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              Despesas do Mês
            </h3>
            <p className="text-3xl font-bold mb-2">R$ 892K</p>
            <div className="flex items-center gap-1 text-accent text-sm">
              <ArrowDownRight className="w-4 h-4" />
              <span>Redução de custos</span>
            </div>
          </Card>

          {/* Projected */}
          <Card className="p-6 glass border-l-4 border-l-info">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-info" />
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-info/10 text-info font-medium">
                30d
              </span>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              Projeção 30 Dias
            </h3>
            <p className="text-3xl font-bold mb-2">R$ 2.7M</p>
            <div className="flex items-center gap-1 text-info text-sm">
              <span>Baseado em IA</span>
            </div>
          </Card>
        </div>

        {/* Coming Soon Section */}
        <Card className="p-12 text-center glass-strong animate-scale-in">
          <div className="max-w-2xl mx-auto">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <TrendingUp className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-4">
              Dashboard Completo em Desenvolvimento
            </h3>
            <p className="text-muted-foreground mb-6">
              Fase 1 concluída com sucesso! Próximas fases incluem: gestão de transações,
              automação inteligente, relatórios avançados e muito mais.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <span className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                ✓ Autenticação
              </span>
              <span className="px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm font-medium">
                → Transações
              </span>
              <span className="px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm font-medium">
                → Automação IA
              </span>
              <span className="px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm font-medium">
                → Relatórios
              </span>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
