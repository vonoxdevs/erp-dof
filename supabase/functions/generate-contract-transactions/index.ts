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
        // Validar conta bancária
        if (!contract.bank_account_id) {
          console.warn(`⚠️ Contrato ${contract.contract_name || contract.id} não tem conta bancária definida. Pulando...`);
          continue;
        }

        const bankAccountId = contract.bank_account_id;

        // Data de início do contrato
        const contractStartDate = new Date(contract.start_date);
        contractStartDate.setHours(0, 0, 0, 0);

        console.log(`\n📋 Processando: ${contract.contract_name}`);
        console.log(`   📅 Data início: ${contractStartDate.toISOString().split('T')[0]}`);
        console.log(`   🔄 Frequência: ${contract.frequency}`);

        // Se tem data final e já passou, desativar contrato
        if (contract.end_date) {
          const endDate = new Date(contract.end_date);
          endDate.setHours(0, 0, 0, 0);
          
          if (today > endDate) {
            console.log(`   🏁 Contrato encerrado (data final atingida)`);
            await supabaseClient
              .from('contracts')
              .update({ is_active: false })
              .eq('id', contract.id);
            continue;
          }
        }

        // Buscar a última transação gerada para este contrato
        const { data: lastTransaction } = await supabaseClient
          .from('transactions')
          .select('due_date')
          .eq('contract_id', contract.id)
          .order('due_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Determinar data inicial de geração
        let startGenerationDate: Date;
        
        if (lastTransaction) {
          // Se já existe transação, começar da próxima data após a última
          startGenerationDate = new Date(lastTransaction.due_date);
          
          // Avançar para a próxima ocorrência
          switch (contract.frequency) {
            case 'daily':
              startGenerationDate.setDate(startGenerationDate.getDate() + 1);
              break;
            case 'weekly':
              startGenerationDate.setDate(startGenerationDate.getDate() + 7);
              break;
            case 'monthly':
              startGenerationDate.setMonth(startGenerationDate.getMonth() + 1);
              break;
            case 'quarterly':
              startGenerationDate.setMonth(startGenerationDate.getMonth() + 3);
              break;
            case 'semiannual':
              startGenerationDate.setMonth(startGenerationDate.getMonth() + 6);
              break;
            case 'annual':
              startGenerationDate.setFullYear(startGenerationDate.getFullYear() + 1);
              break;
          }
          
          console.log(`   ⏭️  Última transação: ${lastTransaction.due_date}`);
          console.log(`   🎯 Próxima geração: ${startGenerationDate.toISOString().split('T')[0]}`);
        } else {
          // Se nunca gerou, começar da data de início
          startGenerationDate = new Date(contractStartDate);
          console.log(`   🆕 Primeira geração a partir de: ${startGenerationDate.toISOString().split('T')[0]}`);
        }

        // Garantir que não comece antes da data de início
        if (startGenerationDate < contractStartDate) {
          startGenerationDate = new Date(contractStartDate);
        }

        // Se tem total de parcelas, verificar quantas já foram geradas
        let existingCount = 0;
        if (contract.total_installments) {
          const { count } = await supabaseClient
            .from('transactions')
            .select('id', { count: 'exact', head: true })
            .eq('contract_id', contract.id);

          existingCount = count || 0;
          console.log(`   📊 Parcelas: ${existingCount}/${contract.total_installments}`);
          
          if (existingCount >= contract.total_installments) {
            console.log(`   ✅ Todas as parcelas geradas`);
            await supabaseClient
              .from('contracts')
              .update({ is_active: false })
              .eq('id', contract.id);
            continue;
          }
        }

        // Gerar múltiplas transações (passadas, hoje e futuras)
        const datesToGenerate: Date[] = [];
        const futureOccurrences = 12; // Gera até 12 parcelas futuras
        let currentDate = new Date(startGenerationDate);
        let iterationCount = 0;
        const maxIterations = 100;
        
        while (iterationCount < maxIterations) {
          // Verificar se não passou da data final
          if (contract.end_date) {
            const endDate = new Date(contract.end_date);
            endDate.setHours(0, 0, 0, 0);
            if (currentDate > endDate) break;
          }
          
          // Verificar se não atingiu o total de parcelas
          if (contract.total_installments && (existingCount + datesToGenerate.length) >= contract.total_installments) {
            break;
          }
          
          // Adicionar se for passada, hoje ou futura (até o limite)
          const isPastOrToday = currentDate <= today;
          const futureCount = datesToGenerate.filter(d => d > today).length;
          const isFuture = currentDate > today && futureCount < futureOccurrences;
          
          if (isPastOrToday || isFuture) {
            datesToGenerate.push(new Date(currentDate));
          } else if (!isPastOrToday && !isFuture) {
            // Se já gerou todas as futuras necessárias, parar
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
          
          iterationCount++;
        }

        console.log(`   🎲 Datas a gerar: ${datesToGenerate.length}`);
        if (datesToGenerate.length > 0) {
          console.log(`      Primeira: ${datesToGenerate[0].toISOString().split('T')[0]}`);
          console.log(`      Última: ${datesToGenerate[datesToGenerate.length - 1].toISOString().split('T')[0]}`);
        }

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
            console.log(`      ⏩ ${dueDateStr} já existe`);
            continue;
          }

          // Determinar status
          const transactionStatus = dueDate < today ? 'overdue' : 'pending';

          // Mapear tipo do contrato para tipo da transação
          // Contratos usam 'income' mas transações usam 'revenue'
          let transactionType = contract.type;
          if (contract.type === 'income') transactionType = 'revenue';
          
          console.log(`📝 Criando transação: tipo=${transactionType}, conta=${bankAccountId}`);
          
          // Criar transação (marcada como recorrente pois vem de contrato, mas SEM recurrence_config)
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
            is_recurring: false, // IMPORTANTE: FALSE para não ser processada pela função de recorrentes
            recurrence_config: null, // IMPORTANTE: NULL para não gerar duplicatas
            reference_number: contract.id,
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
          console.log(`      ✅ ${dueDateStr} [${transactionStatus}]`);
        }

        // Atualizar contrato com as datas corretas
        if (datesToGenerate.length > 0) {
          const lastGenerated = datesToGenerate[datesToGenerate.length - 1];
          const nextDate = new Date(lastGenerated);
          
          // Calcular próxima data de geração
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
              last_generated_date: lastGenerated.toISOString().split('T')[0]
            })
            .eq('id', contract.id);
            
          console.log(`   💾 Atualizado: next=${nextDate.toISOString().split('T')[0]}`);
        }

      } catch (error) {
        console.error(`❌ Erro ao processar contrato ${contract.id}:`, error);
        continue;
      }
    }

    console.log(`\n✅ Total: ${totalGerado} parcelas geradas`);

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
