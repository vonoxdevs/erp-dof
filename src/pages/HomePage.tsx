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
                <Button variant="outline">Entrar</Button>
              </Link>
              <Link to="/register">
                <Button>Começar Grátis</Button>
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
                  <Button variant="outline" className="w-full">Entrar</Button>
                </Link>
                <Link to="/register" className="w-full">
                  <Button className="w-full">Começar Grátis</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side */}
            <div className="space-y-8">
              <Badge className="bg-blue-100 text-blue-700 border-0">
                <Zap className="w-3 h-3 mr-1" />
                Sistema Completo de Gestão Financeira
              </Badge>

              <div className="space-y-4">
                <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                  Gerencie suas{" "}
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    finanças
                  </span>{" "}
                  de forma inteligente
                </h1>
                <p className="text-xl text-muted-foreground">
                  Plataforma completa para controle financeiro corporativo. 
                  Dashboard em tempo real, relatórios automatizados e segurança total.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/register">
                  <Button size="lg" className="w-full sm:w-auto">
                    Criar Conta Grátis
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => scrollToSection('recursos')}
                  className="w-full sm:w-auto"
                >
                  Ver Recursos
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 pt-8">
                <div>
                  <div className="text-3xl font-bold text-foreground">500+</div>
                  <div className="text-sm text-muted-foreground">Empresas</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-foreground">50K+</div>
                  <div className="text-sm text-muted-foreground">Transações/mês</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-foreground">99.9%</div>
                  <div className="text-sm text-muted-foreground">Uptime</div>
                </div>
              </div>
            </div>

            {/* Right Side - Dashboard Preview */}
            <div className="relative">
              <div className="absolute -top-4 -right-4 w-72 h-72 bg-blue-200 rounded-full blur-3xl opacity-20"></div>
              <div className="absolute -bottom-4 -left-4 w-72 h-72 bg-purple-200 rounded-full blur-3xl opacity-20"></div>
              
              <Card className="p-6 space-y-4 relative backdrop-blur-sm bg-background/95">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Dashboard</h3>
                  <Badge variant="outline">Live</Badge>
                </div>
                
                {/* Mock KPIs */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <div className="text-sm text-muted-foreground">Receitas</div>
                    <div className="text-2xl font-bold text-green-600">R$ 125K</div>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    <div className="text-sm text-muted-foreground">Despesas</div>
                    <div className="text-2xl font-bold text-red-600">R$ 85K</div>
                  </div>
                </div>

                {/* Mock Chart */}
                <div className="h-32 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg flex items-end justify-around p-4">
                  <div className="w-8 bg-blue-500 rounded-t" style={{height: '40%'}}></div>
                  <div className="w-8 bg-blue-500 rounded-t" style={{height: '70%'}}></div>
                  <div className="w-8 bg-blue-500 rounded-t" style={{height: '50%'}}></div>
                  <div className="w-8 bg-blue-500 rounded-t" style={{height: '90%'}}></div>
                  <div className="w-8 bg-blue-500 rounded-t" style={{height: '60%'}}></div>
                </div>

                {/* Mock Transactions */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Últimas Transações</div>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary/10 rounded-full"></div>
                        <div className="text-sm">Transação {i}</div>
                      </div>
                      <div className="text-sm font-medium">R$ {1000 * i}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Recursos Section */}
      <section id="recursos" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl font-bold">Recursos Completos para sua Empresa</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Tudo que você precisa para gerenciar suas finanças em um só lugar
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <Card className="p-8 hover:shadow-xl transition-all border-2 hover:border-blue-200">
              <div className="w-14 h-14 rounded-xl bg-blue-100 dark:bg-blue-950/20 flex items-center justify-center mb-4">
                <BarChart3 className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Dashboard Inteligente</h3>
              <p className="text-muted-foreground">
                Visualize suas finanças em tempo real com gráficos e KPIs automatizados
              </p>
            </Card>

            {/* Feature 2 */}
            <Card className="p-8 hover:shadow-xl transition-all border-2 hover:border-green-200">
              <div className="w-14 h-14 rounded-xl bg-green-100 dark:bg-green-950/20 flex items-center justify-center mb-4">
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Gestão de Transações</h3>
              <p className="text-muted-foreground">
                Controle completo de receitas e despesas com categorização automática
              </p>
            </Card>

            {/* Feature 3 */}
            <Card className="p-8 hover:shadow-xl transition-all border-2 hover:border-purple-200">
              <div className="w-14 h-14 rounded-xl bg-purple-100 dark:bg-purple-950/20 flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Relatórios Avançados</h3>
              <p className="text-muted-foreground">
                Relatórios detalhados e exportáveis para análises profundas
              </p>
            </Card>

            {/* Feature 4 */}
            <Card className="p-8 hover:shadow-xl transition-all border-2 hover:border-orange-200">
              <div className="w-14 h-14 rounded-xl bg-orange-100 dark:bg-orange-950/20 flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Segurança Total</h3>
              <p className="text-muted-foreground">
                Criptografia de ponta e backup automático para proteção máxima
              </p>
            </Card>

            {/* Feature 5 */}
            <Card className="p-8 hover:shadow-xl transition-all border-2 hover:border-pink-200">
              <div className="w-14 h-14 rounded-xl bg-pink-100 dark:bg-pink-950/20 flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-pink-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Multi-Usuários</h3>
              <p className="text-muted-foreground">
                Acesso controlado por permissões para toda sua equipe
              </p>
            </Card>

            {/* Feature 6 */}
            <Card className="p-8 hover:shadow-xl transition-all border-2 hover:border-indigo-200">
              <div className="w-14 h-14 rounded-xl bg-indigo-100 dark:bg-indigo-950/20 flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Contratos Recorrentes</h3>
              <p className="text-muted-foreground">
                Automatize pagamentos e recebimentos recorrentes
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefícios Section */}
      <section id="beneficios" className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side */}
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-4xl font-bold">Por que escolher o ERP Financeiro DOF?</h2>
                <p className="text-xl text-muted-foreground">
                  A solução completa para transformar a gestão financeira da sua empresa
                </p>
              </div>

              <div className="space-y-4">
                {[
                  "Reduza custos operacionais em até 40%",
                  "Visão 360° das finanças em tempo real",
                  "Decisões mais inteligentes com dados precisos",
                  "100% na nuvem, acesse de qualquer lugar"
                ].map((benefit, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                    <span className="text-lg">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side - Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-6 text-center">
                <div className="text-4xl font-bold text-green-600 mb-2">98%</div>
                <div className="text-sm text-muted-foreground">Satisfação dos Clientes</div>
              </Card>
              <Card className="p-6 text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">5M+</div>
                <div className="text-sm text-muted-foreground">Transações Processadas</div>
              </Card>
              <Card className="p-6 text-center">
                <div className="text-4xl font-bold text-purple-600 mb-2">24/7</div>
                <div className="text-sm text-muted-foreground">Suporte Premium</div>
              </Card>
              <Card className="p-6 text-center">
                <div className="text-4xl font-bold text-orange-600 mb-2">500+</div>
                <div className="text-sm text-muted-foreground">Empresas Ativas</div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="precos" className="py-20 px-4 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="container mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              Pronto para transformar sua gestão financeira?
            </h2>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Comece agora mesmo, sem cartão de crédito. Teste grátis por 14 dias.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                Criar Conta Grátis
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Button 
              size="lg" 
              variant="outline" 
              className="w-full sm:w-auto bg-transparent text-white border-white hover:bg-white/10"
            >
              Falar com Vendas
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900 text-gray-400">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Logo Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white">ERP Financeiro DOF</span>
              </div>
              <p className="text-sm">
                Gestão financeira inteligente para empresas que querem crescer.
              </p>
            </div>

            {/* Product Column */}
            <div>
              <h3 className="font-semibold text-white mb-4">Produto</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#recursos" className="hover:text-white transition-colors">Recursos</a></li>
                <li><a href="#precos" className="hover:text-white transition-colors">Preços</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Segurança</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrações</a></li>
              </ul>
            </div>

            {/* Company Column */}
            <div>
              <h3 className="font-semibold text-white mb-4">Empresa</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Sobre</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Carreiras</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contato</a></li>
              </ul>
            </div>

            {/* Legal Column */}
            <div>
              <h3 className="font-semibold text-white mb-4">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Termos de Uso</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacidade</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookies</a></li>
                <li><a href="#" className="hover:text-white transition-colors">LGPD</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm">© 2024 ERP Financeiro DOF. Todos os direitos reservados.</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white transition-colors">Facebook</a>
              <a href="#" className="hover:text-white transition-colors">Twitter</a>
              <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
              <a href="#" className="hover:text-white transition-colors">Instagram</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
