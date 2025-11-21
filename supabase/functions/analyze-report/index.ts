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

    // Preparar contexto do relatório com formatação clara
    const totalPending = reportData.summary.pendingRevenue - reportData.summary.pendingExpenses;
    const totalOverdue = reportData.summary.overdueRevenue - reportData.summary.overdueExpenses;
    const projectedBalance = reportData.summary.balance + totalPending + totalOverdue;

    const context = `
=== PERÍODO DE ANÁLISE ===
${reportData.period.start} até ${reportData.period.end} (${reportData.period.days} dias)

=== VALORES REALIZADOS (JÁ PAGOS/RECEBIDOS) ===
✅ Receitas Pagas: R$ ${reportData.summary.totalRevenue.toFixed(2)}
✅ Despesas Pagas: R$ ${reportData.summary.totalExpenses.toFixed(2)}
💰 Saldo Realizado: R$ ${reportData.summary.balance.toFixed(2)}
📊 Total de Transações: ${reportData.summary.transactionCount}
💵 Ticket Médio de Receitas: R$ ${reportData.summary.averageTicket.toFixed(2)}

=== VALORES PREVISTOS (AINDA NÃO REALIZADOS) ===

📅 PENDENTES (A vencer):
   • Receitas: R$ ${reportData.summary.pendingRevenue.toFixed(2)} (${reportData.summary.pendingCount} transações)
   • Despesas: R$ ${reportData.summary.pendingExpenses.toFixed(2)}
   • Saldo Pendente: R$ ${totalPending.toFixed(2)}

⚠️ ATRASADAS (Vencidas):
   • Receitas: R$ ${reportData.summary.overdueRevenue.toFixed(2)} (${reportData.summary.overdueCount} transações)
   • Despesas: R$ ${reportData.summary.overdueExpenses.toFixed(2)}
   • Saldo Atrasado: R$ ${totalOverdue.toFixed(2)}

🎯 PROJEÇÃO COMPLETA:
   • Saldo Atual (Realizado): R$ ${reportData.summary.balance.toFixed(2)}
   • + Pendentes: R$ ${totalPending.toFixed(2)}
   • + Atrasadas: R$ ${totalOverdue.toFixed(2)}
   • = Saldo Projetado Total: R$ ${projectedBalance.toFixed(2)}

=== ANÁLISE DE TENDÊNCIAS ===
📈 Crescimento de Receitas: ${reportData.trends.revenueGrowth.toFixed(1)}% vs período anterior
📉 Crescimento de Despesas: ${reportData.trends.expenseGrowth.toFixed(1)}% vs período anterior
🏆 Principal Fonte de Receita: ${reportData.trends.topRevenueSource}
💸 Principal Categoria de Despesa: ${reportData.trends.topExpenseCategory}

=== BREAKDOWN POR CATEGORIA (VALORES REALIZADOS) ===

Top 5 Categorias por Volume Total:
${reportData.breakdown.topCategories.map((cat: any, i: number) => 
  `${i + 1}. ${cat.category}
     Receitas: R$ ${cat.revenue.toFixed(2)} | Despesas: R$ ${cat.expense.toFixed(2)} | Saldo: R$ ${(cat.revenue - cat.expense).toFixed(2)}`
).join('\n')}

Despesas Pagas - Distribuição (%):
${reportData.breakdown.expensesByCategory.slice(0, 5).map((cat: any) => 
  `  • ${cat.category}: R$ ${cat.amount.toFixed(2)} (${cat.percentage.toFixed(1)}% do total)`
).join('\n')}

Receitas Pagas - Distribuição (%):
${reportData.breakdown.revenueByCategory.slice(0, 5).map((cat: any) => 
  `  • ${cat.category}: R$ ${cat.amount.toFixed(2)} (${cat.percentage.toFixed(1)}% do total)`
).join('\n')}

=== VALORES PREVISTOS POR CATEGORIA ===
${reportData.breakdown.pendingByCategory && reportData.breakdown.pendingByCategory.length > 0 
  ? reportData.breakdown.pendingByCategory.slice(0, 5).map((cat: any) => 
      `  • ${cat.category}
     Receitas Previstas: R$ ${cat.revenue.toFixed(2)} | Despesas Previstas: R$ ${cat.expense.toFixed(2)}`
    ).join('\n')
  : '  Nenhuma transação pendente ou atrasada'}
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
            content: `Você é um CFO (Chief Financial Officer) sênior especializado em análise financeira empresarial.
