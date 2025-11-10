import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface CompanyData {
  name: string;
  legal_name: string;
  cnpj: string;
  email: string;
  phone?: string;
  industry?: string;
  size?: string;
}

interface AddressData {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

interface ResponsibleData {
  name: string;
  cpf: string;
  phone: string;
  email: string;
  position: string;
}

interface OnboardingData {
  company: CompanyData;
  address: AddressData;
  responsible: ResponsibleData;
}

export const useOnboarding = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const completeOnboarding = async (data: OnboardingData) => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔍 [Onboarding] Iniciando processo...');
      
      // VALIDAÇÃO 1: Verificar session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ [Onboarding] Erro ao obter session:', sessionError);
        throw new Error('Erro de autenticação. Faça login novamente.');
      }
      
      if (!session) {
        console.error('❌ [Onboarding] Nenhuma session ativa');
        throw new Error('Você precisa estar autenticado. Faça login novamente.');
      }

      console.log('✅ [Onboarding] Session ativa:', session.user.id);

      // VALIDAÇÃO 3: Verificar se já tem empresa
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', session.user.id)
        .maybeSingle();

      if (existingProfile?.company_id) {
        console.log('⚠️ [Onboarding] Usuário já tem empresa, redirecionando...');
        toast.info('Você já possui uma empresa cadastrada.');
        navigate('/dashboard');
        return { success: false, error: 'Você já possui uma empresa cadastrada.' };
      }

      console.log('✅ [Onboarding] Validações OK, chamando Edge Function...');
      console.log('📦 [Onboarding] Dados:', {
        company_name: data.company.name,
        cnpj: data.company.cnpj,
        responsible_name: data.responsible.name
      });

      // Chamar Edge Function com token
      const { data: result, error: functionError } = await supabase.functions.invoke('onboarding', {
        body: data,
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      console.log('📥 [Onboarding] Resposta da função:', result);
      console.log('📥 [Onboarding] Erro da função:', functionError);

      // Quando a edge function retorna status 400, o Supabase coloca o corpo da resposta em 'result'
      // e o erro genérico em 'functionError'
      if (result?.error) {
        console.error('❌ [Onboarding] Erro no resultado:', result.error);
        // Priorizar 'details' se existir, senão usar 'error'
        const errorMessage = result.details || result.error;
        throw new Error(errorMessage);
      }

      // Se houver erro na chamada da função mas não tem result.error
      if (functionError) {
        console.error('❌ [Onboarding] Erro da função:', functionError);
        throw new Error(functionError.message || 'Erro ao processar onboarding.');
      }

      if (!result?.success) {
        console.error('❌ [Onboarding] Resultado não indica sucesso');
        throw new Error('Erro ao criar empresa. Tente novamente.');
      }

      console.log('✅ [Onboarding] Concluído com sucesso!');
      console.log('📊 [Onboarding] Empresa criada:', result.company_id);

      toast.success('Empresa cadastrada com sucesso! Redirecionando...');
      
      // Recarregar sessão para atualizar dados do usuário
      await supabase.auth.refreshSession();
      
      // Pequeno delay para garantir que o toast seja visto
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1500);
      
      return { success: true, data: result };
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao completar onboarding. Tente novamente.';
      console.error('❌ [Onboarding] ERRO COMPLETO:', {
        message: err.message,
        stack: err.stack,
        details: err
      });
      
      setError(errorMessage);
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  return {
    completeOnboarding,
    loading,
    error
  };
};
