import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  FileText, 
  CreditCard,
  Receipt,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Check,
  Star,
  Shield,
  Clock,
  HeadphonesIcon,
  Lock
} from "lucide-react";
import { useState } from "react";

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  const testimonials = [
    {
      quote: "Aumentou o faturamento em mais de 300%",
      author: "Rafaella Sales",
      company: "Aclima",
      image: "👩‍💼"
    },
    {
      quote: "Resolvemos toda parte de Gestão Financeira",
      author: "Caetano Lipiani",
      company: "Alle Tecnologia",
      image: "👨‍💼"
    },
    {
      quote: "Consigo acessar de qualquer lugar",
      author: "Jhennifer Gomes",
      company: "Rastreadores Goman",
      image: "👩‍💻"
    }
  ];

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
        <nav className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">
                ERP Financeiro DOF
              </span>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <button 
                onClick={() => scrollToSection('funcionalidades')}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                Funcionalidades
              </button>
              <button 
                onClick={() => scrollToSection('planos')}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                Planos
              </button>
              <button 
                onClick={() => scrollToSection('conta-pj')}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                Conta PJ
              </button>
              <Link to="/login">
                <Button size="lg" className="shadow-lg">
                  Login
                </Button>
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
                  onClick={() => scrollToSection('funcionalidades')}
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors text-left"
                >
                  Funcionalidades
                </button>
                <button 
                  onClick={() => scrollToSection('planos')}
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors text-left"
                >
                  Planos
                </button>
                <button 
                  onClick={() => scrollToSection('conta-pj')}
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors text-left"
                >
                  Conta PJ
                </button>
                <Link to="/signup" className="w-full">
                  <Button size="lg" className="w-full">Criar Conta</Button>
                </Link>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-[60%_40%] gap-12 items-center">
            {/* Left Side - Content */}
            <div className="space-y-8 animate-fade-in">
              <h1 className="text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight text-foreground">
                Juntos a gente dá conta do seu{" "}
                <span className="text-primary">controle financeiro</span>
              </h1>
              
              <p className="text-xl lg:text-2xl text-muted-foreground leading-relaxed max-w-2xl">
                Um Sistema de ERP simples e seguro. É um sistema de gestão para controle financeiro da sua empresa em único lugar.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/signup">
                  <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg shadow-xl hover:shadow-2xl transition-all">
                    Começar agora
                  </Button>
                </Link>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="w-full sm:w-auto h-14 px-8 text-lg"
                  onClick={() => scrollToSection('funcionalidades')}
                >
                  Conhecer recursos
                </Button>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap gap-6 pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-5 h-5 text-primary" />
                  <span>Configuração rápida</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-5 h-5 text-primary" />
                  <span>Suporte brasileiro</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-5 h-5 text-primary" />
                  <span>Dados protegidos</span>
                </div>
              </div>
            </div>

            {/* Right Side - Mockup */}
            <div className="relative animate-fade-in lg:block hidden" style={{ animationDelay: '0.2s' }}>
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-3xl"></div>
                <Card className="relative p-8 shadow-2xl border-2">
                  <div className="aspect-[4/3] bg-gradient-to-br from-primary/10 via-background to-accent/10 rounded-2xl flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <TrendingUp className="w-20 h-20 text-primary mx-auto" />
                      <p className="text-xl font-semibold text-muted-foreground">Dashboard Preview</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="funcionalidades" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto space-y-20">
          {/* Feature 1 - Emissão de Notas Fiscais */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge className="w-fit">Emissão de Notas Fiscais</Badge>
              <h2 className="text-4xl lg:text-5xl font-bold leading-tight">
                Diga adeus às multas por falhas na emissão
              </h2>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Emita notas fiscais de forma rápida, fácil e segura. Sistema integrado com a SEFAZ garante que você nunca mais perca prazos ou tenha problemas com o fisco.
              </p>
              <Button size="lg" className="shadow-lg">
                <FileText className="w-5 h-5 mr-2" />
                Evite multas fiscais
              </Button>
            </div>
            <Card className="p-12 bg-gradient-to-br from-primary/5 to-accent/5">
              <div className="aspect-square flex items-center justify-center">
                <FileText className="w-32 h-32 text-primary" />
              </div>
            </Card>
          </div>

          {/* Feature 2 - Conta PJ */}
          <div id="conta-pj" className="grid lg:grid-cols-2 gap-12 items-center">
            <Card className="p-12 bg-gradient-to-br from-accent/10 to-primary/5 lg:order-1 order-2">
              <div className="aspect-square flex items-center justify-center">
                <CreditCard className="w-32 h-32 text-primary" />
              </div>
            </Card>
            <div className="space-y-6 lg:order-2 order-1">
              <Badge className="w-fit">Conta PJ Integrada</Badge>
              <h2 className="text-4xl lg:text-5xl font-bold leading-tight">
                Cobre, receba e pague em um só lugar
              </h2>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Conta digital completa para sua empresa. Faça transferências, pague fornecedores e receba de clientes tudo integrado ao seu sistema de gestão.
              </p>
              <Button size="lg" className="shadow-lg">
                <CreditCard className="w-5 h-5 mr-2" />
                Abra sua Conta PJ
              </Button>
            </div>
          </div>

          {/* Feature 3 - Cobrança Automatizada */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge className="w-fit">Cobrança Automatizada</Badge>
              <h2 className="text-4xl lg:text-5xl font-bold leading-tight">
                Mais agilidade e acertos na hora de faturar
              </h2>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Automatize o envio de cobranças, boletos e lembretes. Reduza a inadimplência e melhore seu fluxo de caixa com cobranças inteligentes e automatizadas.
              </p>
              <Button size="lg" className="shadow-lg">
                <Receipt className="w-5 h-5 mr-2" />
                Automatize suas cobranças
              </Button>
            </div>
            <Card className="p-12 bg-gradient-to-br from-primary/5 to-accent/5">
              <div className="aspect-square flex items-center justify-center">
                <Receipt className="w-32 h-32 text-primary" />
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Intermediária */}
      <section className="py-24 px-4 bg-gradient-to-br from-primary via-primary to-primary-glow text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2YzAgNC40MTgtMy41ODIgOC04IDhzLTgtMy41ODItOC04IDMuNTgyLTggOC04IDggMy41ODIgOCA4TTEgMTJjMC0yLjIwOS0xLjc5MS00LTQtNHMtNCAxLjc5MS00IDQgMS43OTEgNCA0IDQgNC0xLjc5MSA0LTQiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
        <div className="container mx-auto text-center relative z-10 space-y-8">
          <h2 className="text-4xl lg:text-5xl xl:text-6xl font-bold max-w-4xl mx-auto leading-tight">
            Deixe o ERP Financeiro DOF trabalhar por você!
          </h2>
          <p className="text-xl lg:text-2xl max-w-2xl mx-auto opacity-90">
            Simplifique sua gestão financeira e foque no crescimento do seu negócio
          </p>
          <Link to="/signup">
            <Button 
              size="lg" 
              variant="secondary"
              className="h-14 px-10 text-lg shadow-xl hover:shadow-2xl bg-white text-primary hover:bg-white/90"
            >
              Comece agora
            </Button>
          </Link>
          
          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-8 pt-8">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <span className="text-sm font-medium">Dados protegidos</span>
            </div>
            <div className="flex items-center gap-2">
              <HeadphonesIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Suporte brasileiro</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              <span className="text-sm font-medium">SSL/LGPD</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="planos" className="py-24 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl lg:text-5xl font-bold">
              Qual plano do ERP Financeiro DOF é o ideal pra você?
            </h2>
            <p className="text-xl text-muted-foreground">
              Escolha o plano perfeito para o tamanho da sua empresa
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Plano Controle */}
            <Card className="p-8 space-y-6 hover:shadow-xl transition-all">
              <div>
                <h3 className="text-2xl font-bold mb-2">Controle</h3>
                <p className="text-muted-foreground">Microempresas (ME)</p>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">R$ 309,90</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
                <p className="text-sm text-muted-foreground line-through">de R$ 499,90</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm">2 usuários inclusos</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm">Emissão de notas fiscais</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm">Gestão financeira completa</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm">Suporte via email</span>
                </div>
              </div>
              <Link to="/signup" className="w-full">
                <Button size="lg" variant="outline" className="w-full">
                  Escolher plano
                </Button>
              </Link>
            </Card>

            {/* Plano Avançado - Destaque */}
            <Card className="p-8 space-y-6 border-2 border-primary shadow-xl scale-105 relative">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Mais Popular</Badge>
              <div>
                <h3 className="text-2xl font-bold mb-2 text-primary">Avançado</h3>
                <p className="text-muted-foreground">Pequeno porte (EPP)</p>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-primary">R$ 399,90</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
                <p className="text-sm text-muted-foreground line-through">de R$ 649,90</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm">5 usuários inclusos</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm">Tudo do plano Controle</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm">Conta PJ integrada</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm">Cobrança automatizada</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm">Suporte prioritário</span>
                </div>
              </div>
              <Link to="/signup" className="w-full">
                <Button size="lg" className="w-full shadow-lg">
                  Escolher plano
                </Button>
              </Link>
            </Card>

            {/* Plano Performance */}
            <Card className="p-8 space-y-6 hover:shadow-xl transition-all">
              <div>
                <h3 className="text-2xl font-bold mb-2">Performance</h3>
                <p className="text-muted-foreground">Médio porte</p>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">R$ 719,90</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
                <p className="text-sm text-muted-foreground line-through">de R$ 929,90</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm">15 usuários inclusos</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm">Tudo do plano Avançado</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm">Relatórios avançados</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm">API de integração</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm">Gerente de conta dedicado</span>
                </div>
              </div>
              <Link to="/signup" className="w-full">
                <Button size="lg" variant="outline" className="w-full">
                  Escolher plano
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl lg:text-5xl font-bold">
              Menos planilha, mais história pra contar!
            </h2>
            <p className="text-xl text-muted-foreground">
              Veja o que nossos clientes têm a dizer
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Card className="p-12 text-center space-y-8 relative">
              <div className="flex items-center justify-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              
              <div className="text-6xl mb-6">{testimonials[currentTestimonial].image}</div>
              
              <blockquote className="text-2xl lg:text-3xl font-semibold italic text-foreground mb-6">
                "{testimonials[currentTestimonial].quote}"
              </blockquote>
              
              <div>
                <p className="font-bold text-lg">{testimonials[currentTestimonial].author}</p>
                <p className="text-muted-foreground">{testimonials[currentTestimonial].company}</p>
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-center gap-4 pt-6">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={prevTestimonial}
                  className="rounded-full"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <div className="flex gap-2">
                  {testimonials.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentTestimonial(i)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        i === currentTestimonial ? 'bg-primary w-8' : 'bg-muted-foreground/30'
                      }`}
                    />
                  ))}
                </div>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={nextTestimonial}
                  className="rounded-full"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Mobile App Section */}
      <section className="py-24 px-4 bg-gradient-to-br from-accent/10 via-primary/5 to-background relative overflow-hidden">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl lg:text-5xl font-bold leading-tight">
                Controle sua empresa de onde você estiver
              </h2>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Aplicativo mobile completo para iOS e Android. Acompanhe suas finanças, emita notas e gerencie seu negócio na palma da mão.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="shadow-lg">
                  <Smartphone className="w-5 h-5 mr-2" />
                  Baixar para iOS
                </Button>
                <Button size="lg" variant="outline">
                  <Smartphone className="w-5 h-5 mr-2" />
                  Baixar para Android
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl"></div>
              <div className="relative bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl p-12 flex items-center justify-center aspect-square">
                <Smartphone className="w-48 h-48 text-primary" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Blog/Learning Section */}
      <section className="py-24 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl lg:text-5xl font-bold">
              Aprenda com o ERP Financeiro DOF
            </h2>
            <p className="text-xl text-muted-foreground">
              Conteúdos exclusivos para ajudar seu negócio a crescer
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <Card className="overflow-hidden hover:shadow-xl transition-all group cursor-pointer">
              <div className="aspect-video bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                <FileText className="w-20 h-20 text-primary" />
              </div>
              <div className="p-6 space-y-3">
                <Badge>Gestão Financeira</Badge>
                <h3 className="text-2xl font-bold group-hover:text-primary transition-colors">
                  Como organizar o fluxo de caixa da sua empresa
                </h3>
                <p className="text-muted-foreground">
                  Aprenda as melhores práticas para manter suas finanças organizadas e evitar surpresas no final do mês.
                </p>
                <Button variant="link" className="p-0">
                  Ler mais →
                </Button>
              </div>
            </Card>

            <Card className="overflow-hidden hover:shadow-xl transition-all group cursor-pointer">
              <div className="aspect-video bg-gradient-to-br from-accent/10 to-primary/10 flex items-center justify-center">
                <Clock className="w-20 h-20 text-primary" />
              </div>
              <div className="p-6 space-y-3">
                <Badge>Produtividade</Badge>
                <h3 className="text-2xl font-bold group-hover:text-primary transition-colors">
                  5 dicas para economizar tempo na gestão financeira
                </h3>
                <p className="text-muted-foreground">
                  Descubra como automatizar processos e ganhar mais tempo para focar no crescimento do seu negócio.
                </p>
                <Button variant="link" className="p-0">
                  Ler mais →
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/50 border-t border-border py-16 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
            {/* Logo & Description */}
            <div className="lg:col-span-2 space-y-4">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">ERP Financeiro DOF</span>
              </Link>
              <p className="text-muted-foreground max-w-sm">
                Sistema completo de gestão financeira para pequenas e médias empresas. Simplifique sua gestão e foque no crescimento.
              </p>
            </div>

            {/* Produto */}
            <div className="space-y-4">
              <h4 className="font-semibold text-lg">Produto</h4>
              <ul className="space-y-2">
                <li><button onClick={() => scrollToSection('funcionalidades')} className="text-muted-foreground hover:text-primary transition-colors">Funcionalidades</button></li>
                <li><button onClick={() => scrollToSection('planos')} className="text-muted-foreground hover:text-primary transition-colors">Planos</button></li>
                <li><button onClick={() => scrollToSection('conta-pj')} className="text-muted-foreground hover:text-primary transition-colors">Conta PJ</button></li>
                <li><Link to="/login" className="text-muted-foreground hover:text-primary transition-colors">Acessar</Link></li>
              </ul>
            </div>

            {/* Empresa */}
            <div className="space-y-4">
              <h4 className="font-semibold text-lg">Empresa</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Sobre nós</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Carreiras</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Blog</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Contato</a></li>
              </ul>
            </div>

            {/* Suporte */}
            <div className="space-y-4">
              <h4 className="font-semibold text-lg">Suporte</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Central de ajuda</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Tutoriais</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">API</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Status</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2024 ERP Financeiro DOF. Todos os direitos reservados.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-primary transition-colors">Privacidade</a>
              <a href="#" className="hover:text-primary transition-colors">Termos</a>
              <a href="#" className="hover:text-primary transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
