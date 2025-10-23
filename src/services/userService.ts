import { supabase } from "@/integrations/supabase/client";

/**
 * Obtém o company_id do usuário autenticado
 * Lança erro se o usuário não estiver autenticado ou não tiver perfil
 */
export async function getUserCompanyId(): Promise<string> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('Usuário não autenticado. Por favor, faça login novamente.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error('Perfil não encontrado. Aguarde alguns segundos e tente novamente.');
  }

  return profile.company_id;
}

/**
 * Obtém o perfil completo do usuário autenticado
 */
export async function getUserProfile() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('Usuário não autenticado');
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error('Perfil não encontrado');
  }

  return profile;
}
