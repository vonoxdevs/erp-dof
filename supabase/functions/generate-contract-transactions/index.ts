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

    // Verificar se foi passado um contractId específico
    const { contractId } = await req.json().catch(() => ({}));

    console.log('🔄 Iniciando geração de parcelas de contratos...');
    if (contractId) {
      console.log(`📍 Gerando transações para o contrato: ${contractId}`);
    }

    // Buscar contratos ativos (filtrado por ID se fornecido)
    let query = supabaseClient
      .from('contracts')
      .select('*')
      .eq('is_active', true)
      .eq('auto_generate', true)
      .is('deleted_at', null);
    
    if (contractId) {
      query = query.eq('id', contractId);
    }
    
    const { data: contracts, error: fetchError } = await query;

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
        // Validar se o contrato tem centro de custo
        if (!contract.centro_custo_id) {
          console.warn(`⚠️ Contrato ${contract.contract_name || contract.id} não tem centro de custo definido. Pulando...`);
          continue;
        }

        // Buscar primeira conta vinculada ao centro de custo
        const { data: linkedAccounts } = await supabaseClient
          .from('categoria_conta_bancaria')
          .select('conta_bancaria_id')
          .eq('categoria_id', contract.centro_custo_id)
          .eq('habilitado', true)
          .limit(1);

        if (!linkedAccounts || linkedAccounts.length === 0) {
          console.warn(`⚠️ Centro de custo ${contract.centro_custo_id} não tem contas vinculadas. Pulando contrato ${contract.contract_name}...`);
          continue;
        }

        const bankAccountId = linkedAccounts[0].conta_bancaria_id;

        // Data inicial de geração
        let startDate = contract.next_generation_date 
          ? new Date(contract.next_generation_date) 
          : new Date(contract.start_date);
        
        startDate.setHours(0, 0, 0, 0);

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

        // Se tem total de parcelas, verificar quantas já foram geradas
        let existingCount = 0;
        if (contract.total_installments) {
          const { count } = await supabaseClient
            .from('transactions')
            .select('id', { count: 'exact', head: true })
            .eq('contract_id', contract.id);

          existingCount = count || 0;
          
          if (existingCount >= contract.total_installments) {
            console.log(`✅ Contrato ${contract.contract_name} completou todas as ${contract.total_installments} parcelas`);
            await supabaseClient
              .from('contracts')
              .update({ is_active: false })
              .eq('id', contract.id);
            continue;
          }
        }

        // Gerar múltiplas transações futuras
        const datesToGenerate: Date[] = [];
        const futureOccurrences = 12; // Gera até 12 parcelas futuras
        let currentDate = new Date(startDate);
        let count = 0;
        const maxIterations = 100;
        
        while (count < maxIterations) {
          const dueDate = new Date(currentDate);
          dueDate.setDate(contract.generation_day || 1);
          
          // Adicionar se for passada, hoje ou futura (até o limite)
          const isPastOrToday = dueDate <= today;
          const isFuture = dueDate > today && datesToGenerate.filter(d => d > today).length < futureOccurrences;
          
          if (isPastOrToday || isFuture) {
            // Verificar se não passou da data final
            if (contract.end_date) {
              const endDate = new Date(contract.end_date);
              endDate.setHours(0, 0, 0, 0);
              if (dueDate > endDate) break;
            }
            
            // Verificar se não atingiu o total de parcelas
            if (contract.total_installments && (existingCount + datesToGenerate.length) >= contract.total_installments) {
              break;
            }
            
            datesToGenerate.push(new Date(dueDate));
          } else if (!isPastOrToday && !isFuture) {
            break;
          }
          
          // Avançar para próxima ocorrência
          switch (contract.frequency) {
            case 'daily':
              currentDate.setDate(currentDate.getDate() + 1);
              break;
            case 'weekly':
              currentDate.setDate(currentDate.getDate() + 7);
              break;
            case 'monthly':
              currentDate.setMonth(currentDate.getMonth() + 1);
              break;
            case 'quarterly':
              currentDate.setMonth(currentDate.getMonth() + 3);
              break;
            case 'semiannual':
              currentDate.setMonth(currentDate.getMonth() + 6);
              break;
            case 'annual':
              currentDate.setFullYear(currentDate.getFullYear() + 1);
              break;
          }
          
          count++;
        }

        console.log(`📅 ${contract.contract_name}: ${datesToGenerate.length} parcelas a gerar`);

        // Gerar transações
        for (const dueDate of datesToGenerate) {
          const dueDateStr = dueDate.toISOString().split('T')[0];
          
          // Verificar se já existe
          const { data: existing } = await supabaseClient
            .from('transactions')
            .select('id')
            .eq('contract_id', contract.id)
            .eq('due_date', dueDateStr)
            .maybeSingle();

          if (existing) {
            console.log(`⏩ Parcela já existe: ${dueDateStr}`);
            continue;
          }

          // Determinar status
          const transactionStatus = dueDate < today ? 'overdue' : 'pending';

          // Mapear tipo do contrato para tipo da transação
          // Contratos usam 'income' mas transações usam 'revenue'
          let transactionType = contract.type;
          if (contract.type === 'income') transactionType = 'revenue';
          
          console.log(`📝 Criando transação: tipo=${transactionType}, conta=${bankAccountId}`);
          
          // Criar transação
          const newTransaction = {
            company_id: contract.company_id,
            type: transactionType,
            amount: contract.amount,
            description: `${contract.contract_name || contract.description || 'Contrato'} - Parcela`,
            due_date: dueDateStr,
            status: transactionStatus,
            contract_id: contract.id,
            contact_id: contract.contact_id,
            bank_account_id: bankAccountId,
            account_from_id: transactionType === 'expense' ? bankAccountId : null,
            account_to_id: transactionType === 'revenue' ? bankAccountId : null,
            centro_custo_id: contract.centro_custo_id,
            categoria_receita_id: contract.categoria_receita_id,
            categoria_despesa_id: contract.categoria_despesa_id,
            payment_method: contract.payment_method,
            is_recurring: false,
          };
          
          console.log(`📝 Transação preparada:`, JSON.stringify({
            type: newTransaction.type,
            account_from_id: newTransaction.account_from_id,
            account_to_id: newTransaction.account_to_id,
            bank_account_id: newTransaction.bank_account_id
          }));

          const { error: insertError } = await supabaseClient
            .from('transactions')
            .insert(newTransaction);

          if (insertError) {
            console.error(`❌ Erro ao criar transação ${dueDateStr}:`, insertError);
            continue;
          }

          totalGerado++;
          console.log(`✅ Parcela gerada: ${dueDateStr} [${transactionStatus}]`);
        }

        // Atualizar contrato com a última data gerada
        if (datesToGenerate.length > 0) {
          const lastDate = datesToGenerate[datesToGenerate.length - 1];
          const nextDate = new Date(lastDate);
          
          switch (contract.frequency) {
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

          await supabaseClient
            .from('contracts')
            .update({ 
              next_generation_date: nextDate.toISOString().split('T')[0],
              last_generated_date: lastDate.toISOString().split('T')[0]
            })
            .eq('id', contract.id);
        }

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
