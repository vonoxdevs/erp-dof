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
export async function getAllUsers(): Promise<AllUserData[]> {
  // Buscar todos os perfis
  const { data: profiles, error: profilesError } = await supabase
    .from('user_profiles')
    .select(`
      id,
      full_name,
      company_id,
      last_login_at,
      created_at
    `)
    .order('full_name');

  if (profilesError) throw profilesError;
  if (!profiles) return [];

  // Buscar empresas
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name');

  const companyMap = new Map<string, string>(
    companies?.map(c => [c.id, c.name] as [string, string]) || []
  );

  // Buscar usuários do auth para pegar email e status
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
  const authMap = new Map<string, { email: string, banned: boolean }>(
    authUsers.map(u => [u.id, { email: u.email || '', banned: !!u.banned_until }] as [string, { email: string, banned: boolean }])
  );

  // Buscar todas as roles
  const { data: allRoles } = await supabase
    .from('user_roles')
    .select('user_id, role');

  const rolesMap = new Map<string, string[]>();
  allRoles?.forEach(r => {
    if (!rolesMap.has(r.user_id)) {
      rolesMap.set(r.user_id, []);
    }
    rolesMap.get(r.user_id)!.push(r.role);
  });

  return profiles.map(profile => {
    const auth = authMap.get(profile.id);
    return {
      id: profile.id,
      full_name: profile.full_name,
      email: auth?.email || '',
      company_id: profile.company_id,
      company_name: profile.company_id ? companyMap.get(profile.company_id) || null : null,
      is_active: !auth?.banned,
      roles: rolesMap.get(profile.id) || [],
      last_login_at: profile.last_login_at,
      created_at: profile.created_at
    };
  });
}

/**
 * Ativa/desativa um usuário
 */
export async function toggleUserActiveStatus(userId: string, activate: boolean): Promise<void> {
  if (activate) {
    // Remover ban
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      ban_duration: 'none'
    });
    if (error) throw error;
  } else {
    // Banir por 10 anos (efetivamente permanente)
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      ban_duration: '87600h' // 10 anos
    });
    if (error) throw error;
  }
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
 * Cria um novo usuário admin com empresa
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
  // Criar usuário no auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: {
      full_name: data.full_name
    }
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error('Falha ao criar usuário');

  // Criar empresa
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .insert(data.company)
    .select()
    .single();

  if (companyError) {
    // Rollback: deletar usuário
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw companyError;
  }

  // Atualizar perfil com company_id
  const { error: profileError } = await supabase
    .from('user_profiles')
    .update({ company_id: company.id })
    .eq('id', authData.user.id);

  if (profileError) throw profileError;

  // Adicionar role de admin
  const { error: roleError } = await (supabase as any)
    .from('user_roles')
    .insert({ user_id: authData.user.id, role: 'admin' });

  if (roleError) throw roleError;

  return {
    user_id: authData.user.id,
    company_id: company.id
  };
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
