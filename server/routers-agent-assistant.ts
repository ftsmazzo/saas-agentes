// ============================================
// Endpoint para Assistente de IA na Configuração
// ============================================
// Adicione este código no arquivo server/routers.ts
// dentro do router clientPanel ou agent

import { z } from "zod";
import { TRPCError } from "@trpc/server";

/**
 * Gera systemPrompt usando OpenAI
 */
generateSystemPrompt: protectedProcedure
  .input(z.object({
    businessName: z.string().min(1, "Nome da empresa é obrigatório"),
    businessType: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    tone: z.enum(['professional', 'friendly', 'casual', 'formal']).optional(),
    rules: z.array(z.object({
      question: z.string(),
      answer: z.string(),
    })).optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    const tenant = ctx.tenant;
    if (!tenant) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Cliente não encontrado' });
    }

    // Construir prompt para OpenAI
    const systemPromptTemplate = `Você é um especialista em criar prompts de sistema para agentes de IA de atendimento.

Crie um prompt de sistema completo, profissional e detalhado para um agente de atendimento virtual da empresa "${input.businessName}".

${input.businessType ? `**Ramo de atividade:** ${input.businessType}` : ''}
${input.address ? `**Endereço:** ${input.address}` : ''}
${input.phone ? `**Telefone:** ${input.phone}` : ''}
${input.tone ? `**Tom de voz:** ${input.tone === 'professional' ? 'Profissional e técnico' : input.tone === 'friendly' ? 'Amigável e descontraído' : input.tone === 'casual' ? 'Casual e próximo' : 'Formal e respeitoso'}` : 'Profissional'}

${input.rules && input.rules.length > 0 ? `
**Regras específicas de resposta:**
${input.rules.map((r, idx) => `${idx + 1}. Se o cliente perguntar "${r.question}", você DEVE responder: "${r.answer}"`).join('\n')}
` : ''}

**Requisitos do prompt:**
1. Defina claramente a identidade do agente (nome, papel, propósito)
2. Estabeleça o tom de voz de forma consistente (${input.tone || 'profissional'})
3. Inclua informações relevantes da empresa quando apropriado
4. ${input.rules && input.rules.length > 0 ? 'Inclua TODAS as regras específicas listadas acima' : 'Seja objetivo e direto'}
5. Instrua o agente a ser prestativo, educado e eficiente
6. Mantenha respostas em português brasileiro
7. Seja claro sobre quando transferir para atendimento humano (se necessário)
8. O prompt deve ter entre 300-800 palavras

**IMPORTANTE:** Retorne APENAS o prompt de sistema final, sem explicações, sem markdown, sem comentários. Apenas o texto do prompt que será usado diretamente.`;

    // Chamar OpenAI
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      throw new TRPCError({ 
        code: 'INTERNAL_SERVER_ERROR', 
        message: 'OpenAI API key não configurada no servidor' 
      });
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o', // ou 'gpt-4o-mini' para economizar custos
          messages: [
            {
              role: 'system',
              content: 'Você é um especialista em criar prompts de sistema para agentes de IA. Retorne APENAS o prompt final, sem explicações, sem markdown, sem comentários. Apenas o texto puro do prompt.',
            },
            {
              role: 'user',
              content: systemPromptTemplate,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[OpenAI] Erro na API:', error);
        throw new Error(error.error?.message || `Erro HTTP ${response.status}`);
      }

      const data = await response.json();
      const generatedPrompt = data.choices[0].message.content.trim();

      // Salvar configurações no banco
      const companyInfo = JSON.stringify({
        name: input.businessName,
        type: input.businessType || '',
        address: input.address || '',
        phone: input.phone || '',
      });

      await db.updateAgentConfig(tenant.id, {
        systemPrompt: generatedPrompt,
        companyInfo: companyInfo,
        welcomeMessage: `Olá! Sou o assistente virtual da ${input.businessName}. Como posso ajudar você hoje?`,
      });

      await db.createPlatformLog({
        tenantId: tenant.id,
        eventType: 'config_updated',
        severity: 'info',
        message: 'Configuração do agente gerada via Assistente de IA',
      });

      return {
        systemPrompt: generatedPrompt,
        success: true,
        message: 'Configurações geradas e salvas com sucesso!',
      };
    } catch (error: any) {
      console.error('[OpenAI] Erro ao gerar prompt:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Erro ao gerar prompt: ${error.message}`,
      });
    }
  }),

