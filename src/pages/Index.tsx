import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Building2,
  TrendingUp,
  Zap,
  Shield,
  Brain,
  BarChart3,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 animate-fade-in">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Building2 className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-primary">LSFIN v2.0</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
              Lançamento
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            O ERP Financeiro
            <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Mais Avançado do Mundo
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
            Gerencie holdings empresariais com IA nativa, automação inteligente e
            insights em tempo real. Supere SAP, Oracle e Microsoft.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="text-lg h-14 px-8 shadow-lg shadow-primary/20"
            >
              Começar Agora
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/auth")}
              className="text-lg h-14 px-8"
            >
              Ver Demonstração
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-6 py-12 animate-slide-up">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {[
            { value: "2.8B", label: "Market Cap", color: "primary" },
            { value: "99.9%", label: "Uptime SLA", color: "accent" },
            { value: "<2s", label: "Load Time", color: "info" },
            { value: "100K+", label: "Transações/dia", color: "success" },
          ].map((stat, i) => (
            <Card key={i} className="p-6 text-center glass border-t-4 border-t-primary">
              <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {stat.value}
              </p>
              <p className="text-sm text-muted-foreground mt-2">{stat.label}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-20 animate-scale-in">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            Recursos que Revolucionam
            <span className="block text-primary">Gestão Financeira</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Tecnologia de ponta para empresas que exigem o melhor
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {[
            {
              icon: Brain,
              title: "IA Native",
              description: "Categorização automática, previsões precisas e insights proativos",
              color: "primary",
            },
            {
              icon: TrendingUp,
              title: "Multi-empresa",
              description: "Gerencie holdings complexas com visão consolidada",
              color: "accent",
            },
            {
              icon: Zap,
              title: "Automação Total",
              description: "Imports bancários, recorrências e conciliação automática",
              color: "warning",
            },
            {
              icon: Shield,
              title: "Segurança Enterprise",
              description: "Criptografia E2E, RLS e auditoria completa",
              color: "info",
            },
            {
              icon: BarChart3,
              title: "Analytics Avançado",
              description: "Dashboards customizáveis com drill-down infinito",
              color: "success",
            },
            {
              icon: Building2,
              title: "Performance Extrema",
              description: "100K+ transações com scroll virtual e load < 2s",
              color: "destructive",
            },
          ].map((feature, i) => (
            <Card
              key={i}
              className="p-6 glass hover:shadow-xl transition-all duration-300 border-l-4 border-l-primary group"
            >
              <div className={`w-14 h-14 rounded-xl bg-${feature.color}/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <feature.icon className={`w-7 h-7 text-${feature.color}`} />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-6 py-20 bg-gradient-to-b from-transparent to-primary/5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              Por que LSFIN v2.0?
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              "Dashboard executivo em tempo real",
              "Importação multi-formato (OFX, CNAB, XML)",
              "Contratos recorrentes com reajuste automático",
              "Relatórios corporativos (DRE, Fluxo, Balancete)",
              "PWA com modo offline",
              "Integrações bancárias nativas",
              "API REST completa",
              "Lighthouse Score > 95",
            ].map((benefit, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-accent flex-shrink-0 mt-0.5" />
                <span className="text-lg">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20">
        <Card className="p-12 text-center glass-strong max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold mb-4">
            Pronto para Revolucionar
            <span className="block text-primary">Sua Gestão Financeira?</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Junte-se às empresas mais inovadoras que já usam LSFIN v2.0
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="text-lg h-14 px-12 shadow-xl shadow-primary/30"
          >
            Começar Gratuitamente
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-20">
        <div className="container mx-auto px-6 py-8 text-center text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Building2 className="w-5 h-5 text-primary" />
            <span className="font-semibold">LSFIN v2.0</span>
          </div>
          <p className="text-sm">
            O ERP Financeiro Corporativo Mais Avançado do Mundo
          </p>
          <p className="text-xs mt-2">
            © 2025 LS&amp;Co. Holding Empresarial. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
