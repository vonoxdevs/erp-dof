import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, bankAccountId } = await req.json();

    if (!text || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Texto não fornecido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'Configuração de IA não encontrada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user info
    const authHeader = req.headers.get('Authorization');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Erro de autenticação:', userError);
      return new Response(
        JSON.stringify({ error: 'Não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return new Response(
        JSON.stringify({ error: 'Empresa não encontrada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch categories for context
    const { data: categorias } = await supabaseClient
      .from('categorias')
      .select('id, nome, tipo')
      .eq('company_id', profile.company_id)
      .eq('ativo', true);

    const categoriasReceita = categorias?.filter(c => c.tipo === 'receita') || [];
    const categoriasDespesa = categorias?.filter(c => c.tipo === 'despesa') || [];
    const centrosCusto = categorias?.filter(c => c.tipo === 'centro_custo') || [];

    const today = new Date().toISOString().split('T')[0];

    const systemPrompt = `Você é um assistente especializado em extrair transações financeiras de texto livre.

CATEGORIAS DE RECEITA DISPONÍVEIS:
${categoriasReceita.map(c => `- ${c.nome} (id: ${c.id})`).join('\n') || 'Nenhuma'}

CATEGORIAS DE DESPESA DISPONÍVEIS:
${categoriasDespesa.map(c => `- ${c.nome} (id: ${c.id})`).join('\n') || 'Nenhuma'}

CENTROS DE CUSTO DISPONÍVEIS:
${centrosCusto.map(c => `- ${c.nome} (id: ${c.id})`).join('\n') || 'Nenhum'}

DATA DE HOJE: ${today}

REGRAS:
1. Extraia TODAS as transações mencionadas no texto
2. Para cada transação, identifique:
   - type: "revenue" (receita/entrada) ou "expense" (despesa/saída)
   - description: descrição clara da transação
   - amount: valor numérico (sempre positivo)
   - due_date: data no formato YYYY-MM-DD (use hoje se não especificado)
   - status: "pending" (a receber/pagar) ou "paid" (já pago/recebido)
   - categoria_receita_id: ID da categoria de receita mais adequada (apenas para receitas)
   - categoria_despesa_id: ID da categoria de despesa mais adequada (apenas para despesas)
   - centro_custo_id: ID do centro de custo se mencionado ou inferível

3. Se o texto mencionar "pago", "recebido", "quitado", use status "paid"
4. Se mencionar "a pagar", "a receber", "pendente", use status "pending"
5. Interprete valores como "5k" = 5000, "10 mil" = 10000
6. Interprete datas como "amanhã", "próxima semana", "dia 15" corretamente
7. Se não conseguir identificar nenhuma transação, retorne um array vazio`;

    console.log('Enviando texto para análise:', text.substring(0, 200));

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analise o seguinte texto e extraia as transações financeiras:\n\n${text}` }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_transactions',
              description: 'Extrai transações financeiras do texto',
              parameters: {
                type: 'object',
                properties: {
                  transactions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        type: { type: 'string', enum: ['revenue', 'expense'] },
                        description: { type: 'string' },
                        amount: { type: 'number' },
                        due_date: { type: 'string', description: 'Data no formato YYYY-MM-DD' },
                        status: { type: 'string', enum: ['pending', 'paid'] },
                        categoria_receita_id: { type: 'string', description: 'ID da categoria de receita (apenas para type=revenue)' },
                        categoria_despesa_id: { type: 'string', description: 'ID da categoria de despesa (apenas para type=expense)' },
                        centro_custo_id: { type: 'string', description: 'ID do centro de custo' }
                      },
                      required: ['type', 'description', 'amount', 'due_date', 'status']
                    }
                  }
                },
                required: ['transactions']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_transactions' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na API de IA:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns segundos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes para análise de IA.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Erro ao analisar texto com IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    console.log('Resposta da IA:', JSON.stringify(aiResponse, null, 2));

    let extractedTransactions: any[] = [];

    // Parse tool call response
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        extractedTransactions = parsed.transactions || [];
      } catch (parseError) {
        console.error('Erro ao parsear argumentos:', parseError);
      }
    }

    console.log('Transações extraídas:', extractedTransactions.length);

    return new Response(
      JSON.stringify({ 
        transactions: extractedTransactions,
        count: extractedTransactions.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na função:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
