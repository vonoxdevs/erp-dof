import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      const code = searchParams.get('code');
      const type = searchParams.get('type');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (error) {
        console.error('❌ Erro no callback:', error, errorDescription);
        toast.error('Erro ao confirmar email: ' + (errorDescription || error));
        navigate('/auth?error=' + encodeURIComponent(errorDescription || error));
        return;
      }

      if (!code) {
        console.error('❌ Código não encontrado no callback');
        navigate('/auth?error=' + encodeURIComponent('Código de confirmação inválido'));
        return;
      }

      console.log('🔄 Processando callback...');
      console.log('🔍 Tipo de callback:', type);

      // Se for recuperação de senha, NÃO criar sessão ainda
      // Apenas validar o token e redirecionar para a página de reset
      if (type === 'recovery') {
        console.log('🔑 Link de recuperação detectado');
        
        // Trocar o código por uma sessão para validar o token
        const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

        if (sessionError) {
          console.error('❌ Erro ao validar token de recuperação:', sessionError);
          toast.error('Link de recuperação inválido ou expirado');
          navigate('/login');
          return;
        }

        if (!data.session) {
          console.error('❌ Token de recuperação inválido');
          toast.error('Link de recuperação inválido');
          navigate('/login');
          return;
        }

        console.log('✅ Token de recuperação válido');
        toast.success('Link de recuperação validado! Defina sua nova senha.');
        
        // Redirecionar para a página de reset com o hash indicando que é recovery
        navigate('/reset-password#type=recovery');
        return;
      }

      // Para outros tipos de callback (signup, etc), criar sessão normalmente
      console.log('🔄 Trocando código por sessão...');
      const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

      if (sessionError) {
        console.error('❌ Erro ao trocar código:', sessionError);
        toast.error('Erro ao confirmar email: ' + sessionError.message);
        navigate('/auth?error=' + encodeURIComponent(sessionError.message));
        return;
      }

      if (!data.session) {
        console.error('❌ Sessão não criada após trocar código');
        navigate('/auth?error=' + encodeURIComponent('Erro ao criar sessão'));
        return;
      }

      console.log('✅ Email confirmado com sucesso:', data.user?.email);
      console.log('📧 Email confirmado em:', data.user?.email_confirmed_at);

      toast.success('Email confirmado com sucesso!');

      // Verificar se já tem empresa
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profile?.company_id) {
        console.log('✅ Usuário já tem empresa, redirecionando para dashboard');
        navigate('/dashboard');
      } else {
        console.log('ℹ️ Usuário precisa fazer onboarding');
        navigate('/onboarding');
      }

    } catch (err: any) {
      console.error('❌ Erro no callback:', err);
      toast.error('Erro ao processar confirmação: ' + err.message);
      navigate('/auth?error=' + encodeURIComponent(err.message || 'Erro desconhecido'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
      <div className="text-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
        <h2 className="text-xl font-semibold">Confirmando seu email...</h2>
        <p className="text-muted-foreground">Aguarde enquanto processamos sua confirmação.</p>
      </div>
    </div>
  );
};

export default AuthCallback;
