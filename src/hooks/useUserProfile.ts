import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UserProfile {
  id: string;
  company_id: string;
  full_name: string;
  permissions: Record<string, any>;
  avatar_url?: string;
  last_login_at?: string;
  created_at?: string;
  updated_at?: string;
}

export const useUserProfile = () => {
  return useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar perfil:', error);
        throw new Error('Erro ao carregar perfil. Tente novamente.');
      }

      if (!profile) {
        // Perfil não existe, aguardar criação pelo trigger
        throw new Error('Perfil está sendo criado. Por favor, aguarde alguns segundos.');
      }

      return profile as UserProfile;
    },
    retry: 3, // Tentar 3 vezes antes de falhar
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Delay exponencial até 5 segundos
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
};
