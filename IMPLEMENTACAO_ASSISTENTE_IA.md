# 🚀 Implementação: Assistente de IA para Configuração

## 📋 Resumo

Este guia mostra como implementar um assistente de IA que guia o usuário na configuração do agente através de perguntas, gerando automaticamente o `systemPrompt` e preenchendo os dados básicos.

---

## 🔧 PASSO 1: Adicionar Endpoint no Backend

### Localização

**Arquivo:** `server/routers.ts`  
**Router:** `clientPanel` (linha ~1264)

### Código a Adicionar

Adicione este endpoint dentro do router `clientPanel`:

```typescript
/**
 * Gera systemPrompt usando OpenAI baseado nas respostas do usuário
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
          model: 'gpt-4o', // Use 'gpt-4o-mini' para economizar
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
```

**Onde adicionar:** Dentro do router `clientPanel`, após o endpoint `getAgentConfig` (linha ~1747).

---

## 🔧 PASSO 2: Criar Componente do Assistente

### Arquivo: `client/src/components/AgentConfigAssistant.tsx`

Crie este arquivo com o código completo do componente (já está no guia `GUIA_ASSISTENTE_IA_CONFIGURACAO.md`).

---

## 🔧 PASSO 3: Integrar na Página de Configuração

### Arquivo: `client/src/pages/client/AgentConfigUnified.tsx`

**Adicione no início do componente:**

```typescript
import AgentConfigAssistant from '@/components/AgentConfigAssistant';
import { Sparkles } from 'lucide-react';

// Dentro do componente, adicione state:
const [showAssistant, setShowAssistant] = useState(false);
const [assistantComplete, setAssistantComplete] = useState(false);
```

**Adicione no JSX, ANTES do `<Tabs>`:**

```typescript
{/* Botão para iniciar assistente */}
{!assistantComplete && !config?.systemPrompt && (
  <Card className="mb-6 border-primary/20 bg-primary/5">
    <CardContent className="pt-6">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-2">
            Configure seu Agente com Assistente de IA
          </h3>
          <p className="text-muted-foreground mb-4">
            Responda algumas perguntas simples e nosso assistente criará um agente personalizado para você
          </p>
          <Button
            onClick={() => setShowAssistant(true)}
            size="lg"
            className="w-full sm:w-auto"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Começar Configuração Guiada
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
)}

{/* Assistente de IA */}
{showAssistant && !assistantComplete && (
  <div className="mb-6">
    <AgentConfigAssistant
      onComplete={() => {
        setShowAssistant(false);
        setAssistantComplete(true);
        utils.agent.getConfig.invalidate();
        toast.success('Configuração concluída! Você pode revisar e ajustar abaixo.');
      }}
    />
  </div>
)}

{/* Mostrar mensagem se já configurado */}
{config?.systemPrompt && !showAssistant && (
  <Alert className="mb-6">
    <CheckCircle2 className="h-4 w-4" />
    <AlertDescription>
      Seu agente já está configurado. Você pode editar as configurações abaixo ou usar o assistente novamente.
    </AlertDescription>
  </Alert>
)}
```

**Torne o systemPrompt somente leitura:**

```typescript
<Textarea
  id="systemPrompt"
  value={formData.systemPrompt}
  onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
  className="font-mono text-sm"
  rows={15}
  readOnly={!!config?.systemPrompt} // Somente leitura se já configurado
  placeholder="O prompt do sistema será gerado automaticamente pelo assistente de IA..."
/>
```

---

## 🔧 PASSO 4: Adicionar Variável de Ambiente

**Arquivo:** `.env` ou variáveis do EasyPanel

```env
OPENAI_API_KEY=sk-...
```

---

## ✅ Checklist de Implementação

- [ ] Adicionar endpoint `generateSystemPrompt` no router `clientPanel`
- [ ] Criar componente `AgentConfigAssistant.tsx`
- [ ] Integrar componente na página `AgentConfigUnified.tsx`
- [ ] Adicionar variável `OPENAI_API_KEY` no ambiente
- [ ] Tornar `systemPrompt` somente leitura após configuração
- [ ] Testar fluxo completo
- [ ] Verificar que as regras são salvas corretamente

---

## 🧪 Teste

1. Acesse a página de configuração
2. Clique em "Começar Configuração Guiada"
3. Responda as perguntas do assistente
4. Adicione algumas regras personalizadas
5. Revise e confirme
6. Verifique se o `systemPrompt` foi gerado e salvo
7. Verifique se os dados básicos foram preenchidos

---

**Pronto para implementar! 🚀**

