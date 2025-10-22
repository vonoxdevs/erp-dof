import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Validation constants
const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 4000;
const VALID_ROLES = ['user', 'assistant', 'system'];

// Validate message structure and content
function validateMessages(messages: any): { valid: boolean; error?: string } {
  // Check if messages is an array
  if (!Array.isArray(messages)) {
    return { valid: false, error: "Messages must be an array" };
  }

  // Check array length
  if (messages.length === 0) {
    return { valid: false, error: "Messages array cannot be empty" };
  }

  if (messages.length > MAX_MESSAGES) {
    return { valid: false, error: `Messages array exceeds maximum length of ${MAX_MESSAGES}` };
  }

  // Validate each message
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    // Check message structure
    if (typeof msg !== 'object' || msg === null) {
      return { valid: false, error: `Message at index ${i} is not an object` };
    }

    // Check required fields
    if (!msg.role || !msg.content) {
      return { valid: false, error: `Message at index ${i} is missing role or content` };
    }

    // Validate role
    if (!VALID_ROLES.includes(msg.role)) {
      return { valid: false, error: `Message at index ${i} has invalid role` };
    }

    // Validate content
    if (typeof msg.content !== 'string') {
      return { valid: false, error: `Message at index ${i} has invalid content type` };
    }

    // Check content length
    if (msg.content.length > MAX_MESSAGE_LENGTH) {
      return { valid: false, error: `Message at index ${i} exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters` };
    }
  }

  return { valid: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { messages } = body;

    // Validate messages
    const validation = validateMessages(messages);
    if (!validation.valid) {
      console.error("Validation error:", validation.error);
      return new Response(
        JSON.stringify({ error: "Entrada inválida. Por favor, verifique sua mensagem e tente novamente." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("AI Assistant request received");

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
            content: `Você é um assistente financeiro especialista do LSFIN v2.0, o ERP financeiro mais avançado do mundo.

Suas responsabilidades:
- Analisar transações financeiras e identificar padrões
- Fornecer insights sobre fluxo de caixa e rentabilidade
- Sugerir otimizações e economias
- Responder perguntas sobre finanças corporativas
- Categorizar despesas e receitas automaticamente
- Detectar anomalias e riscos financeiros
- Fazer previsões de caixa baseadas em histórico

Você deve:
- Ser profissional e objetivo
- Usar dados reais quando disponíveis
- Fornecer recomendações acionáveis
- Explicar conceitos financeiros de forma clara
- Alertar sobre riscos quando necessário
- Sempre responder em português brasileiro

Mantenha respostas concisas e focadas em ação.`,
          },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos em Configurações -> Workspace -> Uso." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
      },
    });
  } catch (error) {
    console.error("Error in ai-assistant function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
