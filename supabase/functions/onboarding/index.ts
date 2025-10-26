import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validação de CNPJ com algoritmo completo
function validateCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '');
  
  if (cleaned.length !== 14) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  // Primeiro dígito verificador
  let sum = 0;
  let pos = 5;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned[i]) * pos--;
    if (pos < 2) pos = 9;
  }
  let digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (digit !== parseInt(cleaned[12])) return false;
  
  // Segundo dígito verificador
  sum = 0;
  pos = 6;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned[i]) * pos--;
    if (pos < 2) pos = 9;
  }
  digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return digit === parseInt(cleaned[13]);
}

// Validação de CPF com algoritmo completo
function validateCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '');
  
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  // Primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * (10 - i);
  }
  let digit = (sum * 10) % 11;
  if (digit === 10) digit = 0;
  if (digit !== parseInt(cleaned[9])) return false;
  
  // Segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i]) * (11 - i);
  }
  digit = (sum * 10) % 11;
  if (digit === 10) digit = 0;
  return digit === parseInt(cleaned[10]);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Obter usuário do JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication token');
    }

    console.log(`Onboarding started for user: ${user.id}`);

    const body = await req.json();
    console.log('📦 Received body:', JSON.stringify(body, null, 2));
    
    const { company, address, responsible } = body;

    // Validar se dados obrigatórios foram enviados
    if (!company || !responsible) {
      console.error('❌ Missing required fields:', { hasCompany: !!company, hasResponsible: !!responsible });
      return new Response(
        JSON.stringify({ error: 'Dados obrigatórios faltando (company ou responsible)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Validating CNPJ:', company.cnpj);

    // Validar CNPJ
    if (!validateCNPJ(company.cnpj)) {
      console.error('❌ Invalid CNPJ:', company.cnpj);
      return new Response(
        JSON.stringify({ 
          error: 'CNPJ inválido. Verifique os dígitos e tente novamente.',
          details: 'O CNPJ fornecido não passou na validação dos dígitos verificadores. Use um CNPJ válido.',
          received: company.cnpj
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ CNPJ válido');
    console.log('🔍 Validating CPF:', responsible.cpf);

    // Validar CPF do responsável
    if (!validateCPF(responsible.cpf)) {
      console.error('❌ Invalid CPF:', responsible.cpf);
      return new Response(
        JSON.stringify({ 
          error: 'CPF do responsável inválido. Verifique os dígitos e tente novamente.',
          details: 'O CPF fornecido não passou na validação dos dígitos verificadores. Use um CPF válido.',
          received: responsible.cpf
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ CPF válido');

    // Verificar se usuário já tem empresa
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .maybeSingle();

    if (existingProfile?.company_id) {
      return new Response(
        JSON.stringify({ error: 'Usuário já possui empresa vinculada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se CNPJ já existe
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('cnpj', company.cnpj)
      .maybeSingle();

    if (existingCompany) {
      return new Response(
        JSON.stringify({ error: 'CNPJ já cadastrado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Iniciar transação atômica
    // 1. Criar empresa
    const { data: newCompany, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: company.name,
        legal_name: company.legal_name,
        cnpj: company.cnpj,
        email: company.email,
        phone: company.phone,
        industry: company.industry,
        size: company.size,
        address: {
          cep: address.cep,
          street: address.street,
          number: address.number,
          complement: address.complement,
          neighborhood: address.neighborhood,
          city: address.city,
          state: address.state
        },
        responsible: {
          name: responsible.name,
          cpf: responsible.cpf,
          phone: responsible.phone,
          email: responsible.email,
          position: responsible.position
        }
      })
      .select()
      .single();

    if (companyError) {
      console.error('Error creating company:', companyError);
      throw new Error('Erro ao criar empresa');
    }

    console.log(`Company created: ${newCompany.id}`);

    // 2. Criar perfil do usuário
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: user.id,
        company_id: newCompany.id,
        full_name: responsible.name,
        permissions: { all: true }
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Rollback: deletar empresa
      await supabase.from('companies').delete().eq('id', newCompany.id);
      throw new Error('Erro ao criar perfil');
    }

    console.log('User profile created');

    // 3. Criar role de owner
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: user.id,
        role: 'owner'
      });

    if (roleError) {
      console.error('Error creating role:', roleError);
      // Rollback
      await supabase.from('user_profiles').delete().eq('id', user.id);
      await supabase.from('companies').delete().eq('id', newCompany.id);
      throw new Error('Erro ao criar role');
    }

    console.log('User role created');

    // 4. Criar categorias padrão
    const defaultCategories = [
      { name: 'Vendas', type: 'income', icon: '💰', color: '#10b981' },
      { name: 'Serviços', type: 'income', icon: '🛠️', color: '#3b82f6' },
      { name: 'Outras Receitas', type: 'income', icon: '📈', color: '#06b6d4' },
      { name: 'Juros Recebidos', type: 'income', icon: '💵', color: '#8b5cf6' },
      { name: 'Salários', type: 'expense', icon: '👥', color: '#ef4444' },
      { name: 'Aluguel', type: 'expense', icon: '🏢', color: '#f97316' },
      { name: 'Fornecedores', type: 'expense', icon: '🏪', color: '#eab308' },
      { name: 'Impostos', type: 'expense', icon: '📋', color: '#ec4899' }
    ];

    const categoriesToInsert = defaultCategories.map(cat => ({
      company_id: newCompany.id,
      ...cat,
      is_active: true
    }));

    const { error: categoriesError } = await supabase
      .from('categories')
      .insert(categoriesToInsert);

    if (categoriesError) {
      console.error('Error creating categories:', categoriesError);
      // Rollback
      await supabase.from('user_roles').delete().eq('user_id', user.id);
      await supabase.from('user_profiles').delete().eq('id', user.id);
      await supabase.from('companies').delete().eq('id', newCompany.id);
      throw new Error('Erro ao criar categorias');
    }

    console.log('Default categories created');

    return new Response(
      JSON.stringify({ 
        success: true, 
        company_id: newCompany.id,
        message: 'Onboarding concluído com sucesso' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Onboarding error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro no onboarding' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
