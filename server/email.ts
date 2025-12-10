/**
 * Módulo de envio de emails usando Resend
 */

import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function sendActivationEmail(
  email: string,
  activationToken: string,
  companyName: string
): Promise<void> {
  const activationUrl = `${process.env.VITE_APP_URL || "http://localhost:3000"}/activate/${activationToken}`;
  
  // Se Resend não estiver configurado, apenas logar (modo desenvolvimento)
  if (!resend) {
    console.log(`[Email] ⚠️  RESEND_API_KEY não configurado. Email não será enviado.`);
    console.log(`[Email] 📧 Para: ${email}`);
    console.log(`[Email] 🔗 Link de ativação: ${activationUrl}`);
    console.log(`[Email] 📝 Para enviar emails reais, configure RESEND_API_KEY no .env`);
    return;
  }

  try {
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    
    const { data, error } = await resend.emails.send({
      from: `SaaS Agentes <${fromEmail}>`,
      to: [email],
      subject: "Ative sua conta - SaaS de Agentes",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Bem-vindo ao SaaS de Agentes!</h1>
            </div>
            <div class="content">
              <p>Olá <strong>${companyName}</strong>!</p>
              
              <p>Sua conta foi criada com sucesso! Para começar a usar, você precisa ativar sua conta e definir uma senha.</p>
              
              <p style="text-align: center;">
                <a href="${activationUrl}" class="button">Ativar Minha Conta</a>
              </p>
              
              <p>Ou copie e cole este link no seu navegador:</p>
              <p style="background: #fff; padding: 10px; border-radius: 5px; word-break: break-all;">
                ${activationUrl}
              </p>
              
              <p><strong>Este link é válido por 7 dias.</strong></p>
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
              
              <p><strong>Após ativar sua conta, você poderá:</strong></p>
              <ul>
                <li>✅ Conectar seu WhatsApp Business</li>
                <li>✅ Configurar seu agente de IA</li>
                <li>✅ Visualizar conversas e métricas</li>
                <li>✅ Personalizar o comportamento do agente</li>
              </ul>
              
              <p>Se você não solicitou esta conta, pode ignorar este email com segurança.</p>
            </div>
            <div class="footer">
              <p>Atenciosamente,<br>Equipe SaaS de Agentes</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Olá ${companyName}!

Sua conta no SaaS de Agentes foi criada com sucesso! 🎉

Para ativar sua conta e definir sua senha, clique no link abaixo:

${activationUrl}

Este link é válido por 7 dias.

Após ativar sua conta, você poderá:
- Conectar seu WhatsApp Business
- Configurar seu agente de IA
- Visualizar conversas e métricas

Se você não solicitou esta conta, ignore este email.

Atenciosamente,
Equipe SaaS de Agentes
      `.trim(),
    });

    if (error) {
      console.error("[Email] Erro ao enviar email:", error);
      throw new Error(`Falha ao enviar email: ${error.message}`);
    }

    console.log(`[Email] ✅ Email de ativação enviado para ${email} (ID: ${data?.id})`);
  } catch (error: any) {
    console.error("[Email] Erro ao enviar email:", error);
    
    // Se falhar, mostrar token no console para teste manual
    console.log(`\n⚠️  [EMAIL FALHOU] Token de ativação para ${email}:`);
    console.log(`🔗 Link manual: ${activationUrl}`);
    console.log(`📋 Token: ${activationToken}\n`);
    
    // Não lançar erro para não quebrar o fluxo de provisionamento
    // Apenas logar o erro
  }
}
