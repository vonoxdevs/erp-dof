import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Shield, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ForcedPasswordChangePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (formData.newPassword.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    if (formData.newPassword === "Admin123@") {
      toast.error("Você deve escolher uma senha diferente da senha padrão");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    setLoading(true);

    try {
      // Atualizar senha no Supabase
      const { error } = await supabase.auth.updateUser({
        password: formData.newPassword,
      });

      if (error) throw error;

      toast.success("Senha alterada com sucesso!", {
        description: "Você será redirecionado para o dashboard"
      });

      // Redirecionar após 2 segundos
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error: any) {
      console.error("Erro ao alterar senha:", error);
      toast.error(error.message || "Erro ao alterar senha. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-destructive/5 p-4">
      <Card className="max-w-md w-full shadow-xl">
        <CardHeader className="space-y-3">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl text-center">
            Alterar Senha Obrigatório
          </CardTitle>
          <CardDescription className="text-center">
            Por segurança, você deve alterar a senha padrão antes de continuar
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Senha Padrão Detectada</AlertTitle>
            <AlertDescription>
              Você está usando a senha padrão do sistema. Por favor, escolha uma senha segura e única.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha *</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={formData.newPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                disabled={loading}
                required
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Escolha uma senha forte com letras, números e símbolos
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Digite a senha novamente"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                disabled={loading}
                required
                className="h-11"
              />
            </div>

            {/* Requisitos de senha */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium">📋 Requisitos da senha:</p>
              <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                <li className={formData.newPassword.length >= 6 ? "text-success" : ""}>
                  • Mínimo 6 caracteres
                </li>
                <li className={formData.newPassword !== "Admin123@" && formData.newPassword.length > 0 ? "text-success" : ""}>
                  • Diferente da senha padrão
                </li>
                <li className={formData.newPassword === formData.confirmPassword && formData.newPassword.length > 0 ? "text-success" : ""}>
                  • Senhas devem coincidir
                </li>
              </ul>
            </div>

            <Button 
              type="submit" 
              className="w-full h-11" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Alterando senha...
                </>
              ) : (
                "Alterar Senha e Continuar"
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                supabase.auth.signOut();
                navigate('/login');
              }}
            >
              Sair e fazer login novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
