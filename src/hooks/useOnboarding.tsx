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
      // Obter sessão atual
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Sessão não encontrada. Faça login novamente.');
      }

      // Chamar edge function com token de autenticação
      const { data: result, error: invokeError } = await supabase.functions.invoke('onboarding', {
        body: data,
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (invokeError) {
        throw invokeError;
      }

      if (result.error) {
        throw new Error(result.error);
      }

      toast.success('Onboarding concluído com sucesso!');
      navigate('/dashboard');
      
      return { success: true, data: result };
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao completar onboarding';
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
