import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  BarChart3, 
  DollarSign, 
  FileText, 
  Shield, 
  Users, 
  Clock,
  CheckCircle2,
  Zap,
  ArrowRight,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                ERP Financeiro DOF
              </span>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <button 
                onClick={() => scrollToSection('recursos')}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Recursos
              </button>
              <button 
                onClick={() => scrollToSection('beneficios')}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Benefícios
              </button>
              <button 
                onClick={() => scrollToSection('precos')}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Preços
              </button>
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-3">
              <Link to="/login">
                <Button>Acessar Sistema</Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2"
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-border">
              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => scrollToSection('recursos')}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors text-left"
                >
                  Recursos
                </button>
                <button 
                  onClick={() => scrollToSection('beneficios')}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors text-left"
                >
                  Benefícios
                </button>
                <button 
                  onClick={() => scrollToSection('precos')}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors text-left"
                >
                  Preços
                </button>
                <Link to="/login" className="w-full">
                  <Button className="w-full">Acessar Sistema</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background -z-10"></div>
        <div className="absolute top-20 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl -z-10"></div>
        
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Side */}
            <div className="space-y-8 animate-fade-in">
              <Badge className="w-fit">
                <Zap className="w-3 h-3 mr-1" />
                Gestão Financeira Inteligente
              </Badge>

              <div className="space-y-6">
                <h1 className="text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight">
                  Controle total das{" "}
                  <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    finanças
                  </span>{" "}
                  da sua empresa
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Sistema completo de gestão financeira com dashboard em tempo real, 
                  relatórios automatizados e controle total para sua empresa crescer com segurança.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/login" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base">
                    Começar agora
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => scrollToSection('recursos')}
                  className="w-full sm:w-auto h-12 px-8 text-base"
                >
                  Conhecer recursos
                </Button>
              </div>

              {/* Social Proof */}
              <div className="flex flex-wrap items-center gap-6 pt-6 border-t border-border">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 border-2 border-background"></div>
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">+500 empresas confiam</span>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className="text-yellow-500">★</span>
                  ))}
                  <span className="text-sm text-muted-foreground ml-1">4.9/5</span>
                </div>
              </div>
            </div>

            {/* Right Side - Modern Dashboard Preview */}
            <div className="relative animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="relative">
                {/* Floating cards effect */}
                <div className="absolute -top-8 -right-8 w-64 h-64 bg-primary/20 rounded-2xl blur-2xl"></div>
                <div className="absolute -bottom-8 -left-8 w-64 h-64 bg-accent/20 rounded-2xl blur-2xl"></div>
                
                <Card className="relative p-6 space-y-6 backdrop-blur-sm shadow-2xl border-2">
                  {/* Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-border">
                    <div>
                      <h3 className="font-semibold text-lg">Visão Geral</h3>
                      <p className="text-sm text-muted-foreground">Últimos 30 dias</p>
                    </div>
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                      <span className="w-2 h-2 rounded-full bg-green-500 mr-1 animate-pulse"></span>
                      Ao vivo
                    </Badge>
                  </div>
                  
                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Receitas</span>
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="text-2xl font-bold text-foreground">R$ 125K</div>
                      <div className="text-xs text-green-600 mt-1">+12.5% vs mês anterior</div>
                    </div>
                    <div className="p-5 rounded-xl bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Despesas</span>
                        <BarChart3 className="w-4 h-4 text-red-600" />
                      </div>
                      <div className="text-2xl font-bold text-foreground">R$ 85K</div>
                      <div className="text-xs text-red-600 mt-1">-8.3% vs mês anterior</div>
                    </div>
                  </div>

                  {/* Chart Area */}
                  <div className="space-y-3">
                    <div className="text-sm font-medium">Fluxo de caixa mensal</div>
                    <div className="h-40 bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl flex items-end justify-around p-4 gap-2">
                      {[45, 70, 55, 85, 65, 90, 75, 95].map((height, i) => (
                        <div 
                          key={i} 
                          className="flex-1 bg-gradient-to-t from-primary to-primary/60 rounded-t-lg transition-all hover:opacity-80" 
                          style={{ height: `${height}%` }}
                        ></div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="space-y-3">
                    <div className="text-sm font-medium">Atividade recente</div>
                    {[
                      { name: 'Pagamento recebido', value: '+R$ 5.240', icon: '↗', color: 'green' },
                      { name: 'Fornecedor pago', value: '-R$ 2.150', icon: '↙', color: 'red' },
                      { name: 'Transferência', value: 'R$ 1.000', icon: '↔', color: 'blue' }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            item.color === 'green' ? 'bg-green-500/10 text-green-600' :
                            item.color === 'red' ? 'bg-red-500/10 text-red-600' :
                            'bg-blue-500/10 text-blue-600'
                          }`}>
                            {item.icon}
                          </div>
                          <div>
                            <div className="text-sm font-medium">{item.name}</div>
                            <div className="text-xs text-muted-foreground">Hoje às 14:23</div>
                          </div>
                        </div>
                        <div className={`text-sm font-semibold ${
                          item.color === 'green' ? 'text-green-600' :
                          item.color === 'red' ? 'text-red-600' :
                          'text-blue-600'
                        }`}>
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recursos Section */}
      <section id="recursos" className="py-24 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16 space-y-4 max-w-3xl mx-auto">
            <Badge className="mx-auto">Recursos Poderosos</Badge>
            <h2 className="text-4xl lg:text-5xl font-bold">
              Tudo que sua empresa precisa em um só lugar
            </h2>
            <p className="text-xl text-muted-foreground">
              Sistema completo de gestão financeira com todas as ferramentas essenciais
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: BarChart3,
                title: "Dashboard em Tempo Real",
                description: "Acompanhe KPIs, gráficos e métricas importantes em um painel intuitivo atualizado em tempo real",
                color: "blue"
              },
              {
                icon: DollarSign,
                title: "Gestão de Transações",
                description: "Controle completo de receitas, despesas e transferências com categorização inteligente",
                color: "green"
              },
              {
                icon: FileText,
                title: "Relatórios Avançados",
                description: "Gere relatórios detalhados e personalizados com exportação em PDF e análise profunda",
                color: "purple"
              },
              {
                icon: Shield,
                title: "Segurança Bancária",
                description: "Criptografia de ponta a ponta, backup automático e conformidade com LGPD",
                color: "orange"
              },
              {
                icon: Users,
                title: "Multi-Usuários",
                description: "Gerencie permissões e controle de acesso para toda sua equipe com segurança",
                color: "pink"
              },
              {
                icon: Clock,
                title: "Automatização",
                description: "Lançamentos recorrentes, lembretes automáticos e sincronização de dados",
                color: "indigo"
              }
            ].map((feature, i) => {
              const Icon = feature.icon;
              return (
                <Card 
                  key={i} 
                  className="group p-8 hover:shadow-xl hover:scale-105 transition-all duration-300 border-2 hover:border-primary/20 cursor-pointer"
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br from-${feature.color}-500/10 to-${feature.color}-500/5 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-7 h-7 text-${feature.color}-600`} />
                  </div>
                  <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefícios Section */}
      <section id="beneficios" className="py-24 px-4">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Side */}
            <div className="space-y-8">
              <div className="space-y-4">
                <Badge>Por que escolher?</Badge>
                <h2 className="text-4xl lg:text-5xl font-bold leading-tight">
                  Transforme a gestão financeira da sua empresa
                </h2>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Milhares de empresas já economizam tempo e dinheiro com nossa plataforma
                </p>
              </div>

              <div className="space-y-5">
                {[
                  {
                    title: "Economia de até 40%",
                    description: "Reduza custos operacionais e desperdícios com controle inteligente"
                  },
                  {
                    title: "Decisões mais rápidas",
                    description: "Dados em tempo real para tomadas de decisão estratégicas"
                  },
                  {
                    title: "100% na nuvem",
                    description: "Acesse de qualquer lugar, a qualquer hora, com total segurança"
                  },
                  {
                    title: "Integração completa",
                    description: "Conecte com suas ferramentas favoritas e automatize processos"
                  }
                ].map((benefit, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 rounded-xl hover:bg-muted/50 transition-colors">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-1">{benefit.title}</h4>
                      <p className="text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link to="/login">
                <Button size="lg" className="h-12 px-8">
                  Começar gratuitamente
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>

            {/* Right Side - Stats Grid */}
            <div className="grid grid-cols-2 gap-6">
              {[
                { value: "500+", label: "Empresas ativas", icon: Users, color: "blue" },
                { value: "5M+", label: "Transações processadas", icon: DollarSign, color: "green" },
                { value: "98%", label: "Satisfação dos clientes", icon: CheckCircle2, color: "purple" },
                { value: "24/7", label: "Suporte especializado", icon: Clock, color: "orange" }
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <Card 
                    key={i} 
                    className="p-8 text-center hover:shadow-xl hover:scale-105 transition-all duration-300 border-2"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-2">
                      {stat.value}
                    </div>
                    <div className="text-sm text-muted-foreground font-medium">
                      {stat.label}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="precos" className="relative py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/80 -z-10"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/10 rounded-full blur-3xl"></div>
        
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <Badge className="bg-white/20 text-white border-white/30">
              Comece Agora
            </Badge>
            
            <div className="space-y-6">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                Pronto para revolucionar sua gestão financeira?
              </h2>
              <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto leading-relaxed">
                Junte-se a centenas de empresas que já transformaram suas finanças. 
                Sem cartão de crédito. Sem compromisso.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link to="/login" className="w-full sm:w-auto">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto h-14 px-10 text-base bg-white text-primary hover:bg-white/90 font-semibold shadow-xl"
                >
                  Começar gratuitamente
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <a href="https://wa.me/5518996667483" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="w-full sm:w-auto h-14 px-10 text-base bg-white/10 text-white border-2 border-white/30 hover:bg-white/20 backdrop-blur-sm"
                >
                  Falar com especialista
                </Button>
              </a>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-8 pt-8 text-white/80">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">Teste grátis por 14 dias</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">Sem cartão de crédito</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">Cancele quando quiser</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 bg-muted/30 border-t border-border">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Logo Column */}
            <div className="space-y-4">
              <Link to="/" className="flex items-center gap-2 group">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold">ERP Financeiro DOF</span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A solução completa para gestão financeira da sua empresa com segurança e eficiência.
              </p>
              <div className="flex gap-3">
                {['twitter', 'linkedin', 'instagram'].map((social) => (
                  <a 
                    key={social}
                    href="#" 
                    className="w-9 h-9 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-all"
                    aria-label={social}
                  >
                    <span className="text-sm font-medium">{social[0].toUpperCase()}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Produto Column */}
            <div>
              <h4 className="font-semibold mb-4">Produto</h4>
              <ul className="space-y-3">
                {['Recursos', 'Preços', 'Segurança', 'Atualizações', 'Roadmap'].map((item) => (
                  <li key={item}>
                    <button 
                      onClick={() => scrollToSection('recursos')}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Empresa Column */}
            <div>
              <h4 className="font-semibold mb-4">Empresa</h4>
              <ul className="space-y-3">
                {['Sobre nós', 'Blog', 'Carreiras', 'Parceiros', 'Contato'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Suporte Column */}
            <div>
              <h4 className="font-semibold mb-4">Suporte</h4>
              <ul className="space-y-3">
                {['Central de ajuda', 'Documentação', 'Status', 'API', 'Comunidade'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="pt-8 border-t border-border">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-muted-foreground">
                &copy; 2024 ERP Financeiro DOF. Todos os direitos reservados.
              </p>
              <div className="flex gap-6">
                {['Privacidade', 'Termos', 'Cookies', 'LGPD'].map((item) => (
                  <a 
                    key={item}
                    href="#" 
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
