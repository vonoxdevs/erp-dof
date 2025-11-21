import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reportData } = await req.json();
    
    if (!reportData) {
      return new Response(
        JSON.stringify({ error: "Dados do relatório não fornecidos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    console.log("📊 Analisando relatório com IA...");

    // Preparar contexto do relatório
    const context = `
Período: ${reportData.period.start} até ${reportData.period.end} (${reportData.period.days} dias)

RESUMO FINANCEIRO:
- Receitas Totais (pagas): R$ ${reportData.summary.totalRevenue.toFixed(2)}
- Despesas Totais (pagas): R$ ${reportData.summary.totalExpenses.toFixed(2)}
- Saldo Realizado: R$ ${reportData.summary.balance.toFixed(2)}
- Transações: ${reportData.summary.transactionCount}
- Ticket Médio: R$ ${reportData.summary.averageTicket.toFixed(2)}

TRANSAÇÕES PREVISTAS/PENDENTES:
- Receitas Pendentes: R$ ${reportData.summary.pendingRevenue.toFixed(2)} (${reportData.summary.pendingCount} transações)
- Despesas Pendentes: R$ ${reportData.summary.pendingExpenses.toFixed(2)}
- Receitas Atrasadas: R$ ${reportData.summary.overdueRevenue.toFixed(2)} (${reportData.summary.overdueCount} atrasadas)
- Despesas Atrasadas: R$ ${reportData.summary.overdueExpenses.toFixed(2)}
- Saldo Projetado (incluindo pendentes): R$ ${(reportData.summary.balance + reportData.summary.pendingRevenue - reportData.summary.pendingExpenses).toFixed(2)}

TENDÊNCIAS:
- Crescimento Receitas: ${reportData.trends.revenueGrowth.toFixed(1)}% vs período anterior
- Crescimento Despesas: ${reportData.trends.expenseGrowth.toFixed(1)}% vs período anterior
- Principal Fonte Receita: ${reportData.trends.topRevenueSource}
- Principal Categoria Despesa: ${reportData.trends.topExpenseCategory}

TOP CATEGORIAS (realizadas):
${reportData.breakdown.topCategories.map((cat: any, i: number) => 
  `${i + 1}. ${cat.category}: Receitas R$ ${cat.revenue.toFixed(2)}, Despesas R$ ${cat.expense.toFixed(2)}`
).join('\n')}

DESPESAS POR CATEGORIA (pagas - Top 5):
${reportData.breakdown.expensesByCategory.slice(0, 5).map((cat: any) => 
  `- ${cat.category}: R$ ${cat.amount.toFixed(2)} (${cat.percentage.toFixed(1)}%)`
).join('\n')}

RECEITAS POR CATEGORIA (pagas - Top 5):
${reportData.breakdown.revenueByCategory.slice(0, 5).map((cat: any) => 
  `- ${cat.category}: R$ ${cat.amount.toFixed(2)} (${cat.percentage.toFixed(1)}%)`
).join('\n')}

VALORES PREVISTOS POR CATEGORIA (pendentes e atrasadas):
${reportData.breakdown.pendingByCategory && reportData.breakdown.pendingByCategory.length > 0 
  ? reportData.breakdown.pendingByCategory.slice(0, 5).map((cat: any) => 
      `- ${cat.category}: Receitas R$ ${cat.revenue.toFixed(2)} | Despesas R$ ${cat.expense.toFixed(2)}`
    ).join('\n')
  : 'Nenhuma transação pendente'}
`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um analista financeiro experiente especializado em análise de demonstrativos financeiros empresariais. 
Sua função é analisar dados financeiros e fornecer insights estratégicos, práticos e acionáveis em português brasileiro.

DIRETRIZES:
1. Seja objetivo e profissional
2. Identifique pontos críticos e oportunidades
3. Forneça recomendações práticas e específicas
4. Use linguagem clara e acessível
5. Considere o contexto de pequenas e médias empresas brasileiras
6. Organize sua análise em seções claras
7. IMPORTANTE: Considere tanto os valores realizados (pagos) quanto os previstos (pendentes e atrasados) na sua análise
8. Dê atenção especial às transações atrasadas, pois podem indicar problemas de fluxo de caixa

ESTRUTURA DA RESPOSTA:
📊 ANÁLISE GERAL (2-3 frases sobre a saúde financeira geral, incluindo projeções)

🎯 PRINCIPAIS INSIGHTS (3-5 pontos principais, cada um com título e explicação curta)

⚠️ PONTOS DE ATENÇÃO (2-3 alertas ou riscos identificados, incluindo análise de pendências e atrasos)

💡 RECOMENDAÇÕES ESTRATÉGICAS (3-4 ações concretas e específicas)

📈 OPORTUNIDADES (2-3 oportunidades de melhoria ou crescimento)

Seja direto, prático e focado em ações que a empresa pode tomar.`
          },
          {
            role: "user",
            content: `Analise o seguinte relatório financeiro e forneça insights estratégicos:\n\n${context}`
          }
        ],
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Erro na API Lovable:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao seu workspace Lovable." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`Erro na API: ${response.status}`);
    }

    const aiResponse = await response.json();
    const analysis = aiResponse.choices[0]?.message?.content;

    console.log("✅ Análise concluída com sucesso");

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Erro ao analisar relatório:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
