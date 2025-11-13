import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Obter usuário autenticado
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error('❌ Erro de autenticação:', authError);
      return new Response(
        JSON.stringify({ error: 'Não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('👤 Usuário autenticado:', user.id);

    // Buscar perfil do usuário para obter company_id
    const { data: profile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.company_id) {
      console.error('❌ Erro ao buscar perfil:', profileError);
      return new Response(
        JSON.stringify({ error: 'Perfil não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const companyId = profile.company_id;
    console.log('🏢 Company ID:', companyId);

    // Verificar se o usuário é admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !roleData || (roleData.role !== 'admin' && roleData.role !== 'super_admin')) {
      console.error('❌ Usuário não é admin');
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas administradores podem resetar os dados.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Usuário é admin, iniciando reset...');

    // Resetar dados da empresa (manter a empresa e usuários, mas limpar dados operacionais)
    const tablesToClear = [
      'transactions',
      'bank_accounts',
      'contracts',
      'contacts',
      'imports',
      'generated_reports',
      'audit_logs',
      'bank_api_credentials',
      'categorias',
      'categoria_conta_bancaria',
    ];

    let deletedCounts: Record<string, number> = {};

    for (const table of tablesToClear) {
      try {
        const { data, error } = await supabaseClient
          .from(table)
          .delete()
          .eq('company_id', companyId)
          .select();

        if (error) {
          console.warn(`⚠️ Erro ao limpar ${table}:`, error.message);
          deletedCounts[table] = 0;
        } else {
          deletedCounts[table] = data?.length || 0;
          console.log(`✅ ${table}: ${deletedCounts[table]} registros deletados`);
        }
      } catch (err) {
        console.warn(`⚠️ Erro ao limpar ${table}:`, err);
        deletedCounts[table] = 0;
      }
    }

    // Recriar categorias padrão
    console.log('📁 Recriando categorias padrão...');
    
    const defaultCategories = [
      // Receitas
      { name: 'Vendas', tipo: 'receita', icon: '💰', cor: '#10b981' },
      { name: 'Serviços', tipo: 'receita', icon: '🛠️', cor: '#3b82f6' },
      { name: 'Consultoria', tipo: 'receita', icon: '📊', cor: '#8b5cf6' },
      { name: 'Outras Receitas', tipo: 'receita', icon: '📈', cor: '#06b6d4' },
      
      // Despesas
      { name: 'Salários', tipo: 'despesa', icon: '👥', cor: '#ef4444' },
      { name: 'Fornecedores', tipo: 'despesa', icon: '🏪', cor: '#f97316' },
      { name: 'Aluguel', tipo: 'despesa', icon: '🏢', cor: '#eab308' },
      { name: 'Marketing', tipo: 'despesa', icon: '📢', cor: '#ec4899' },
      { name: 'Tecnologia', tipo: 'despesa', icon: '💻', cor: '#6366f1' },
      { name: 'Outras Despesas', tipo: 'despesa', icon: '📉', cor: '#64748b' },
      
      // Centro de Custo
      { name: 'Administrativo', tipo: 'centro_custo', icon: '🏢', cor: '#3b82f6' },
      { name: 'Operacional', tipo: 'centro_custo', icon: '⚙️', cor: '#10b981' },
      { name: 'Comercial', tipo: 'centro_custo', icon: '💼', cor: '#8b5cf6' },
    ];

    const categoriesToInsert = defaultCategories.map(cat => ({
      company_id: companyId,
      nome: cat.name,
      tipo: cat.tipo,
      icon: cat.icon,
      cor: cat.cor,
      ativo: true,
    }));

    const { error: categoriesError } = await supabaseClient
      .from('categorias')
      .insert(categoriesToInsert);

    if (categoriesError) {
      console.error('❌ Erro ao criar categorias:', categoriesError);
    } else {
      console.log('✅ Categorias padrão criadas');
    }

    console.log('✅ Reset concluído com sucesso');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Dados da empresa resetados com sucesso',
        deletedCounts,
        categoriesCreated: defaultCategories.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro ao resetar dados:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
