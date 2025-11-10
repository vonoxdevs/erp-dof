import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Criar cliente Supabase com service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se é super admin
    const { data: roles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (roleError || !roles?.some(r => r.role === 'super_admin')) {
      return new Response(
        JSON.stringify({ error: 'Acesso negado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Ação: Listar todos os usuários
    if (action === 'list' || !action) {
      console.log('📋 [super-admin-users] Listando usuários...');

      // Buscar perfis
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('user_profiles')
        .select('id, full_name, company_id, last_login_at, created_at')
        .order('full_name');

      if (profilesError) throw profilesError;

      // Buscar empresas
      const { data: companies } = await supabaseAdmin
        .from('companies')
        .select('id, name');

      const companyMap = new Map(companies?.map(c => [c.id, c.name]) || []);

      // Buscar usuários do auth
      const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers();
      const authMap = new Map(
        authUsers.map(u => [u.id, { email: u.email || '', banned: !!(u as any).banned_until }])
      );

      // Buscar roles
      const { data: allRoles } = await supabaseAdmin
        .from('user_roles')
        .select('user_id, role');

      const rolesMap = new Map();
      allRoles?.forEach(r => {
        if (!rolesMap.has(r.user_id)) {
          rolesMap.set(r.user_id, []);
        }
        rolesMap.get(r.user_id).push(r.role);
      });

      const result = profiles?.map(profile => {
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
      }) || [];

      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ação: Ativar/Desativar usuário
    if (action === 'toggle-status') {
      const body = await req.json();
      const { userId, activate } = body;

      console.log(`🔄 [super-admin-users] ${activate ? 'Ativando' : 'Desativando'} usuário:`, userId);

      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'userId é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verificar se não é super admin
      const { data: targetRoles } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (targetRoles?.some(r => r.role === 'super_admin')) {
        return new Response(
          JSON.stringify({ error: 'Não é possível desativar super admins' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Ativar/Desativar usuário
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: activate ? 'none' : '87600h' // 10 anos se desativar
      });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: `Usuário ${activate ? 'ativado' : 'desativado'} com sucesso` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Ação inválida' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ [super-admin-users] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
