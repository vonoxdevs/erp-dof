import { supabase } from "@/integrations/supabase/client";
import { getUserCompanyId } from "./userService";

export interface UserWithRoles {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  department: string | null;
  is_active: boolean;
  last_login_at: string | null;
  last_activity_at: string | null;
  session_timeout: number;
  permissions: any;
  roles: string[];
}

export interface InviteUserData {
  email: string;
  full_name: string;
  role: string;
  department?: string;
  permissions: any;
}

export interface PendingInvite {
  id: string;
  email: string;
  full_name: string;
  role: string;
  department: string | null;
  created_at: string;
  expires_at: string;
  token: string;
}

/**
 * Busca todos os usuários da empresa com suas roles
 */
export async function getCompanyUsers(): Promise<UserWithRoles[]> {
  const companyId = await getUserCompanyId();
  
  // Buscar usuários da empresa
  const { data: users, error: usersError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('company_id', companyId)
    .order('full_name');
  
  if (usersError) throw usersError;
  if (!users) return [];
  
  // Buscar roles de cada usuário
  const usersWithRoles: UserWithRoles[] = [];
  
  for (const user of users) {
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    if (rolesError) {
      console.error('Erro ao buscar roles:', rolesError);
      continue;
    }
    
    const userExtended = user as any;
    usersWithRoles.push({
      id: user.id,
      full_name: user.full_name,
      email: userExtended.email || null,
      phone: userExtended.phone || null,
      department: userExtended.department || null,
      is_active: userExtended.is_active ?? true,
      last_login_at: user.last_login_at || null,
      last_activity_at: userExtended.last_activity_at || null,
      session_timeout: userExtended.session_timeout || 30,
      permissions: user.permissions,
      roles: rolesData?.map(r => r.role) || []
    });
  }
  
  return usersWithRoles;
}

/**
 * Convida novo usuário
 */
export async function inviteUser(data: InviteUserData): Promise<string> {
  const companyId = await getUserCompanyId();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Usuário não autenticado');
  
  // Get company details
  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .single();
  
  // Gerar token único
  const token = crypto.randomUUID();
  
  // Criar convite (usando type assertion pois tabela não está nos tipos ainda)
  const { error } = await (supabase as any)
    .from('user_invites')
    .insert({
      company_id: companyId,
      email: data.email,
      full_name: data.full_name,
      role: data.role,
      department: data.department,
      permissions: data.permissions,
      invited_by: user.id,
      token,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  
  if (error) throw error;
  
  // Gerar link de convite
  const inviteLink = `${window.location.origin}/auth/accept-invite?token=${token}`;
  
  // Enviar email de convite
  try {
    const { error: emailError } = await supabase.functions.invoke("send-invite-email", {
      body: {
        email: data.email,
        fullName: data.full_name,
        inviteLink,
        companyName: company?.name || "Sistema Financeiro",
        role: data.role,
      },
    });

    if (emailError) {
      console.error("Error sending invitation email:", emailError);
      // Não lançar erro - o convite foi criado, email é opcional
    }
  } catch (emailError) {
    console.error("Failed to send invitation email:", emailError);
    // Não lançar erro - o convite foi criado, email é opcional
  }
  
  // Log de auditoria
  await logAudit({
    action: 'INVITE_USER',
    entity_type: 'user_invite',
    new_data: { email: data.email, role: data.role },
  });
  
  // Retornar link de convite
  return inviteLink;
}

/**
 * Busca convites pendentes (não aceitos)
 */
export async function getPendingInvites(): Promise<PendingInvite[]> {
  const companyId = await getUserCompanyId();
  
  const { data, error } = await supabase
    .from('user_invites')
    .select('id, email, full_name, role, department, created_at, expires_at, token')
    .eq('company_id', companyId)
    .is('accepted_at', null)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

/**
 * Reenvia convite com novo token
 */
export async function resendInvite(inviteId: string): Promise<string> {
  const companyId = await getUserCompanyId();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Usuário não autenticado');
  
  // Buscar convite existente
  const { data: invite, error: fetchError } = await supabase
    .from('user_invites')
    .select('*')
    .eq('id', inviteId)
    .eq('company_id', companyId)
    .single();
  
  if (fetchError || !invite) throw new Error('Convite não encontrado');
  
  // Gerar novo token
  const newToken = crypto.randomUUID();
  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  
  // Atualizar convite com novo token e expiração
  const { error: updateError } = await supabase
    .from('user_invites')
    .update({
      token: newToken,
      expires_at: newExpiresAt,
    })
    .eq('id', inviteId);
  
  if (updateError) throw updateError;
  
  // Get company details
  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .single();
  
  // Gerar novo link de convite
  const inviteLink = `${window.location.origin}/auth/accept-invite?token=${newToken}`;
  
  // Reenviar email de convite
  try {
    const { error: emailError } = await supabase.functions.invoke("send-invite-email", {
      body: {
        email: invite.email,
        fullName: invite.full_name,
        inviteLink,
        companyName: company?.name || "Sistema Financeiro",
        role: invite.role,
      },
    });

    if (emailError) {
      console.error("Error resending invitation email:", emailError);
    }
  } catch (emailError) {
    console.error("Failed to resend invitation email:", emailError);
  }
  
  // Log da auditoria
  await logAudit({
    action: 'resend_invite',
    entity_type: 'user_invite',
    entity_id: inviteId,
    new_data: { token: newToken, expires_at: newExpiresAt }
  });
  
  return inviteLink;
}

/**
 * Atualiza status ativo/inativo de usuário
 */
export async function updateUserStatus(userId: string, isActive: boolean): Promise<void> {
  const { error } = await (supabase as any)
    .from('user_profiles')
    .update({ is_active: isActive })
    .eq('id', userId);
  
  if (error) throw error;
  
  await logAudit({
    action: isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
    entity_type: 'user',
    entity_id: userId,
  });
}

/**
 * Atualiza permissões de usuário
 */
export async function updateUserPermissions(
  userId: string, 
  permissions: any
): Promise<void> {
  const { error } = await supabase
    .from('user_profiles')
    .update({ permissions })
    .eq('id', userId);
  
  if (error) throw error;
  
  await logAudit({
    action: 'UPDATE_PERMISSIONS',
    entity_type: 'user',
    entity_id: userId,
    new_data: { permissions },
  });
}

/**
 * Atualiza role de usuário
 */
export async function updateUserRole(userId: string, newRole: string): Promise<void> {
  // Remover role antiga
  await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId);
  
  // Adicionar nova role
  const { error } = await (supabase as any)
    .from('user_roles')
    .insert({ user_id: userId, role: newRole });
  
  if (error) throw error;
  
  await logAudit({
    action: 'UPDATE_ROLE',
    entity_type: 'user',
    entity_id: userId,
    new_data: { role: newRole },
  });
}

/**
 * Remove usuário
 */
export async function deleteUser(userId: string): Promise<void> {
  // Desativar ao invés de deletar (soft delete)
  const { error } = await (supabase as any)
    .from('user_profiles')
    .update({ is_active: false })
    .eq('id', userId);
  
  if (error) throw error;
  
  await logAudit({
    action: 'DELETE_USER',
    entity_type: 'user',
    entity_id: userId,
  });
}

/**
 * Busca roles do usuário autenticado
 */
export async function getCurrentUserRoles(): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id);
  
  if (error) {
    console.error('Erro ao buscar roles:', error);
    return [];
  }
  
  return data?.map(r => r.role) || [];
}

/**
 * Log de auditoria
 */
async function logAudit(data: {
  action: string;
  entity_type: string;
  entity_id?: string;
  old_data?: any;
  new_data?: any;
}) {
  try {
    const companyId = await getUserCompanyId();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;
    
    // Só inserir se entity_id estiver definido (campo obrigatório na tabela)
    if (!data.entity_id) {
      console.warn('Tentativa de criar log de auditoria sem entity_id:', data);
      return;
    }
    
    await (supabase as any).from('audit_logs').insert({
      company_id: companyId,
      user_id: user.id,
      ip_address: window.location.hostname,
      user_agent: navigator.userAgent,
      ...data,
    });
  } catch (error) {
    console.error('Erro ao criar log de auditoria:', error);
  }
}
