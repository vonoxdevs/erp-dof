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
    console.log('🔧 [create-company-admin] Iniciando criação de empresa e admin');

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

    // Verificar autenticação do usuário que está fazendo a requisição
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error('❌ [create-company-admin] Não autenticado:', authError);
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se o usuário é super admin
    const { data: roles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (roleError || !roles?.some(r => r.role === 'super_admin')) {
      console.error('❌ [create-company-admin] Usuário não é super admin');
      return new Response(
        JSON.stringify({ error: 'Acesso negado: apenas super admins podem criar empresas' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obter dados da requisição
    const body = await req.json();
    const { email, password, full_name, company } = body;

    console.log('📝 [create-company-admin] Dados recebidos:', {
      email,
      full_name,
      company_name: company.name
    });

    // Validar dados obrigatórios
    if (!email || !password || !full_name) {
      return new Response(
        JSON.stringify({ error: 'Email, senha e nome completo são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!company?.name || !company?.legal_name || !company?.cnpj) {
      return new Response(
        JSON.stringify({ error: 'Nome, razão social e CNPJ da empresa são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Verificar se CNPJ já existe
    const { data: existingCompany } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('cnpj', company.cnpj)
      .single();

    if (existingCompany) {
      console.error('❌ [create-company-admin] CNPJ já cadastrado:', company.cnpj);
      return new Response(
        JSON.stringify({ error: 'CNPJ já cadastrado no sistema' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Criar usuário no auth
    console.log('👤 [create-company-admin] Criando usuário no auth...');
    const { data: authData, error: authError2 } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name
      }
    });

    if (authError2 || !authData.user) {
      console.error('❌ [create-company-admin] Erro ao criar usuário:', authError2);
      throw new Error(authError2?.message || 'Falha ao criar usuário');
    }

    console.log('✅ [create-company-admin] Usuário criado:', authData.user.id);

    try {
      // 3. Criar empresa
      console.log('🏢 [create-company-admin] Criando empresa...');
      const { data: companyData, error: companyError } = await supabaseAdmin
        .from('companies')
        .insert({
          name: company.name,
          legal_name: company.legal_name,
          cnpj: company.cnpj,
          email: company.email || null,
          phone: company.phone || null,
          is_active: true
        })
        .select()
        .single();

      if (companyError) {
        console.error('❌ [create-company-admin] Erro ao criar empresa:', companyError);
        // Rollback: deletar usuário
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw new Error(companyError.message);
      }

      console.log('✅ [create-company-admin] Empresa criada:', companyData.id);

      // 4. Atualizar perfil com company_id
      console.log('📝 [create-company-admin] Atualizando perfil...');
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .update({ company_id: companyData.id })
        .eq('id', authData.user.id);

      if (profileError) {
        console.error('❌ [create-company-admin] Erro ao atualizar perfil:', profileError);
        throw profileError;
      }

      // 5. Adicionar role de admin
      console.log('🔐 [create-company-admin] Adicionando role admin...');
      const { error: roleError2 } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: authData.user.id, role: 'admin' });

      if (roleError2) {
        console.error('❌ [create-company-admin] Erro ao adicionar role:', roleError2);
        throw roleError2;
      }

      console.log('✅ [create-company-admin] Empresa e admin criados com sucesso!');

      return new Response(
        JSON.stringify({
          success: true,
          user_id: authData.user.id,
          company_id: companyData.id,
          message: 'Empresa e administrador criados com sucesso'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error: any) {
      // Se algo deu errado após criar o usuário, fazer rollback
      console.error('❌ [create-company-admin] Erro durante criação, fazendo rollback:', error);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw error;
    }

  } catch (error: any) {
    console.error('❌ [create-company-admin] Erro geral:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro ao criar empresa e administrador',
        details: error.toString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
