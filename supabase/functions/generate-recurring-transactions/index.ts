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

    console.log('🔄 Iniciando geração de transações recorrentes...');

    // Buscar transações recorrentes que precisam gerar novas parcelas
    const { data: recurringTransactions, error: fetchError } = await supabaseClient
      .from('transactions')
      .select('*')
      .eq('is_recurring', true)
      .not('recurrence_config', 'is', null);

    if (fetchError) {
      console.error('❌ Erro ao buscar transações recorrentes:', fetchError);
      throw fetchError;
    }

    console.log(`📋 Encontradas ${recurringTransactions?.length || 0} transações recorrentes`);

    let generatedCount = 0;

    for (const transaction of recurringTransactions || []) {
      try {
        const config = transaction.recurrence_config;
        if (!config || !config.frequency) continue;

        // Calcular próxima data baseada na data de vencimento
        const lastDate = new Date(transaction.due_date);
        const today = new Date();
        let nextDate = new Date(lastDate);

        // Gerar todas as datas que deveriam existir entre lastDate e hoje
        const datesToGenerate: Date[] = [];
        
        while (nextDate <= today) {
          // Calcular próxima ocorrência baseado na frequência
          switch (config.frequency) {
            case 'daily':
              nextDate = new Date(nextDate);
              nextDate.setDate(nextDate.getDate() + 1);
              break;
            case 'weekly':
              nextDate = new Date(nextDate);
              nextDate.setDate(nextDate.getDate() + 7);
              break;
            case 'monthly':
              nextDate = new Date(nextDate);
              nextDate.setMonth(nextDate.getMonth() + 1);
              break;
            case 'quarterly':
              nextDate = new Date(nextDate);
              nextDate.setMonth(nextDate.getMonth() + 3);
              break;
            case 'semiannual':
              nextDate = new Date(nextDate);
              nextDate.setMonth(nextDate.getMonth() + 6);
              break;
            case 'annual':
              nextDate = new Date(nextDate);
              nextDate.setFullYear(nextDate.getFullYear() + 1);
              break;
          }

          if (nextDate <= today) {
            datesToGenerate.push(new Date(nextDate));
          }
        }

        // Verificar se atingiu o limite de parcelas
        if (config.total_installments) {
          const { count } = await supabaseClient
            .from('transactions')
            .select('id', { count: 'exact', head: true })
            .or(`id.eq.${transaction.id},reference_number.eq.${transaction.id}`);

          if (count && count >= config.total_installments) continue;
          
          // Limitar datas a gerar pelo total de parcelas
          const remaining = config.total_installments - (count || 0);
          datesToGenerate.splice(remaining);
        }

        // Verificar se passou da data final
        if (config.end_date) {
          const endDate = new Date(config.end_date);
          for (let i = datesToGenerate.length - 1; i >= 0; i--) {
            if (datesToGenerate[i] > endDate) {
              datesToGenerate.splice(i, 1);
            }
          }
        }

        // Gerar transações para cada data
        for (const dateToGenerate of datesToGenerate) {
          const dateStr = dateToGenerate.toISOString().split('T')[0];
          
          // Verificar se já existe transação para essa data
          const { data: existing } = await supabaseClient
            .from('transactions')
            .select('id')
            .eq('reference_number', transaction.id)
            .eq('due_date', dateStr)
            .maybeSingle();

          if (existing) continue;

          // Criar nova transação
          const newTransaction = {
            company_id: transaction.company_id,
            type: transaction.type,
            amount: transaction.amount,
            description: transaction.description,
            due_date: dateStr,
            status: 'pending',
            category_id: transaction.category_id,
            contact_id: transaction.contact_id,
            bank_account_id: transaction.bank_account_id,
            account_from_id: transaction.account_from_id,
            account_to_id: transaction.account_to_id,
            centro_custo_id: transaction.centro_custo_id,
            categoria_receita_id: transaction.categoria_receita_id,
            categoria_despesa_id: transaction.categoria_despesa_id,
            payment_method: transaction.payment_method,
            reference_number: transaction.id, // Usar reference_number para rastrear a origem
            is_recurring: false, // A nova transação não é recorrente
            created_by: transaction.created_by,
            customer_name: transaction.customer_name,
            supplier_name: transaction.supplier_name,
          };

          const { error: insertError } = await supabaseClient
            .from('transactions')
            .insert(newTransaction);

          if (insertError) {
            console.error(`❌ Erro ao criar transação para ${transaction.id}:`, insertError);
            continue;
          }

          generatedCount++;
          console.log(`✅ Transação gerada para ${transaction.description} - ${dateStr}`);
        }

      } catch (error) {
        console.error(`❌ Erro ao processar transação ${transaction.id}:`, error);
        continue;
      }
    }

    console.log(`✅ Total de ${generatedCount} transações recorrentes geradas`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${generatedCount} transações recorrentes geradas`,
        count: generatedCount
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