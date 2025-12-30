import { useState, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Bot, Send, Loader2, Sparkles, X } from 'lucide-react';
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

interface AssistantState {
  step: 'welcome' | 'business-name' | 'business-type' | 'address' | 'phone' | 'tone' | 'rules' | 'review' | 'complete';
  answers: {
    businessName: string;
    businessType: string;
    address: string;
    phone: string;
    tone: 'professional' | 'friendly' | 'casual' | 'formal' | '';
    rules: Rule[];
  };
}

export default function AgentConfigAssistant({ onComplete }: { onComplete: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Olá! 👋 Vou te ajudar a configurar seu agente de IA. Vamos começar?',
      timestamp: new Date(),
    },
  ]);
  const [state, setState] = useState<AssistantState>({
    step: 'welcome',
    answers: {
      businessName: '',
      businessType: '',
      address: '',
      phone: '',
      tone: '',
      rules: [],
    },
  });
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [currentRule, setCurrentRule] = useState({ question: '', answer: '' });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const generatePromptMutation = trpc.clientPanel.generateSystemPrompt.useMutation({
    onSuccess: (data) => {
      addMessage('assistant', '✅ Perfeito! Seu agente foi configurado com sucesso!');
      setState((prev) => ({ ...prev, step: 'complete' }));
      toast.success('Agente configurado! Agora você pode conectar o WhatsApp e ativar o agente.');
      setTimeout(() => {
        onComplete();
      }, 2000);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
      setIsProcessing(false);
      addMessage('assistant', `Ops, ocorreu um erro: ${error.message}. Tente novamente.`);
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
    switch (state.step) {
      case 'welcome':
        setState((prev) => ({ ...prev, step: 'business-name' }));
        addMessage('assistant', 'Ótimo! Vamos começar. Qual o nome da sua empresa?');
        break;
      case 'business-name':
        if (!state.answers.businessName) {
          toast.error('Por favor, informe o nome da empresa');
          return;
        }
        setState((prev) => ({ ...prev, step: 'business-type' }));
        addMessage('assistant', `Entendi! ${state.answers.businessName}. Qual o ramo de atividade? (ex: imobiliária, e-commerce, clínica, restaurante)`);
        break;
      case 'business-type':
        setState((prev) => ({ ...prev, step: 'address' }));
        addMessage('assistant', 'Perfeito! Qual o endereço da sua empresa?');
        break;
      case 'address':
        setState((prev) => ({ ...prev, step: 'phone' }));
        addMessage('assistant', 'E qual o telefone de contato?');
        break;
      case 'phone':
        setState((prev) => ({ ...prev, step: 'tone' }));
        addMessage('assistant', 'Ótimo! Agora, como você gostaria que seu agente se comunique?');
        addMessage('assistant', '1. Profissional e técnico\n2. Amigável e descontraído\n3. Casual e próximo\n4. Formal e respeitoso\n\nDigite o número da opção (1-4):');
        break;
      case 'tone':
        if (!state.answers.tone) {
          toast.error('Por favor, selecione um tom de voz');
          return;
        }
        setState((prev) => ({ ...prev, step: 'rules' }));
        addMessage('assistant', 'Perfeito! Agora, existem perguntas específicas que você quer que o agente responda de forma particular?');
        addMessage('assistant', 'Por exemplo: "Se perguntarem sobre horário de funcionamento, responda: Funcionamos de segunda a sexta, das 9h às 18h"');
        addMessage('assistant', 'Deseja adicionar regras personalizadas? (responda "sim" ou "não")');
        break;
      case 'rules':
        setState((prev) => ({ ...prev, step: 'review' }));
        showReview();
        break;
    }
  };

  const handleUserMessage = (message: string) => {
    if (!message.trim()) return;

    addMessage('user', message);
    const trimmedMessage = message.trim();
    setUserInput('');

    // Processar resposta baseado no step atual
    switch (state.step) {
      case 'welcome':
        if (trimmedMessage.toLowerCase().includes('sim') || trimmedMessage.toLowerCase().includes('s') || trimmedMessage.toLowerCase().includes('vamos') || trimmedMessage.toLowerCase() === 'ok') {
          handleNextStep();
        } else {
          addMessage('assistant', 'Tudo bem! Quando estiver pronto, digite "sim" ou "ok" para começar.');
        }
        break;

      case 'business-name':
        if (trimmedMessage.length < 2) {
          addMessage('assistant', 'Por favor, informe um nome válido para sua empresa:');
          return;
        }
        setState((prev) => ({
          ...prev,
          answers: { ...prev.answers, businessName: trimmedMessage },
          step: 'business-type',
        }));
        addMessage('assistant', `Entendi! ${trimmedMessage}. Qual o ramo de atividade? (ex: imobiliária, e-commerce, clínica, restaurante)`);
        break;

      case 'business-type':
        setState((prev) => ({
          ...prev,
          answers: { ...prev.answers, businessType: trimmedMessage },
          step: 'address',
        }));
        addMessage('assistant', 'Perfeito! Qual o endereço da sua empresa?');
        break;

      case 'address':
        setState((prev) => ({
          ...prev,
          answers: { ...prev.answers, address: trimmedMessage },
          step: 'phone',
        }));
        addMessage('assistant', 'E qual o telefone de contato?');
        break;

      case 'phone':
        setState((prev) => ({
          ...prev,
          answers: { ...prev.answers, phone: trimmedMessage },
          step: 'tone',
        }));
        addMessage('assistant', 'Ótimo! Agora, como você gostaria que seu agente se comunique?');
        addMessage('assistant', '1. Profissional e técnico\n2. Amigável e descontraído\n3. Casual e próximo\n4. Formal e respeitoso\n\nDigite o número da opção (1-4):');
        break;

      case 'tone':
        const toneMap: Record<string, 'professional' | 'friendly' | 'casual' | 'formal'> = {
          '1': 'professional',
          '2': 'friendly',
          '3': 'casual',
          '4': 'formal',
          'professional': 'professional',
          'friendly': 'friendly',
          'casual': 'casual',
          'formal': 'formal',
          'profissional': 'professional',
          'amigável': 'friendly',
          'amigavel': 'friendly',
          'casual': 'casual',
          'formal': 'formal',
        };
        const selectedTone = toneMap[trimmedMessage.toLowerCase()] || toneMap[trimmedMessage];
        if (selectedTone) {
          setState((prev) => ({
            ...prev,
            answers: { ...prev.answers, tone: selectedTone },
            step: 'rules',
          }));
          const toneNames = {
            professional: 'profissional e técnico',
            friendly: 'amigável e descontraído',
            casual: 'casual e próximo',
            formal: 'formal e respeitoso',
          };
          addMessage('assistant', `Tom ${toneNames[selectedTone]} selecionado!`);
          addMessage('assistant', 'Perfeito! Agora, existem perguntas específicas que você quer que o agente responda de forma particular?');
          addMessage('assistant', 'Por exemplo: "Se perguntarem sobre horário de funcionamento, responda: Funcionamos de segunda a sexta, das 9h às 18h"');
          addMessage('assistant', 'Deseja adicionar regras personalizadas? (responda "sim" ou "não")');
        } else {
          addMessage('assistant', 'Por favor, digite um número de 1 a 4:');
        }
        break;

      case 'rules':
        if (trimmedMessage.toLowerCase().includes('sim') || trimmedMessage.toLowerCase().includes('s')) {
          setShowRuleForm(true);
          addMessage('assistant', 'Perfeito! Qual a pergunta que você quer configurar?');
        } else if (trimmedMessage.toLowerCase().includes('não') || trimmedMessage.toLowerCase().includes('nao') || trimmedMessage.toLowerCase().includes('n')) {
          handleNextStep();
        } else {
          addMessage('assistant', 'Por favor, responda "sim" ou "não":');
        }
        break;
    }
  };

  const handleAddRule = () => {
    if (!currentRule.question.trim() || !currentRule.answer.trim()) {
      toast.error('Preencha pergunta e resposta');
      return;
    }

    const newRule: Rule = {
      id: Date.now().toString(),
      question: currentRule.question.trim(),
      answer: currentRule.answer.trim(),
    };

    setState((prev) => ({
      ...prev,
      answers: {
        ...prev.answers,
        rules: [...prev.answers.rules, newRule],
      },
    }));

    addMessage('assistant', `✅ Regra adicionada!\n\n**Pergunta:** ${currentRule.question}\n**Resposta:** ${currentRule.answer}`);
    addMessage('assistant', 'Deseja adicionar mais regras? (sim/não)');

    setCurrentRule({ question: '', answer: '' });
    setShowRuleForm(false);
  };

  const handleSkipRule = () => {
    setShowRuleForm(false);
    addMessage('assistant', 'Sem problemas! Você pode adicionar regras depois nas configurações.');
    handleNextStep();
  };

  const showReview = () => {
    addMessage('assistant', '📋 Vamos revisar suas configurações:\n\n');
    addMessage('assistant', `**Empresa:** ${state.answers.businessName}`);
    if (state.answers.businessType) {
      addMessage('assistant', `**Ramo:** ${state.answers.businessType}`);
    }
    if (state.answers.address) {
      addMessage('assistant', `**Endereço:** ${state.answers.address}`);
    }
    if (state.answers.phone) {
      addMessage('assistant', `**Telefone:** ${state.answers.phone}`);
    }
    const toneNames = {
      professional: 'Profissional e técnico',
      friendly: 'Amigável e descontraído',
      casual: 'Casual e próximo',
      formal: 'Formal e respeitoso',
    };
    addMessage('assistant', `**Tom de voz:** ${toneNames[state.answers.tone as keyof typeof toneNames] || state.answers.tone}`);
    if (state.answers.rules.length > 0) {
      addMessage('assistant', `**Regras personalizadas:** ${state.answers.rules.length} regra(s) configurada(s)`);
    }
    addMessage('assistant', '\n✅ Tudo certo? Vou gerar o prompt do sistema agora! 🚀');
  };

  const handleGenerate = () => {
    setIsProcessing(true);
    generatePromptMutation.mutate({
      businessName: state.answers.businessName,
      businessType: state.answers.businessType || undefined,
      address: state.answers.address || undefined,
      phone: state.answers.phone || undefined,
      tone: state.answers.tone || 'professional',
      rules: state.answers.rules.map((r) => ({ question: r.question, answer: r.answer })),
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Assistente de Configuração
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Chat Messages */}
        <div className="h-96 overflow-y-auto border rounded-lg p-4 mb-4 space-y-4 bg-muted/30">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background border'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex gap-2 justify-start">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
              </div>
              <div className="bg-background border rounded-lg p-3">
                <p className="text-sm">Gerando configurações com IA...</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Rule Form */}
        {showRuleForm && (
          <div className="mb-4 p-4 border rounded-lg bg-muted/50">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold">Adicionar Regra Personalizada</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkipRule}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
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
                rows={3}
              />
              <div className="flex gap-2">
                <Button onClick={handleAddRule} size="sm">
                  Adicionar Regra
                </Button>
                <Button onClick={handleSkipRule} variant="outline" size="sm">
                  Pular
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Rules List */}
        {state.answers.rules.length > 0 && (
          <div className="mb-4 p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Regras Adicionadas ({state.answers.rules.length})</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {state.answers.rules.map((rule) => (
                <div key={rule.id} className="flex justify-between items-start p-2 bg-background rounded border text-sm">
                  <div className="flex-1">
                    <p className="font-medium">Q: {rule.question}</p>
                    <p className="text-muted-foreground">R: {rule.answer}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setState((prev) => ({
                        ...prev,
                        answers: {
                          ...prev.answers,
                          rules: prev.answers.rules.filter((r) => r.id !== rule.id),
                        },
                      }));
                      toast.success('Regra removida');
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        {state.step !== 'review' && state.step !== 'complete' && (
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
        {state.step === 'review' && (
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

