import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { authService } from "@/services/authService";
import { sanitizeError } from "@/lib/errorMapping";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);
  const [passwordStrength, setPasswordStrength] = useState<"weak" | "medium" | "strong">("weak");

  // Verificar se há um token válido na URL
  useEffect(() => {
    const checkRecoveryToken = async () => {
      try {
        // Verificar se há parâmetros de recuperação na URL
        const hashParams = new URLSearchParams(location.hash.slice(1));
        const type = hashParams.get('type');
        
        if (type === 'recovery') {
          // Verificar se o usuário está autenticado (token válido)
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            setIsValidToken(true);
          } else {
            toast({
              title: "Link inválido ou expirado",
              description: "Solicite um novo link de recuperação de senha",
              variant: "destructive",
            });
            setTimeout(() => navigate("/login"), 3000);
          }
        } else {
          // Se não há token de recuperação, redirecionar para login
          toast({
            title: "Link de recuperação necessário",
            description: "Use o link enviado por email para redefinir sua senha",
            variant: "destructive",
          });
          setTimeout(() => navigate("/login"), 3000);
        }
      } catch (error) {
        console.error("Erro ao verificar token:", error);
        toast({
          title: "Erro ao verificar link",
          description: "Tente solicitar um novo link de recuperação",
          variant: "destructive",
        });
        setTimeout(() => navigate("/login"), 3000);
      } finally {
        setCheckingToken(false);
      }
    };

    checkRecoveryToken();
  }, [location, navigate]);

  useEffect(() => {
    // Calcular força da senha
    const password = formData.password;
    if (password.length === 0) {
      setPasswordStrength("weak");
    } else if (password.length < 8) {
      setPasswordStrength("weak");
    } else if (password.length < 12 || !/\d/.test(password) || !/[A-Z]/.test(password)) {
      setPasswordStrength("medium");
    } else {
      setPasswordStrength("strong");
    }
  }, [formData.password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (formData.password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter no mínimo 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "As senhas digitadas não são iguais",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      await authService.updatePassword(formData.password);
      
      toast({
        title: "✅ Senha redefinida com sucesso!",
        description: "Você já pode fazer login com sua nova senha",
        duration: 5000,
      });

      // Aguardar 2 segundos e redirecionar
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error: any) {
      console.error("Erro ao redefinir senha:", error);
      toast({
        title: "Erro ao redefinir senha",
        description: sanitizeError(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStrengthColor = () => {
    switch (passwordStrength) {
      case "weak":
        return "bg-destructive";
      case "medium":
        return "bg-warning";
      case "strong":
        return "bg-success";
    }
  };

  const getStrengthWidth = () => {
    switch (passwordStrength) {
      case "weak":
        return "w-1/3";
      case "medium":
        return "w-2/3";
      case "strong":
        return "w-full";
    }
  };

  const getStrengthLabel = () => {
    switch (passwordStrength) {
      case "weak":
        return "Fraca";
      case "medium":
        return "Média";
      case "strong":
        return "Forte";
    }
  };

  if (checkingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Verificando link de recuperação...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-2 text-center">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-2">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Link Inválido</CardTitle>
            <CardDescription>
              O link de recuperação está inválido ou expirado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate("/login")} 
              className="w-full"
            >
              Voltar para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Redefinir Senha</CardTitle>
          <CardDescription>
            Crie uma nova senha segura para sua conta
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Alert className="mb-4">
            <AlertDescription className="text-sm">
              Você está redefinindo sua senha. Após concluir, use a nova senha para fazer login.
            </AlertDescription>
          </Alert>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nova senha */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Nova senha
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Digite sua nova senha"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Indicador de força da senha */}
              {formData.password && (
                <div className="space-y-1">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${getStrengthColor()} ${getStrengthWidth()}`}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Força: <span className="font-medium">{getStrengthLabel()}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Confirmar senha */}
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirme a senha
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Digite novamente sua senha"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Indicador de senhas iguais */}
              {formData.confirmPassword && (
                <div className="flex items-center gap-1.5">
                  {formData.password === formData.confirmPassword ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                      <p className="text-xs text-success">Senhas conferem</p>
                    </>
                  ) : (
                    <p className="text-xs text-destructive">Senhas não conferem</p>
                  )}
                </div>
              )}
            </div>

            {/* Dicas de senha */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
              <p className="text-xs font-medium text-foreground">Dicas para uma senha forte:</p>
              <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                <li>Mínimo de 8 caracteres</li>
                <li>Combine letras maiúsculas e minúsculas</li>
                <li>Inclua números e caracteres especiais</li>
              </ul>
            </div>

            {/* Botão de submit */}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin mr-2" />
                  Redefinindo...
                </>
              ) : (
                "Redefinir Senha"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPasswordPage;
