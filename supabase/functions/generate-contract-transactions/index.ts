import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

    console.log('🔄 Iniciando geração de parcelas de contratos...');

    // Chamar a função do banco que gera as parcelas
    const { data, error } = await supabaseClient
      .rpc('generate_contract_installments');

    if (error) {
      console.error('❌ Erro ao gerar parcelas:', error);
      throw error;
    }

    console.log('✅ Parcelas geradas com sucesso:', data);

    const totalGerado = data?.reduce((sum: number, item: any) => sum + (item.parcelas_geradas || 0), 0) || 0;

    return new Response(
      JSON.stringify({
        success: true,
        message: `${totalGerado} parcelas geradas com sucesso`,
        contracts: data
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});