Sua missão é analisar demonstrativos financeiros e fornecer insights estratégicos acionáveis para PMEs brasileiras.

=== INSTRUÇÕES CRÍTICAS DE ANÁLISE ===

1. ENTENDA OS NÚMEROS CORRETAMENTE:
   • "VALORES REALIZADOS" = transações já pagas/recebidas (fatos consumados)
   • "VALORES PREVISTOS" = transações pendentes + atrasadas (ainda não realizadas)
   • "Saldo Projetado" = realizado + pendentes + atrasadas (visão completa do futuro)

2. ANÁLISE DEVE SER BASEADA EM:
   ✅ Saldo Realizado: para avaliar a situação ATUAL
   ✅ Valores Pendentes: para projetar o que DEVE acontecer
   ⚠️ Valores Atrasados: para identificar PROBLEMAS DE FLUXO DE CAIXA
   🎯 Saldo Projetado: para entender o cenário COMPLETO

3. EXEMPLO DE INTERPRETAÇÃO CORRETA:
   Se o relatório mostra:
   - Saldo Realizado: R$ 10.000 (já em caixa)
   - Pendentes: R$ 5.000 receitas / R$ 3.000 despesas
   - Atrasadas: R$ 2.000 receitas / R$ 1.000 despesas
   
   Análise correta:
   "A empresa tem R$ 10.000 em caixa (realizados). Considerando as transações previstas (pendentes), 
   o saldo deve subir para R$ 12.000. Porém, há R$ 2.000 em receitas atrasadas que precisam 
   de atenção imediata, pois podem comprometer o fluxo de caixa."

4. NUNCA CONFUNDA:
   ❌ "Saldo Realizado" com "Saldo Projetado"
   ❌ "Receitas Pagas" com "Receitas Pendentes"
   ❌ Ignore os valores previstos - eles são essenciais para a análise

5. ESTRUTURA OBRIGATÓRIA DA RESPOSTA:

📊 SITUAÇÃO ATUAL
- Analise APENAS valores realizados (caixa atual)
- Seja específico sobre o que JÁ aconteceu

📈 PROJEÇÃO E EXPECTATIVAS
- Analise valores pendentes e projetados
- Explique o que DEVE acontecer se tudo ocorrer conforme previsto

⚠️ ALERTAS CRÍTICOS
- Foque em valores ATRASADOS (estes são problemas reais)
- Identifique riscos ao fluxo de caixa
- Mencione concentrações de risco em categorias

💡 RECOMENDAÇÕES PRÁTICAS (3-4 ações)
- Seja específico e acionável
- Priorize ações que resolvam os alertas críticos

📊 OPORTUNIDADES (2-3 pontos)
- Identifique potenciais de melhoria
- Sugira otimizações baseadas nos dados

=== DIRETRIZES DE COMUNICAÇÃO ===
• Use linguagem objetiva e profissional
• Cite números específicos do relatório (valores e percentuais)
• Sempre deixe claro quando estiver falando de realizado x projetado
• Se algum dado não estiver disponível, diga explicitamente que não há informação
• Evite textos genéricos que poderiam servir para qualquer empresa
• Evite frases vagas sem referência direta aos números do relatório
• Considere o contexto de PMEs brasileiras

=== O QUE NÃO FAZER ===
❌ Não invente números que não estão no relatório
❌ Não confunda realizado com projetado
❌ Não ignore as transações atrasadas
❌ Não dê recomendações genéricas sem base nos dados
❌ Não use mais de 1500 tokens na resposta`
          },
          {
            role: "user",
            content: `Analise o seguinte relatório financeiro e forneça insights estratégicos:\n\n${context}`
          }
        ],
        max_tokens: 1500,
        temperature: 0.15,
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
