import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteEmailRequest {
  email: string;
  fullName: string;
  inviteLink: string;
  companyName: string;
  role: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, inviteLink, companyName, role }: InviteEmailRequest = await req.json();

    console.log("Sending invite email to:", email);

    // Send email using Resend API directly
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Sistema Financeiro <onboarding@resend.dev>",
        to: [email],
        subject: `Convite para ${companyName}`,
        html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
              background-color: #f4f4f4;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              background: white;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 40px 20px;
              text-align: center;
            }
            .content {
              padding: 40px 30px;
            }
            .button {
              display: inline-block;
              padding: 14px 32px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
              font-weight: 600;
            }
            .button:hover {
              opacity: 0.9;
            }
            .info-box {
              background: #f8f9fa;
              border-left: 4px solid #667eea;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .footer {
              background: #f8f9fa;
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">Você foi convidado!</h1>
            </div>
            <div class="content">
              <p>Olá <strong>${fullName}</strong>,</p>
              
              <p>Você foi convidado para fazer parte do sistema financeiro da empresa <strong>${companyName}</strong>!</p>
              
              <div class="info-box">
                <p style="margin: 5px 0;"><strong>Cargo:</strong> ${role}</p>
                <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
              </div>
              
              <p>Para aceitar o convite e criar sua conta, clique no botão abaixo:</p>
              
              <div style="text-align: center;">
                <a href="${inviteLink}" class="button">Aceitar Convite</a>
              </div>
              
              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                Ou copie e cole este link no seu navegador:<br>
                <code style="background: #f4f4f4; padding: 8px; display: inline-block; margin-top: 8px; border-radius: 4px; word-break: break-all;">${inviteLink}</code>
              </p>
              
              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                <strong>Importante:</strong> Este convite é válido por 7 dias.
              </p>
            </div>
            <div class="footer">
              <p>Se você não esperava receber este email, pode ignorá-lo com segurança.</p>
              <p>&copy; ${new Date().getFullYear()} ${companyName}. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error sending email:", errorData);
      throw new Error(errorData.message || "Failed to send email");
    }

    const emailResponse = await response.json();
    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, messageId: emailResponse.id }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-invite-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
