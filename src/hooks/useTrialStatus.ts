import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TrialStatus {
  isActive: boolean;
  isTrial: boolean;
  isTrialOwner: boolean;
  daysRemaining: number;
  trialEndDate: Date | null;
  subscriptionStatus: string;
  hasExpired: boolean;
  canAccess: boolean;
}

export const useTrialStatus = () => {
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrialStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setLoading(false);
          return;
        }

        // Buscar informações do perfil e da empresa
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('company_id, is_trial_owner')
          .eq('id', user.id)
          .single();

        if (!profile?.company_id) {
          setLoading(false);
          return;
        }

        const { data: company } = await supabase
          .from('companies')
          .select('is_trial, trial_start_date, trial_end_date, subscription_status')
          .eq('id', profile.company_id)
          .single();

        if (!company) {
          setLoading(false);
          return;
        }

        const now = new Date();
        const trialEndDate = company.trial_end_date ? new Date(company.trial_end_date) : null;
        const hasExpired = company.is_trial && trialEndDate && trialEndDate < now;
        
        // Calcular dias restantes
        let daysRemaining = 0;
        if (trialEndDate && company.is_trial) {
          const diffTime = trialEndDate.getTime() - now.getTime();
          daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        // Determinar se o usuário pode acessar
        // Se NÃO é trial owner e o trial expirou, ainda pode acessar (foi convidado pelo master)
        const canAccess = !company.is_trial || 
                         !hasExpired || 
                         (hasExpired && !profile.is_trial_owner);

        setTrialStatus({
          isActive: !hasExpired,
          isTrial: company.is_trial,
          isTrialOwner: profile.is_trial_owner || false,
          daysRemaining: Math.max(0, daysRemaining),
          trialEndDate,
          subscriptionStatus: company.subscription_status || 'trial',
          hasExpired,
          canAccess
        });
      } catch (error) {
        console.error('Erro ao buscar status do trial:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrialStatus();

    // Atualizar a cada 5 minutos
    const interval = setInterval(fetchTrialStatus, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return { trialStatus, loading };
};
