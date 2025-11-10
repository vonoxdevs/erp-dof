import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, BarChart3, Shield, Zap } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { authService } from "@/services/authService";
import { sanitizeError } from "@/lib/errorMapping";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  
  // Estado do modal de recuperação
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error("Preencha todos os campos");
      return;
    }

    setLoading(true);
    try {
      // Detectar senha padrão antes de fazer login
      const isDefaultPassword = formData.password === "Admin123@";
      
      await login(formData.email, formData.password);
      
      // Se login foi bem-sucedido e senha é padrão, redirecionar para mudança de senha
      if (isDefaultPassword) {
        toast.warning("Senha padrão detectada!", {
          description: "Por segurança, você deve alterar sua senha agora."
        });
        setTimeout(() => {
          navigate('/forced-password-change');
        }, 1500);
      }
    } catch (error) {
      // Erro já tratado no hook
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar email
    if (!resetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) {
      toast.error("Por favor, digite um email válido");
      return;
    }

    // Verificar cooldown
    if (cooldown > 0) {
      toast.error(`Aguarde ${cooldown} segundos antes de enviar novamente`);
      return;
    }

    setResetLoading(true);

    try {
      await authService.resetPassword(resetEmail);
      
      toast.success("Email enviado com sucesso!", {
        description: "Verifique sua caixa de entrada e também a pasta de SPAM",
        duration: 8000,
      });

      // Iniciar cooldown de 60 segundos
      setCooldown(60);
      const interval = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Fechar modal após 2 segundos
      setTimeout(() => {
        setResetModalOpen(false);
        setResetEmail("");
      }, 2000);
    } catch (error: any) {
      console.error("Erro ao enviar email de recuperação:", error);
      toast.error(sanitizeError(error));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20 p-4 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400/20 rounded-full blur-3xl"></div>
      
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-12 items-center relative z-10">
        {/* Lado esquerdo - Branding */}
        <div className="hidden md:block space-y-8 animate-fade-in">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                ERP Financeiro DOF
              </h1>
              <p className="text-sm text-muted-foreground">Gestão Financeira Inteligente</p>
            </div>
          </Link>
          
          <div className="space-y-6">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-blue-100 dark:border-blue-900/50 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Dashboard em Tempo Real</h3>
                <p className="text-sm text-muted-foreground">KPIs atualizados e gráficos interativos para decisões rápidas</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-purple-100 dark:border-purple-900/50 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Automação Financeira</h3>
                <p className="text-sm text-muted-foreground">Contratos recorrentes e categorização automática</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-green-100 dark:border-green-900/50 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Segurança Total</h3>
                <p className="text-sm text-muted-foreground">Criptografia e isolamento multi-tenant</p>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-border">
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div>
                <span className="text-2xl font-bold text-foreground">500+</span>
                <p>Empresas</p>
              </div>
              <div>
                <span className="text-2xl font-bold text-foreground">50K+</span>
                <p>Transações/mês</p>
              </div>
              <div>
                <span className="text-2xl font-bold text-foreground">99.9%</span>
                <p>Uptime</p>
              </div>
            </div>
          </div>
        </div>

        {/* Lado direito - Form de Login */}
        <Card className="backdrop-blur-sm bg-white/95 dark:bg-gray-900/95 shadow-2xl border-0 animate-scale-in">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Bem-vindo de volta</CardTitle>
            <CardDescription className="text-base">
              Entre com suas credenciais para acessar sua conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  disabled={loading}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
                  <Dialog open={resetModalOpen} onOpenChange={setResetModalOpen}>
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        className="text-sm text-primary hover:underline"
                      >
                        Esqueceu?
                      </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Recuperar Senha</DialogTitle>
                        <DialogDescription>
                          Digite seu email para receber instruções de recuperação de senha
                        </DialogDescription>
                      </DialogHeader>
                      
                      <form onSubmit={handleResetPassword} className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Input
                            type="email"
                            placeholder="seu@email.com"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            required
                            disabled={resetLoading}
                          />
                        </div>

                        {/* Instruções visuais */}
                        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                          <p className="text-xs font-medium">📧 Como funciona:</p>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            <li>1. ✅ Digite seu email cadastrado</li>
                            <li>2. 📨 Receba o link de recuperação</li>
                            <li>3. 🔍 Verifique também a pasta de SPAM</li>
                            <li>4. 🔗 Clique no link do email</li>
                            <li>5. 🔑 Defina sua nova senha</li>
                          </ul>
                          <p className="text-xs text-muted-foreground pt-1">
                            ⚠️ O link expira em 1 hora
                          </p>
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setResetModalOpen(false)}
                            disabled={resetLoading}
                          >
                            Cancelar
                          </Button>
                          <Button type="submit" disabled={resetLoading || cooldown > 0}>
                            {resetLoading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Enviando...
                              </>
                            ) : cooldown > 0 ? (
                              `Aguarde ${cooldown}s`
                            ) : (
                              "Enviar Email"
                            )}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  disabled={loading}
                  required
                  className="h-11"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 text-base font-medium" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Novo por aqui?
                  </span>
                </div>
              </div>

              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Não tem uma conta?{" "}
                  <Link to="/register" className="text-primary hover:underline font-semibold">
                    Criar conta grátis
                  </Link>
                </p>
                <Button
                  type="button"
                  variant="link"
                  className="text-xs"
                  onClick={() => navigate('/auth?tab=confirming')}
                >
                  Não recebeu o email de confirmação?
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
