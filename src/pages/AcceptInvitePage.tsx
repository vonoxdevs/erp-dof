import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invite, setInvite] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Token de convite inválido');
      setLoading(false);
      return;
    }

    loadInvite();
  }, [token]);

  const loadInvite = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Buscando convite com token:', token);
      
      const { data, error: inviteError } = await supabase
        .from('user_invites')
        .select('*')
        .eq('token', token)
        .is('accepted_at', null)
        .single();

      console.log('📨 Resultado da busca:', { data, error: inviteError });

      if (inviteError || !data) {
        console.error('❌ Erro ao buscar convite:', inviteError);
        throw new Error('Convite não encontrado ou já foi aceito');
      }

      // Verificar se expirou
      const expiresAt = new Date(data.expires_at);
      const now = new Date();
      console.log('⏰ Verificando expiração:', { expiresAt, now, expired: expiresAt < now });
      
      if (expiresAt < now) {
        throw new Error('Este convite expirou');
      }

      console.log('✅ Convite válido:', data);
      setInvite(data);
    } catch (err: any) {
      console.error('❌ Erro ao carregar convite:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    try {
      setSubmitting(true);

      // 1. Criar conta do usuário
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: invite.email,
        password: password,
        options: {
          data: {
            full_name: invite.full_name,
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('Erro ao criar usuário');

      // 2. Criar perfil do usuário
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          full_name: invite.full_name,
          company_id: invite.company_id,
          permissions: invite.permissions,
        });

      if (profileError) throw profileError;

      // 3. Criar role do usuário
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: invite.role,
        });

      if (roleError) throw roleError;

      // 4. Marcar convite como aceito
      const { error: updateError } = await supabase
        .from('user_invites')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invite.id);

      if (updateError) throw updateError;

      toast.success('Conta criada com sucesso!');
      
      // Aguardar um pouco e redirecionar
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (err: any) {
      console.error('Error accepting invite:', err);
      toast.error(err.message || 'Erro ao aceitar convite');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Verificando convite...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <XCircle className="h-6 w-6 text-destructive" />
              <CardTitle>Convite Inválido</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => navigate('/login')} className="w-full">
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-accent" />
            <CardTitle>Aceitar Convite</CardTitle>
          </div>
          <CardDescription>
            Você foi convidado para fazer parte da empresa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAcceptInvite} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input value={invite?.full_name || ''} disabled />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={invite?.email || ''} disabled />
            </div>

            <div className="space-y-2">
              <Label>Cargo</Label>
              <Input value={invite?.role || ''} disabled className="capitalize" />
            </div>

            <div className="border-t pt-4">
              <div className="space-y-2 mb-4">
                <Label htmlFor="password">Senha *</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Digite a senha novamente"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando conta...
                </>
              ) : (
                'Aceitar Convite e Criar Conta'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
