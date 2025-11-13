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

    // Buscar contratos ativos
    const { data: contracts, error: fetchError } = await supabaseClient
      .from('contracts')
      .select('*')
      .eq('is_active', true)
      .eq('auto_generate', true)
      .is('deleted_at', null);

    if (fetchError) {
      console.error('❌ Erro ao buscar contratos:', fetchError);
      throw fetchError;
    }

    console.log(`📋 Encontrados ${contracts?.length || 0} contratos ativos`);

    let totalGerado = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const contract of contracts || []) {
      try {
        // Verificar se deve gerar
        let nextGenDate = contract.next_generation_date 
          ? new Date(contract.next_generation_date) 
          : new Date(contract.start_date);
        
        nextGenDate.setHours(0, 0, 0, 0);

        // Se ainda não chegou a data de geração, pular
        if (nextGenDate > today) {
          console.log(`⏳ Contrato ${contract.contract_name} - próxima geração em ${nextGenDate.toISOString().split('T')[0]}`);
          continue;
        }

        // Se tem data final e já passou, desativar contrato
        if (contract.end_date) {
          const endDate = new Date(contract.end_date);
          endDate.setHours(0, 0, 0, 0);
          
          if (today > endDate) {
            console.log(`🏁 Contrato ${contract.contract_name} encerrado`);
            await supabaseClient
              .from('contracts')
              .update({ is_active: false })
              .eq('id', contract.id);
            continue;
          }
        }

        // Se tem total de parcelas, verificar se já gerou todas
        if (contract.total_installments) {
          const { count } = await supabaseClient
            .from('transactions')
            .select('id', { count: 'exact', head: true })
            .eq('contract_id', contract.id);

          if (count && count >= contract.total_installments) {
            console.log(`✅ Contrato ${contract.contract_name} completou todas as ${contract.total_installments} parcelas`);
            await supabaseClient
              .from('contracts')
              .update({ is_active: false })
              .eq('id', contract.id);
            continue;
          }
        }

        // Gerar transação do mês atual
        const dueDate = new Date(nextGenDate);
        dueDate.setDate(contract.generation_day || 1);
        const dueDateStr = dueDate.toISOString().split('T')[0];

        // Verificar se já existe
        const { data: existing } = await supabaseClient
          .from('transactions')
          .select('id')
          .eq('contract_id', contract.id)
          .eq('due_date', dueDateStr)
          .maybeSingle();

        if (existing) {
          console.log(`⏩ Parcela já existe para ${contract.contract_name} - ${dueDateStr}`);
          
          // Atualizar próxima data de geração
          const nextDate = new Date(nextGenDate);
          switch (contract.frequency) {
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

          await supabaseClient
            .from('contracts')
            .update({ 
              next_generation_date: nextDate.toISOString().split('T')[0],
              last_generated_date: dueDateStr
            })
            .eq('id', contract.id);

          continue;
        }

        // Determinar status
        const transactionStatus = dueDate < today ? 'overdue' : 'pending';

        // Criar transação
        const newTransaction = {
          company_id: contract.company_id,
          type: contract.type,
          amount: contract.amount,
          description: `${contract.contract_name || contract.description || 'Contrato'} - Parcela`,
          due_date: dueDateStr,
          status: transactionStatus,
          contract_id: contract.id,
          contact_id: contract.contact_id,
          bank_account_id: contract.bank_account_id,
          centro_custo_id: contract.centro_custo_id,
          categoria_receita_id: contract.categoria_receita_id,
          categoria_despesa_id: contract.categoria_despesa_id,
          payment_method: contract.payment_method,
          is_recurring: false,
        };

        const { error: insertError } = await supabaseClient
          .from('transactions')
          .insert(newTransaction);

        if (insertError) {
          console.error(`❌ Erro ao criar transação para ${contract.contract_name}:`, insertError);
          continue;
        }

        // Calcular próxima data de geração
        const nextDate = new Date(nextGenDate);
        switch (contract.frequency) {
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

        // Atualizar contrato
        await supabaseClient
          .from('contracts')
          .update({ 
            next_generation_date: nextDate.toISOString().split('T')[0],
            last_generated_date: dueDateStr
          })
          .eq('id', contract.id);

        totalGerado++;
        console.log(`✅ Parcela gerada: ${contract.contract_name} - ${dueDateStr} [${transactionStatus}]`);

      } catch (error) {
        console.error(`❌ Erro ao processar contrato ${contract.id}:`, error);
        continue;
      }
    }

    console.log(`✅ Total: ${totalGerado} parcelas geradas`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${totalGerado} parcelas geradas com sucesso`,
        count: totalGerado
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
