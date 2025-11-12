import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { validateCPF } from '@/lib/brazilian-validations';
import { getPasswordStrength } from '@/lib/brazilian-validations';
import { Progress } from '@/components/ui/progress';

export default function SignUpForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    cpf: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const passwordStrength = getPasswordStrength(formData.password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (!formData.fullName.trim()) {
      toast.error('Nome completo é obrigatório');
      return;
    }

    if (!validateCPF(formData.cpf)) {
      toast.error('CPF inválido');
      return;
    }

    if (passwordStrength.strength < 3) {
      toast.error('Senha muito fraca. Use maiúsculas, minúsculas, números e símbolos.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setLoading(true);

    try {
      console.log('🚀 Criando usuário...');

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            cpf: formData.cpf,
            phone: formData.phone
          },
          emailRedirectTo: `${window.location.origin}/login`
        }
      });

      if (signUpError) {
        const errorMsg = signUpError.message?.toLowerCase() || '';
        if (errorMsg.includes('already') || errorMsg.includes('user already registered')) {
          throw new Error('Este e-mail já está cadastrado. Faça login ou use outro e-mail.');
        }
        if (errorMsg.includes('weak') || errorMsg.includes('password')) {
          throw new Error('Senha muito fraca. Use maiúsculas, minúsculas, números e símbolos.');
        }
        throw new Error(signUpError.message || 'Erro ao criar conta');
      }

      if (!authData.user) {
        throw new Error('Erro ao criar usuário');
      }

      console.log('✅ Usuário criado:', authData.user.id);

      // Se temos sessão (email confirmation OFF), redirecionar para onboarding
      if (authData.session) {
        toast.success('Conta criada! Redirecionando para cadastro da empresa...');
        setTimeout(() => {
          navigate('/onboarding', { replace: true });
        }, 1500);
      } else {
        // Email confirmation está ON
        toast.success(
          'Conta criada! Verifique seu e-mail para confirmar. Após confirmar, faça login para cadastrar sua empresa.',
          { duration: 7000 }
        );
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 2000);
      }

    } catch (error: any) {
      console.error('Erro ao criar conta:', error);
      toast.error(error.message || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
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
              <p className="text-sm text-muted-foreground">Comece seu Teste Grátis</p>
            </div>
          </Link>
          
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">
              3 Dias de Teste Grátis
            </h2>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                Sem compromisso ou cartão de crédito
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                Acesso completo a todas as funcionalidades
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                Configure em menos de 5 minutos
              </li>
            </ul>
          </div>
        </div>

        {/* Lado direito - Form de Cadastro */}
        <Card className="backdrop-blur-sm bg-white/95 dark:bg-gray-900/95 shadow-2xl border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Criar sua conta</CardTitle>
            <CardDescription className="text-base">
              Preencha seus dados para começar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Seu nome completo"
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  disabled={loading}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    type="text"
                    placeholder="000.000.000-00"
                    value={formData.cpf}
                    onChange={(e) => setFormData(prev => ({ ...prev, cpf: e.target.value }))}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formData.password && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Progress value={passwordStrength.strength * 25} className="h-1.5" />
                      <span className={`text-xs font-medium ${passwordStrength.color}`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Use maiúsculas, minúsculas, números e símbolos
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 text-base font-medium" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  "Criar Conta Grátis"
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Já tem uma conta?{' '}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Fazer login
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
