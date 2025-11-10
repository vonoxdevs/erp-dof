import { supabase } from "@/integrations/supabase/client";

export interface CompanyWithUsers {
  id: string;
  name: string;
  legal_name: string;
  cnpj: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  user_count: number;
}

export interface AllUserData {
  id: string;
  full_name: string;
  email: string;
  company_id: string | null;
  company_name: string | null;
  is_active: boolean;
  roles: string[];
  last_login_at: string | null;
  created_at: string;
}

/**
 * Verifica se o usuário atual é super admin
 */
export async function isSuperAdmin(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'super_admin')
    .maybeSingle();

  return !!data;
}

/**
 * Busca todas as empresas do sistema
 */
export async function getAllCompanies(): Promise<CompanyWithUsers[]> {
  const { data: companies, error } = await supabase
    .from('companies')
    .select('*')
    .order('name');

  if (error) throw error;
  if (!companies) return [];

  // Contar usuários por empresa
  const companiesWithCount: CompanyWithUsers[] = [];
  
  for (const company of companies) {
    const { count } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', company.id);

    companiesWithCount.push({
      ...company,
      user_count: count || 0
    });
  }

  return companiesWithCount;
}

/**
 * Busca todos os usuários do sistema (todas empresas)
 */
/**
 * Busca todos os usuários via Edge Function
 */
export async function getAllUsers(): Promise<AllUserData[]> {
  const { data, error } = await supabase.functions.invoke('super-admin-users', {
    body: { action: 'list' }
  });

  if (error) throw error;
  return data || [];
}

/**
 * Ativa/desativa um usuário via Edge Function
 */
export async function toggleUserActiveStatus(userId: string, activate: boolean): Promise<void> {
  const { data, error } = await supabase.functions.invoke('super-admin-users', {
    body: { action: 'toggle-status', userId, activate }
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}

/**
 * Atualiza role de qualquer usuário
 */
export async function updateUserRole(userId: string, newRole: string): Promise<void> {
  // Remover roles antigas
  await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId);

  // Adicionar nova role
  const { error } = await (supabase as any)
    .from('user_roles')
    .insert({ user_id: userId, role: newRole });

  if (error) throw error;
}

/**
 * Cria um novo usuário admin com empresa via Edge Function
 */
export async function createAdminWithCompany(data: {
  email: string;
  password: string;
  full_name: string;
  company: {
    name: string;
    legal_name: string;
    cnpj: string;
    email?: string;
    phone?: string;
  };
}): Promise<{ user_id: string; company_id: string }> {
  const { data: result, error } = await supabase.functions.invoke('create-company-admin', {
    body: data
  });

  if (error) {
    console.error('Erro ao invocar edge function:', error);
    throw new Error(error.message || 'Erro ao criar empresa e administrador');
  }

  if (result?.error) {
    throw new Error(result.error);
  }

  return result;
}

/**
 * Ativa/desativa uma empresa
 */
export async function toggleCompanyStatus(companyId: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('companies')
    .update({ is_active: isActive })
    .eq('id', companyId);

  if (error) throw error;
}
