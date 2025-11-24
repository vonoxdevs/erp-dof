import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'revenue' | 'expense';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, isImage } = await req.json();
    
    if (!content) {
      return new Response(
        JSON.stringify({ error: 'Content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log('Analyzing bank statement with AI...', { isImage });

    // Build message content based on whether it's an image or text
    let userMessageContent;
    
    if (isImage) {
      // For images, send as image_url with proper format
      userMessageContent = [
        {
          type: "text",
          text: "Analise esta imagem de extrato bancário e extraia todas as transações que você conseguir identificar. Extraia a data, descrição, valor e tipo (receita ou despesa) de cada transação."
        },
        {
          type: "image_url",
          image_url: {
            url: content // base64 data URL
          }
        }
      ];
    } else {
      // For text/CSV, send as regular text
      userMessageContent = `Analise este extrato bancário e extraia as transações:\n\n${content}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um assistente especializado em análise de extratos bancários brasileiros. 
Sua tarefa é extrair transações de um extrato bancário (texto ou imagem) e retornar um JSON estruturado.

Para cada transação identifique:
- Data (formato YYYY-MM-DD)
- Descrição (texto limpo e conciso)
- Valor (número positivo)
- Tipo: "revenue" para entradas/créditos ou "expense" para saídas/débitos

Regras importantes:
1. Retorne APENAS transações claramente identificáveis
2. Ignore linhas de cabeçalho, totais, saldos
3. Para valores, use apenas números (sem R$, vírgulas como separador decimal devem virar ponto)
4. Se a data estiver incompleta, use o ano atual (2025)
5. Ignore duplicatas
6. Para débitos/saídas/pagamentos use type "expense"
7. Para créditos/entradas/recebimentos use type "revenue"

IMPORTANTE: Retorne no máximo 50 transações para evitar timeout. Se houver mais, priorize as mais recentes.

Retorne um array JSON no formato:
[
  {
    "date": "2025-01-15",
    "description": "Pagamento Fornecedor XYZ",
    "amount": 1500.00,
    "type": "expense"
  }
]`
          },
          {
            role: "user",
            content: userMessageContent
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_transactions",
              description: "Extract transactions from bank statement",
              parameters: {
                type: "object",
                properties: {
                  transactions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        date: { type: "string", description: "Transaction date in YYYY-MM-DD format" },
                        description: { type: "string", description: "Transaction description" },
                        amount: { type: "number", description: "Transaction amount (positive number)" },
                        type: { type: "string", enum: ["revenue", "expense"], description: "Transaction type" }
                      },
                      required: ["date", "description", "amount", "type"]
                    }
                  }
                },
                required: ["transactions"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_transactions" } },
        temperature: 0.1
      }),
    });

    console.log('AI API responded with status:', response.status);

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de taxa excedido, tente novamente mais tarde." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao seu workspace Lovable AI." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao processar com IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log('AI Response:', JSON.stringify(data, null, 2));

    // Extract transactions from tool call
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'extract_transactions') {
      console.error('No tool call found in response');
      return new Response(
        JSON.stringify({ error: 'Formato de resposta inválido da IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const transactions = JSON.parse(toolCall.function.arguments).transactions as ParsedTransaction[];
    console.log(`Successfully extracted ${transactions.length} transactions`);

    return new Response(
      JSON.stringify({ transactions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-bank-statement function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
