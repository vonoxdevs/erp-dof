import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Iniciando geração de transações recorrentes...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Chamar a função do banco de dados que gera as parcelas
    const { data, error } = await supabase.rpc('generate_contract_installments')

    if (error) {
      console.error('❌ Erro ao gerar transações:', error)
      throw error
    }

    const generatedContracts = data || []
    const totalGenerated = generatedContracts.reduce(
      (sum: number, contract: any) => sum + (contract.parcelas_geradas || 0), 
      0
    )

    console.log(`✅ Geradas ${totalGenerated} transações de ${generatedContracts.length} contratos`)

    return new Response(
      JSON.stringify({
        success: true,
        contracts: generatedContracts.length,
        transactions: totalGenerated,
        details: generatedContracts
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
  } catch (error) {
    console.error('❌ Erro na função:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})
