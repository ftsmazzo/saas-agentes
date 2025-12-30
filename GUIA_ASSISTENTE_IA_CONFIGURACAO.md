# 🤖 Guia: Assistente de IA para Configuração do Agente

## 📋 Objetivo

Criar um assistente de IA dentro da tela de configuração que guie o usuário através de perguntas, preenchendo automaticamente:
- **systemPrompt** (não editável diretamente pelo usuário)
- Dados básicos (nome, endereço, telefone)
- Tom de voz/personalidade
- Regras personalizadas (se perguntar X, responda Y)

---

## 🎯 Funcionalidades

### 1. **Chat Assistente**
- Interface de chat dentro da página
- Assistente faz perguntas guiadas
- Usuário responde de forma natural
- Assistente processa e preenche formulário

### 2. **Roteiro de Perguntas**
- Perguntas básicas sobre o negócio
- Informações da empresa
- Tom de voz desejado
- Regras específicas

### 3. **Geração Automática**
- **systemPrompt** gerado automaticamente (não editável)
- Dados básicos preenchidos
- Regras organizadas em formato estruturado

### 4. **Sistema de Regras**
- Adicionar regras: "Se perguntar X, responda Y"
- Editar regras existentes
- Excluir regras
- Visualizar todas as regras

---

## 🏗️ Arquitetura

### Componentes Necessários

1. **AgentConfigAssistant.tsx** - Componente principal do chat
2. **QuestionFlow.tsx** - Gerencia o fluxo de perguntas
3. **RulesManager.tsx** - Gerencia regras personalizadas
4. **OpenAIService.ts** - Integração com OpenAI API

### Estrutura de Dados

```typescript
interface AssistantState {
  step: 'welcome' | 'business-info' | 'tone' | 'rules' | 'review' | 'complete';
  answers: {
    businessName?: string;
    businessType?: string;
    address?: string;
    phone?: string;
    tone?: 'professional' | 'friendly' | 'casual' | 'formal';
    rules?: Array<{ question: string; answer: string }>;
  };
  generatedPrompt?: string;
}
```

---

## 📝 Roteiro de Perguntas

### Fase 1: Informações Básicas

1. **"Olá! Vou te ajudar a configurar seu agente de IA. Qual o nome da sua empresa?"**
   - Resposta → `businessName`

2. **"Qual o ramo de atividade da sua empresa? (ex: imobiliária, e-commerce, clínica)"**
   - Resposta → `businessType`

3. **"Qual o endereço da sua empresa?"**
   - Resposta → `address`

4. **"Qual o telefone de contato?"**
   - Resposta → `phone`

### Fase 2: Tom de Voz

5. **"Como você gostaria que seu agente se comunique?"**
   - Opções:
     - Profissional e técnico
     - Amigável e descontraído
     - Casual e próximo
     - Formal e respeitoso
   - Resposta → `tone`

### Fase 3: Regras Personalizadas

6. **"Existem perguntas específicas que você quer que o agente responda de forma particular?"**
   - Se sim, perguntar:
     - "Qual a pergunta?"
     - "Como deve responder?"
   - Adicionar à lista de regras

7. **"Deseja adicionar mais regras?"** (loop até dizer não)

### Fase 4: Revisão

8. **Mostrar resumo e perguntar se está tudo certo**
9. **Gerar systemPrompt final**
10. **Salvar configurações**

---

## 🔧 Implementação

### Passo 1: Criar Endpoint OpenAI no Backend

**Arquivo:** `server/routers.ts`

Adicione este endpoint:

```typescript
// No router clientPanel ou agent
generateSystemPrompt: protectedProcedure
  .input(z.object({
    businessName: z.string(),
    businessType: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    tone: z.enum(['professional', 'friendly', 'casual', 'formal']).optional(),
    rules: z.array(z.object({
      question: z.string(),
      answer: z.string(),
    })).optional(),
    companyInfo: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    const tenant = ctx.tenant;
    if (!tenant) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Cliente não encontrado' });
    }

    // Construir prompt para OpenAI
    const prompt = `Você é um especialista em criar prompts de sistema para agentes de IA.

