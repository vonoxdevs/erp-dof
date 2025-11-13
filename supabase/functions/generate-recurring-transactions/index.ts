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
    // IMPORTANTE: Excluir transações de contratos (que têm contract_id)
    const { data: recurringTransactions, error: fetchError } = await supabaseClient
      .from('transactions')
      .select('*')
      .eq('is_recurring', true)
      .not('recurrence_config', 'is', null)
      .is('contract_id', null); // NÃO processar transações de contratos

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

        // Buscar a transação mais recente para esta recorrência
        const { data: allTransactions } = await supabaseClient
          .from('transactions')
          .select('due_date')
          .or(`id.eq.${transaction.id},reference_number.eq.${transaction.id}`)
          .order('due_date', { ascending: false });

        const lastDate = allTransactions && allTransactions.length > 0 
          ? new Date(allTransactions[0].due_date) 
          : new Date(transaction.due_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let nextDate = new Date(lastDate);
        
        // Calcular a primeira próxima data
        switch (config.frequency) {
          case 'daily':
            nextDate.setDate(nextDate.getDate() + 1);
            break;
          case 'weekly':
            nextDate.setDate(nextDate.getDate() + 7);
            break;
          case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
          case 'quarterly':
            nextDate.setMonth(nextDate.getMonth() + 3);
            break;
          case 'semiannual':
            nextDate.setMonth(nextDate.getMonth() + 6);
            break;
          case 'annual':
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            break;
        }

        // Gerar todas as datas que deveriam existir (passadas, hoje e futuras)
        const datesToGenerate: Date[] = [];
        
        // Definir quantas transações futuras gerar
        const futureOccurrences = 12;
        let count = 0;
        const maxIterations = 100;
        
        while (count < maxIterations) {
          const isPastOrToday = nextDate <= today;
          const isFuture = nextDate > today && datesToGenerate.filter(d => d > today).length < futureOccurrences;
          
          if (isPastOrToday || isFuture) {
            datesToGenerate.push(new Date(nextDate));
          } else if (!isPastOrToday && !isFuture) {
            break;
          }
          
          // Calcular próxima ocorrência
          switch (config.frequency) {
            case 'daily':
              nextDate.setDate(nextDate.getDate() + 1);
              break;
            case 'weekly':
              nextDate.setDate(nextDate.getDate() + 7);
              break;
            case 'monthly':
              nextDate.setMonth(nextDate.getMonth() + 1);
              break;
            case 'quarterly':
              nextDate.setMonth(nextDate.getMonth() + 3);
              break;
            case 'semiannual':
              nextDate.setMonth(nextDate.getMonth() + 6);
              break;
            case 'annual':
              nextDate.setFullYear(nextDate.getFullYear() + 1);
              break;
          }
          
          count++;
        }
        
        console.log(`📅 Datas a gerar para ${transaction.description}: ${datesToGenerate.length}`);

        // Verificar se atingiu o limite de parcelas
        if (config.total_installments) {
          const { data: allExisting } = await supabaseClient
            .from('transactions')
            .select('id')
            .or(`id.eq.${transaction.id},reference_number.eq.${transaction.id}`);

          const currentCount = allExisting?.length || 0;
          
          if (currentCount >= config.total_installments) {
            console.log(`⏩ Limite de ${config.total_installments} parcelas atingido`);
            continue;
          }
          
          // Limitar datas a gerar pelo total de parcelas
          const remaining = config.total_installments - currentCount;
          if (datesToGenerate.length > remaining) {
            datesToGenerate.splice(remaining);
          }
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

          if (existing) {
            console.log(`⏩ Transação já existe para ${dateStr}, pulando...`);
            continue;
          }

          // Determinar status baseado na data
          const transactionDate = new Date(dateStr);
          const currentStatus = transactionDate < today ? 'overdue' : 'pending';

          // Criar nova transação
          const newTransaction = {
            company_id: transaction.company_id,
            type: transaction.type,
            amount: transaction.amount,
            description: transaction.description,
            due_date: dateStr,
            status: currentStatus,
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
            console.error('Detalhes do erro:', insertError);
            continue;
          }

          generatedCount++;
          console.log(`✅ Transação gerada: ${transaction.description} - ${dateStr} [${currentStatus}]`);
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