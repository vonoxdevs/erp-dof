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
        .single();

      if (error) {
        console.error('Erro ao buscar perfil:', error);
        throw new Error('Perfil não encontrado. Por favor, contate o administrador.');
      }

      if (!profile) {
        throw new Error('Perfil não encontrado. Por favor, faça logout e login novamente.');
      }

      return profile as UserProfile;
    },
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
};