Crie um prompt de sistema completo e profissional para um agente de atendimento virtual da empresa "${input.businessName}".

${input.businessType ? `Ramo de atividade: ${input.businessType}` : ''}
${input.address ? `Endereço: ${input.address}` : ''}
${input.phone ? `Telefone: ${input.phone}` : ''}
${input.tone ? `Tom de voz: ${input.tone}` : ''}

${input.rules && input.rules.length > 0 ? `
Regras específicas:
${input.rules.map(r => `- Se perguntarem "${r.question}", responda: "${r.answer}"`).join('\n')}
` : ''}

O prompt deve:
1. Definir a identidade do agente
2. Estabelecer o tom de voz (${input.tone || 'profissional'})
3. Incluir informações da empresa
4. Incluir as regras específicas
5. Ser claro, objetivo e profissional
6. Estar em português brasileiro

Retorne APENAS o prompt de sistema, sem explicações adicionais.`;

    // Chamar OpenAI
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      throw new TRPCError({ 
        code: 'INTERNAL_SERVER_ERROR', 
        message: 'OpenAI API key não configurada' 
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
          model: 'gpt-4o', // ou 'gpt-4o-mini' para economizar
          messages: [
            {
              role: 'system',
              content: 'Você é um especialista em criar prompts de sistema para agentes de IA. Retorne apenas o prompt, sem explicações.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Erro ao chamar OpenAI');
      }

      const data = await response.json();
      const generatedPrompt = data.choices[0].message.content.trim();

      // Salvar configurações
      const companyInfo = JSON.stringify({
        name: input.businessName,
        type: input.businessType,
        address: input.address,
        phone: input.phone,
      });

      await db.updateAgentConfig(tenant.id, {
        systemPrompt: generatedPrompt,
        companyInfo: companyInfo,
        welcomeMessage: input.rules?.find(r => r.question.toLowerCase().includes('saudação'))?.answer || 
          `Olá! Sou o assistente virtual da ${input.businessName}. Como posso ajudar?`,
      });

      return {
        systemPrompt: generatedPrompt,
        success: true,
      };
    } catch (error: any) {
      console.error('[OpenAI] Erro:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Erro ao gerar prompt: ${error.message}`,
      });
    }
  }),
```

---

### Passo 2: Criar Componente do Chat Assistente

**Arquivo:** `client/src/components/AgentConfigAssistant.tsx`

```typescript
import { useState, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Bot, Send, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
}

interface Rule {
  id: string;
  question: string;
  answer: string;
}

