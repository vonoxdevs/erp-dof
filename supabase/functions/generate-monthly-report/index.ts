import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  company_id?: string;
  month: string;
  year: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { company_id, month, year }: RequestBody = await req.json();

    console.log(`📊 Generating monthly report for company ${company_id}, period: ${year}-${month}`);

    // Calcular datas do período
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Buscar transações do mês
    const { data: transactions, error: transError } = await supabaseClient
      .from('transactions')
      .select(`
        *,
        categories (name, color),
        contacts (name),
        bank_accounts (bank_name)
      `)
      .eq('company_id', company_id)
      .gte('due_date', startDateStr)
      .lte('due_date', endDateStr)
      .order('due_date', { ascending: true });

    if (transError) {
      console.error('Error fetching transactions:', transError);
      throw transError;
    }

    console.log(`📝 Found ${transactions?.length || 0} transactions`);

    // Buscar dados da empresa
    const { data: company } = await supabaseClient
      .from('companies')
      .select('name')
      .eq('id', company_id)
      .single();

    const companyName = company?.name || 'Empresa';

    // Calcular métricas
    const totalRevenue = (transactions || [])
      .filter(t => t.type === 'revenue' && t.status === 'paid')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpenses = (transactions || [])
      .filter(t => t.type === 'expense' && t.status === 'paid')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const balance = totalRevenue - totalExpenses;

    // Agrupar por categoria
    const revenueByCategory: Record<string, number> = {};
    const expensesByCategory: Record<string, number> = {};

    (transactions || []).forEach(t => {
      if (t.status !== 'paid') return;
      
      const categoryName = t.categories?.name || 'Sem Categoria';
      const amount = Number(t.amount);

      if (t.type === 'revenue') {
        revenueByCategory[categoryName] = (revenueByCategory[categoryName] || 0) + amount;
      } else if (t.type === 'expense') {
        expensesByCategory[categoryName] = (expensesByCategory[categoryName] || 0) + amount;
      }
    });

    // Criar relatório como texto simples
    const reportText = `
RELATÓRIO MENSAL - ${companyName}
Período: ${startDateStr} a ${endDateStr}

RESUMO FINANCEIRO:
- Receitas: R$ ${totalRevenue.toFixed(2)}
- Despesas: R$ ${totalExpenses.toFixed(2)}
- Saldo: R$ ${balance.toFixed(2)}
- Total de Transações: ${transactions?.length || 0}

RECEITAS POR CATEGORIA:
${Object.entries(revenueByCategory).map(([cat, val]) => `- ${cat}: R$ ${val.toFixed(2)}`).join('\n')}

DESPESAS POR CATEGORIA:
${Object.entries(expensesByCategory).map(([cat, val]) => `- ${cat}: R$ ${val.toFixed(2)}`).join('\n')}
`;

    // Salvar relatório como arquivo de texto no Storage
    const fileName = `${company_id}/monthly_${year}_${month.padStart(2, '0')}.txt`;
    const encoder = new TextEncoder();
    const data = encoder.encode(reportText);

    const { error: uploadError } = await supabaseClient.storage
      .from('financial-reports')
      .upload(fileName, data, {
        contentType: 'text/plain',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading report:', uploadError);
      throw uploadError;
    }

    console.log(`✅ Report uploaded: ${fileName}`);

    // Criar registro na tabela
    const { error: insertError } = await supabaseClient
      .from('generated_reports')
      .insert({
        company_id,
        report_type: 'monthly',
        period_start: startDateStr,
        period_end: endDateStr,
        file_url: fileName,
        metadata: {
          total_revenue: totalRevenue,
          total_expenses: totalExpenses,
          balance,
          transaction_count: transactions?.length || 0,
          revenue_by_category: revenueByCategory,
          expenses_by_category: expensesByCategory
        }
      });

    if (insertError) {
      console.error('Error inserting report record:', insertError);
      throw insertError;
    }

    console.log('✅ Report record created successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Monthly report generated successfully',
        file_url: fileName,
        stats: {
          total_revenue: totalRevenue,
          total_expenses: totalExpenses,
          balance,
          transaction_count: transactions?.length || 0
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error generating monthly report:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
