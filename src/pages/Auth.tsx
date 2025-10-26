import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Building2, TrendingUp, Shield, Zap, Mail, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { sanitizeError } from "@/lib/errorMapping";

type AuthState = 'signup' | 'signin' | 'confirming' | 'confirmed';

// Validation schemas
const signInSchema = z.object({
  email: z.string()
    .trim()
    .min(1, "Email é obrigatório")
    .email("Email inválido")
    .max(255, "Email deve ter no máximo 255 caracteres"),
  password: z.string()
    .min(6, "A senha deve ter no mínimo 6 caracteres")
    .max(72, "A senha deve ter no máximo 72 caracteres"),
});

const signUpSchema = z.object({
  fullName: z.string()
    .trim()
    .min(1, "Nome completo é obrigatório")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  email: z.string()
    .trim()
    .min(1, "Email é obrigatório")
    .email("Email inválido")
    .max(255, "Email deve ter no máximo 255 caracteres"),
  password: z.string()
    .min(6, "A senha deve ter no mínimo 6 caracteres")
    .max(72, "A senha deve ter no máximo 72 caracteres"),
});

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [authState, setAuthState] = useState<AuthState>('signup');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    checkAuth();
    
    // Verificar se há erro na URL (redirect do callback)
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, []);

  // Cooldown para reenviar email
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log('✅ Usuário já autenticado:', session.user.id);
        console.log('📧 Email confirmado:', session.user.email_confirmed_at ? 'Sim' : 'Não');
        
        // Se email não confirmado, mostrar tela de confirmação
        if (!session.user.email_confirmed_at) {
          setAuthState('confirming');
          setEmail(session.user.email || '');
          return;
        }

        // Verificar se já tem empresa
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('company_id')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profile?.company_id) {
          navigate('/dashboard');
        } else {
          navigate('/onboarding');
        }
      }
    } catch (err) {
      console.error('❌ Erro ao verificar autenticação:', err);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('🚀 Fazendo login:', email);

      const validationResult = signInSchema.safeParse({ email, password });

      if (!validationResult.success) {
        const errorMessages = validationResult.error.errors.map(err => err.message).join(", ");
        throw new Error(errorMessages);
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: validationResult.data.email,
        password: validationResult.data.password,
      });

      if (signInError) {
        console.error('❌ Erro no login:', signInError);
        throw signInError;
      }

      if (!data.user) {
        throw new Error('Erro ao fazer login');
      }

      console.log('✅ Login bem-sucedido:', data.user.id);
      console.log('📧 Email confirmado:', data.user.email_confirmed_at ? 'Sim' : 'Não');

      // Verificar se email foi confirmado
      if (!data.user.email_confirmed_at) {
        console.log('⚠️ Email ainda não confirmado');
        setAuthState('confirming');
        setSuccess('Verifique seu email para confirmar a conta antes de continuar.');
        return;
      }

      // Verificar se tem empresa
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', data.user.id)
        .maybeSingle();

      toast.success("Login realizado com sucesso!");

      if (profile?.company_id) {
        console.log('✅ Usuário tem empresa, redirecionando para dashboard');
        navigate('/dashboard');
      } else {
        console.log('ℹ️ Usuário precisa fazer onboarding');
        navigate('/onboarding');
      }

    } catch (err: any) {
      console.error('❌ Erro completo:', err);
      
      // Mensagens de erro amigáveis
      if (err.message?.includes('Invalid login credentials')) {
        setError('Email ou senha incorretos. Tente novamente.');
      } else if (err.message?.includes('Email not confirmed')) {
        setError('Email não confirmado. Verifique sua caixa de entrada.');
        setAuthState('confirming');
      } else {
        setError(err.message || 'Erro ao fazer login. Tente novamente.');
      }
      toast.error(sanitizeError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validações
      if (password.length < 6) {
        throw new Error('A senha deve ter no mínimo 6 caracteres');
      }

      if (password !== confirmPassword) {
        throw new Error('As senhas não coincidem');
      }

      console.log('🚀 Criando conta para:', email);

      const validationResult = signUpSchema.safeParse({ fullName, email, password });

      if (!validationResult.success) {
        const errorMessages = validationResult.error.errors.map(err => err.message).join(", ");
        throw new Error(errorMessages);
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: validationResult.data.email,
        password: validationResult.data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: validationResult.data.fullName,
            email_confirmed: false
          },
        },
      });

      if (signUpError) {
        console.error('❌ Erro no signup:', signUpError);
        throw signUpError;
      }

      if (!data.user) {
        throw new Error('Erro ao criar usuário');
      }

      console.log('✅ Conta criada:', data.user.id);
      console.log('📧 Email de confirmação enviado para:', email);

      // Mudar para estado de confirmação
      setAuthState('confirming');
      setSuccess('Email de confirmação enviado! Verifique sua caixa de entrada.');
      toast.success('Conta criada! Verifique seu email para confirmar.');

    } catch (err: any) {
      console.error('❌ Erro completo:', err);
      
      // Mensagens de erro amigáveis
      if (err.message?.includes('already registered')) {
        setError('Este email já está cadastrado. Tente fazer login.');
      } else if (err.message?.includes('invalid email')) {
        setError('Email inválido. Verifique e tente novamente.');
      } else if (err.message?.includes('weak password')) {
        setError('Senha muito fraca. Use no mínimo 6 caracteres.');
      } else {
        setError(err.message || 'Erro ao criar conta. Tente novamente.');
      }
      toast.error(sanitizeError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (resendCooldown > 0) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('📧 Reenviando email de confirmação para:', email);

      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (resendError) {
        console.error('❌ Erro ao reenviar:', resendError);
        throw resendError;
      }

      console.log('✅ Email reenviado com sucesso');
      setSuccess('Email reenviado! Verifique sua caixa de entrada e spam.');
      setResendCooldown(60); // 60 segundos de cooldown
      toast.success('Email reenviado com sucesso!');

    } catch (err: any) {
      console.error('❌ Erro completo:', err);
      setError(err.message || 'Erro ao reenviar email. Tente novamente.');
      toast.error(sanitizeError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckConfirmation = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Verificando confirmação de email...');

      // Forçar refresh da sessão
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();

      if (sessionError) {
        console.error('❌ Erro ao atualizar sessão:', sessionError);
        throw sessionError;
      }

      if (!session?.user) {
        throw new Error('Sessão não encontrada. Faça login novamente.');
      }

      console.log('📧 Status:', session.user.email_confirmed_at ? 'Confirmado' : 'Aguardando');

      if (session.user.email_confirmed_at) {
        console.log('✅ Email confirmado!');
        setAuthState('confirmed');
        setSuccess('Email confirmado com sucesso! Redirecionando...');
        toast.success('Email confirmado!');
        
        // Aguardar 2 segundos e redirecionar
        setTimeout(() => {
          navigate('/onboarding');
        }, 2000);
      } else {
        setError('Email ainda não foi confirmado. Verifique sua caixa de entrada.');
        toast.error('Email ainda não confirmado');
      }

    } catch (err: any) {
      console.error('❌ Erro completo:', err);
      setError(err.message || 'Erro ao verificar confirmação.');
      toast.error(sanitizeError(err));
    } finally {
      setLoading(false);
    }
  };

  // Render: Tela de Confirmação de Email
  if (authState === 'confirming') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="glass-strong max-w-md w-full p-8">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">
              Confirme seu Email
            </h1>
            <p className="text-muted-foreground">
              Enviamos um link de confirmação para:
            </p>
            <p className="text-primary font-semibold mt-2">
              {email}
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <p className="text-sm">
                📧 Verifique sua caixa de entrada e clique no link de confirmação.
              </p>
              <p className="text-sm mt-2">
                ⚠️ Não esqueça de verificar a pasta de spam!
              </p>
            </div>

            {success && (
              <div className="bg-success/10 border border-success/20 rounded-lg p-4">
                <p className="text-sm text-success">{success}</p>
              </div>
            )}

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button
              onClick={handleCheckConfirmation}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Já confirmei meu email
                </>
              )}
            </Button>

            <Button
              onClick={handleResendEmail}
              disabled={loading || resendCooldown > 0}
              variant="outline"
              className="w-full"
            >
              {resendCooldown > 0 
                ? `Reenviar email (${resendCooldown}s)` 
                : loading 
                  ? 'Enviando...' 
                  : 'Reenviar email de confirmação'}
            </Button>

            <Button
              onClick={() => {
                supabase.auth.signOut();
                setAuthState('signin');
                setError(null);
                setSuccess(null);
              }}
              variant="ghost"
              className="w-full"
            >
              Voltar para login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding */}
        <div className="hidden lg:block space-y-8 animate-fade-in">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Building2 className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-primary">LSFIN v2.0</span>
            </div>
            <h1 className="text-5xl font-bold tracking-tight">
              O ERP Financeiro
              <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Mais Avançado
              </span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Gestão financeira corporativa com IA nativa e automação inteligente
            </p>
          </div>

          <div className="grid gap-4">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-card/50 border border-border/50">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Multi-empresa</h3>
                <p className="text-sm text-muted-foreground">
                  Gerencie múltiplas empresas em uma única plataforma
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl bg-card/50 border border-border/50">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Automação Inteligente</h3>
                <p className="text-sm text-muted-foreground">
                  IA que categoriza, prevê e otimiza suas finanças
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl bg-card/50 border border-border/50">
              <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-info" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Segurança Enterprise</h3>
                <p className="text-sm text-muted-foreground">
                  Criptografia, auditoria e conformidade total
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Auth Form */}
        <Card className="glass-strong p-8 animate-scale-in">
          <Tabs value={authState === 'signin' || authState === 'signup' ? authState : 'signin'} onValueChange={(value) => {
            setAuthState(value as 'signin' | 'signup');
            setError(null);
            setSuccess(null);
            setConfirmPassword('');
          }} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar Conta</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-6">
                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                    <p className="text-destructive text-sm">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="bg-success/10 border border-success/20 rounded-lg p-3">
                    <p className="text-success text-sm">{success}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signin-password">Senha</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-6">
                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                    <p className="text-destructive text-sm">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="bg-success/10 border border-success/20 rounded-lg p-3">
                    <p className="text-success text-sm">{success}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nome Completo</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Seu nome"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    Mínimo 6 caracteres
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Confirmar Senha</Label>
                  <Input
                    id="signup-confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    "Criar Conta"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