export default function AgentConfigAssistant({ onComplete }: { onComplete: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Olá! 👋 Vou te ajudar a configurar seu agente de IA. Vamos começar?',
      timestamp: new Date(),
    },
  ]);
  const [currentStep, setCurrentStep] = useState<'welcome' | 'business-info' | 'tone' | 'rules' | 'review'>('welcome');
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [answers, setAnswers] = useState({
    businessName: '',
    businessType: '',
    address: '',
    phone: '',
    tone: '' as 'professional' | 'friendly' | 'casual' | 'formal' | '',
    rules: [] as Rule[],
  });
  const [currentRule, setCurrentRule] = useState({ question: '', answer: '' });
  const [showRuleForm, setShowRuleForm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const generatePromptMutation = trpc.clientPanel.generateSystemPrompt.useMutation({
    onSuccess: (data) => {
      addMessage('assistant', 'Perfeito! ✅ Seu agente foi configurado com sucesso!');
      toast.success('Configurações salvas!');
      setTimeout(() => {
        onComplete();
      }, 2000);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
      setIsProcessing(false);
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (role: 'assistant' | 'user', content: string) => {
    setMessages((prev) => [...prev, { role, content, timestamp: new Date() }]);
  };

  const handleNextStep = () => {
    switch (currentStep) {
      case 'welcome':
        setCurrentStep('business-info');
        addMessage('assistant', 'Ótimo! Vamos começar. Qual o nome da sua empresa?');
        break;
      case 'business-info':
        if (!answers.businessName) {
          toast.error('Por favor, informe o nome da empresa');
          return;
        }
        setCurrentStep('tone');
        addMessage('assistant', `Entendi! ${answers.businessName}. Agora, qual o ramo de atividade? (ex: imobiliária, e-commerce, clínica)`);
        break;
      case 'tone':
        if (!answers.tone) {
          toast.error('Por favor, selecione um tom de voz');
          return;
        }
        setCurrentStep('rules');
        addMessage('assistant', 'Perfeito! Agora, existem perguntas específicas que você quer que o agente responda de forma particular? (responda "sim" ou "não")');
        break;
      case 'rules':
        // Continuar para revisão
        setCurrentStep('review');
        showReview();
        break;
    }
  };

  const handleUserMessage = (message: string) => {
    addMessage('user', message);
    setUserInput('');

    // Processar resposta baseado no step atual
    switch (currentStep) {
      case 'business-info':
        if (!answers.businessName) {
          setAnswers((prev) => ({ ...prev, businessName: message }));
          addMessage('assistant', `Ótimo! ${message}. Qual o endereço da sua empresa?`);
        } else if (!answers.address) {
          setAnswers((prev) => ({ ...prev, address: message }));
          addMessage('assistant', 'E qual o telefone de contato?');
        } else if (!answers.phone) {
          setAnswers((prev) => ({ ...prev, phone: message }));
          addMessage('assistant', 'Perfeito! Agora, como você gostaria que seu agente se comunique?');
          addMessage('assistant', '1. Profissional e técnico\n2. Amigável e descontraído\n3. Casual e próximo\n4. Formal e respeitoso\n\nDigite o número da opção:');
        }
        break;

      case 'tone':
        const toneMap: Record<string, 'professional' | 'friendly' | 'casual' | 'formal'> = {
          '1': 'professional',
          '2': 'friendly',
          '3': 'casual',
          '4': 'formal',
        };
        const selectedTone = toneMap[message.trim()];
        if (selectedTone) {
          setAnswers((prev) => ({ ...prev, tone: selectedTone }));
          addMessage('assistant', `Tom ${selectedTone === 'professional' ? 'profissional' : selectedTone === 'friendly' ? 'amigável' : selectedTone === 'casual' ? 'casual' : 'formal'} selecionado!`);
          handleNextStep();
        } else {
          addMessage('assistant', 'Por favor, digite um número de 1 a 4:');
        }
        break;

      case 'rules':
        if (message.toLowerCase().includes('sim') || message.toLowerCase().includes('s')) {
          setShowRuleForm(true);
          addMessage('assistant', 'Perfeito! Qual a pergunta que você quer configurar?');
        } else {
          handleNextStep();
        }
        break;
    }
  };

  const handleAddRule = () => {
    if (!currentRule.question || !currentRule.answer) {
      toast.error('Preencha pergunta e resposta');
      return;
    }

    const newRule: Rule = {
      id: Date.now().toString(),
      question: currentRule.question,
      answer: currentRule.answer,
    };

    setAnswers((prev) => ({
      ...prev,
      rules: [...prev.rules, newRule],
    }));

    addMessage('assistant', `Regra adicionada! "Se perguntarem: ${currentRule.question}, responda: ${currentRule.answer}"`);
    addMessage('assistant', 'Deseja adicionar mais regras? (sim/não)');

    setCurrentRule({ question: '', answer: '' });
    setShowRuleForm(false);
  };

  const showReview = () => {
    addMessage('assistant', '📋 Vamos revisar suas configurações:\n\n');
    addMessage('assistant', `**Empresa:** ${answers.businessName}`);
    if (answers.businessType) addMessage('assistant', `**Ramo:** ${answers.businessType}`);
    if (answers.address) addMessage('assistant', `**Endereço:** ${answers.address}`);
    if (answers.phone) addMessage('assistant', `**Telefone:** ${answers.phone}`);
    addMessage('assistant', `**Tom de voz:** ${answers.tone}`);
    if (answers.rules.length > 0) {
      addMessage('assistant', `**Regras personalizadas:** ${answers.rules.length} regra(s)`);
    }
    addMessage('assistant', '\nTudo certo? Vou gerar o prompt do sistema agora! 🚀');
  };

  const handleGenerate = () => {
    setIsProcessing(true);
    generatePromptMutation.mutate({
      businessName: answers.businessName,
      businessType: answers.businessType,
      address: answers.address,
      phone: answers.phone,
      tone: answers.tone || 'professional',
      rules: answers.rules.map((r) => ({ question: r.question, answer: r.answer })),
    });
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Assistente de Configuração
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Chat Messages */}
        <div className="h-96 overflow-y-auto border rounded-lg p-4 mb-4 space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex gap-2 justify-start">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-sm">Gerando configurações...</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Rule Form */}
        {showRuleForm && (
          <div className="mb-4 p-4 border rounded-lg bg-muted/50">
            <h4 className="font-semibold mb-2">Adicionar Regra Personalizada</h4>
            <div className="space-y-2">
              <Input
                placeholder="Pergunta (ex: Qual o horário de funcionamento?)"
                value={currentRule.question}
                onChange={(e) => setCurrentRule((prev) => ({ ...prev, question: e.target.value }))}
              />
              <Textarea
                placeholder="Resposta (ex: Funcionamos de segunda a sexta, das 9h às 18h)"
                value={currentRule.answer}
                onChange={(e) => setCurrentRule((prev) => ({ ...prev, answer: e.target.value }))}
              />
              <div className="flex gap-2">
                <Button onClick={handleAddRule} size="sm">
                  Adicionar Regra
                </Button>
                <Button
                  onClick={() => {
                    setShowRuleForm(false);
                    handleNextStep();
                  }}
                  variant="outline"
                  size="sm"
                >
                  Pular
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Rules List */}
        {answers.rules.length > 0 && (
          <div className="mb-4 p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Regras Adicionadas ({answers.rules.length})</h4>
            <div className="space-y-2">
              {answers.rules.map((rule) => (
                <div key={rule.id} className="flex justify-between items-start p-2 bg-background rounded border">
                  <div className="flex-1">
                    <p className="text-sm font-medium">Q: {rule.question}</p>
                    <p className="text-sm text-muted-foreground">R: {rule.answer}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAnswers((prev) => ({
                        ...prev,
                        rules: prev.rules.filter((r) => r.id !== rule.id),
                      }));
                    }}
                  >
                    Remover
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        {currentStep !== 'review' && (
          <div className="flex gap-2">
            <Input
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (userInput.trim()) {
                    handleUserMessage(userInput);
                  }
                }
              }}
              placeholder="Digite sua resposta..."
              disabled={isProcessing}
            />
            <Button
              onClick={() => {
                if (userInput.trim()) {
                  handleUserMessage(userInput);
                }
              }}
              disabled={isProcessing || !userInput.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Generate Button */}
        {currentStep === 'review' && (
          <Button
            onClick={handleGenerate}
            disabled={isProcessing}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar e Salvar Configurações
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
```

---

### Passo 3: Integrar na Página de Configuração

**Arquivo:** `client/src/pages/client/AgentConfigUnified.tsx`

Adicione o componente no início da página:

```typescript
import AgentConfigAssistant from '@/components/AgentConfigAssistant';

// No componente:
const [showAssistant, setShowAssistant] = useState(false);
const [assistantComplete, setAssistantComplete] = useState(false);

// No JSX, adicione antes do formulário:
{!assistantComplete && (
  <div className="mb-6">
    <Button
      onClick={() => setShowAssistant(true)}
      className="w-full"
      size="lg"
    >
      <Sparkles className="h-4 w-4 mr-2" />
      Configurar com Assistente de IA
    </Button>
  </div>
)}

{showAssistant && !assistantComplete && (
  <AgentConfigAssistant
    onComplete={() => {
      setShowAssistant(false);
      setAssistantComplete(true);
      // Recarregar dados
      utils.agent.getConfig.invalidate();
    }}
  />
)}
```

---

## 🔐 Variável de Ambiente

Adicione no `.env`:

```env
OPENAI_API_KEY=sk-...
```

---

## ✅ Próximos Passos

1. Criar endpoint no backend
2. Criar componente do chat
3. Integrar na página de configuração
4. Testar fluxo completo
5. Adicionar mais perguntas ao roteiro (opcional)

---

**Pronto para implementar! 🚀**

