import { useState, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Bot, Send, Loader2, Sparkles, X, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface Message {
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
}

interface AssistantState {
  step: 'welcome' | 'business-name' | 'business-type' | 'address-street' | 'address-neighborhood' | 'address-city' | 'address-state' | 'address-zip' | 'service-area' | 'phone' | 'business-hours' | 'payment-methods' | 'personality' | 'additional-info' | 'review' | 'complete';
  answers: {
    businessName: string;
    businessType: string;
    street: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    serviceArea: 'city' | 'state' | 'country' | '';
    phone: string;
    businessHours: string;
    paymentMethods: string[];
    personality: 'professional' | 'friendly' | 'casual' | 'formal' | 'consultative' | 'empathetic' | 'energetic' | 'calm' | '';
    additionalInfo: string;
  };
}

const PERSONALITY_OPTIONS = [
  { value: 'professional', label: 'Profissional', description: 'Técnico, objetivo e eficiente' },
  { value: 'friendly', label: 'Amigável', description: 'Descontraído, acolhedor e caloroso' },
  { value: 'casual', label: 'Casual', description: 'Próximo, informal mas respeitoso' },
  { value: 'formal', label: 'Formal', description: 'Respeitoso, cerimonioso e distante' },
  { value: 'consultative', label: 'Consultivo', description: 'Analítico, orientador e consultivo' },
  { value: 'empathetic', label: 'Empático', description: 'Compreensivo, acolhedor e sensível' },
  { value: 'energetic', label: 'Energético', description: 'Entusiasmado, motivador e dinâmico' },
  { value: 'calm', label: 'Calmo', description: 'Sereno, paciente e tranquilo' },
];

const PAYMENT_METHODS = [
  'Dinheiro',
  'Cartão de Crédito',
  'Cartão de Débito',
  'PIX',
  'Boleto',
  'Transferência Bancária',
  'Cheque',
  'Cartão de Vale Alimentação',
  'Cartão de Vale Refeição',
];

export default function AgentConfigAssistant({ 
  onComplete,
  existingConfig 
}: { 
  onComplete: () => void;
  existingConfig?: any;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [state, setState] = useState<AssistantState>({
    step: 'welcome',
    answers: {
      businessName: existingConfig?.companyInfo ? JSON.parse(existingConfig.companyInfo).name || '' : '',
      businessType: existingConfig?.companyInfo ? JSON.parse(existingConfig.companyInfo).type || '' : '',
      street: existingConfig?.companyInfo ? JSON.parse(existingConfig.companyInfo).street || '' : '',
      neighborhood: existingConfig?.companyInfo ? JSON.parse(existingConfig.companyInfo).neighborhood || '' : '',
      city: existingConfig?.companyInfo ? JSON.parse(existingConfig.companyInfo).city || '' : '',
      state: existingConfig?.companyInfo ? JSON.parse(existingConfig.companyInfo).state || '' : '',
      zipCode: existingConfig?.companyInfo ? JSON.parse(existingConfig.companyInfo).zipCode || '' : '',
      serviceArea: existingConfig?.companyInfo ? JSON.parse(existingConfig.companyInfo).serviceArea || '' : '',
      phone: existingConfig?.companyInfo ? JSON.parse(existingConfig.companyInfo).phone || '' : '',
      businessHours: existingConfig?.companyInfo ? JSON.parse(existingConfig.companyInfo).businessHours || '' : '',
      paymentMethods: existingConfig?.companyInfo ? JSON.parse(existingConfig.companyInfo).paymentMethods || [] : [],
      personality: existingConfig?.companyInfo ? JSON.parse(existingConfig.companyInfo).personality || '' : '',
      additionalInfo: existingConfig?.companyInfo ? JSON.parse(existingConfig.companyInfo).additionalInfo || '' : '',
    },
  });
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentSelection, setShowPaymentSelection] = useState(false);
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

  // Inicializar mensagem de boas-vindas
  useEffect(() => {
    if (messages.length === 0) {
      if (existingConfig?.systemPrompt) {
        addMessage('assistant', `Olá! 👋 Vejo que você já tem um agente configurado.`);
        addMessage('assistant', 'Posso ajudar você a atualizar as configurações. Vou carregar os dados atuais e você pode me dizer o que quer alterar.');
        addMessage('assistant', 'Vamos revisar tudo passo a passo. Está pronto? 😊');
        // Pular direto para revisão se já tem config
        setTimeout(() => {
          setState(prev => ({ ...prev, step: 'review' }));
          showReview();
        }, 2000);
      } else {
        addMessage('assistant', 'Olá! 👋 Que bom ter você aqui!');
        addMessage('assistant', 'Vou te ajudar a criar seu agente de IA de forma personalizada. Vamos fazer isso juntos, passo a passo, de forma bem natural.');
        addMessage('assistant', 'Está pronto para começar? 😊');
      }
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (role: 'assistant' | 'user', content: string) => {
    setMessages((prev) => [...prev, { role, content, timestamp: new Date() }]);
  };

  const formatPhone = (phone: string): string => {
    // Remove tudo que não é número
    const numbers = phone.replace(/\D/g, '');
    
    // Se já começa com 55, mantém
    if (numbers.startsWith('55')) {
      return numbers;
    }
    
    // Se tem 10 ou 11 dígitos (DDD + número), adiciona 55
    if (numbers.length >= 10 && numbers.length <= 11) {
      return `55${numbers}`;
    }
    
    return numbers;
  };

  const handleUserMessage = (message: string) => {
    if (!message.trim()) return;

    addMessage('user', message);
    const trimmedMessage = message.trim().toLowerCase();
    setUserInput('');

    switch (state.step) {
      case 'welcome':
        if (trimmedMessage.includes('sim') || trimmedMessage.includes('s') || trimmedMessage.includes('vamos') || trimmedMessage === 'ok' || trimmedMessage.includes('pronto')) {
          // Se já tem config, ir direto para revisão
          if (existingConfig?.systemPrompt) {
            setState((prev) => ({ ...prev, step: 'review' }));
            showReview();
          } else {
            setState((prev) => ({ ...prev, step: 'business-name' }));
            addMessage('assistant', 'Ótimo! Vamos começar! 🚀');
            addMessage('assistant', 'Primeiro, qual o nome da sua empresa ou negócio?');
          }
        } else {
          addMessage('assistant', 'Sem pressa! Quando estiver pronto, digite "sim" ou "ok" para começar. 😊');
        }
        break;

      case 'business-name':
        if (trimmedMessage.length < 2) {
          addMessage('assistant', 'Por favor, me diga o nome da sua empresa ou negócio:');
          return;
        }
        setState((prev) => ({
          ...prev,
          answers: { ...prev.answers, businessName: message.trim() },
          step: 'business-type',
        }));
        addMessage('assistant', `Perfeito! ${message.trim()}. Que legal! 😊`);
        addMessage('assistant', 'Agora me conta: qual o ramo de atividade da sua empresa?');
        addMessage('assistant', 'Por exemplo: imobiliária, e-commerce, clínica médica, restaurante, loja física, serviços, etc.');
        break;

      case 'business-type':
        setState((prev) => ({
          ...prev,
          answers: { ...prev.answers, businessType: message.trim() },
          step: 'address-street',
        }));
        addMessage('assistant', `Entendi! ${message.trim()}. Ótimo! 👍`);
        addMessage('assistant', 'Agora vamos falar sobre o endereço. Qual a rua ou avenida da sua empresa?');
        break;

      case 'address-street':
        setState((prev) => ({
          ...prev,
          answers: { ...prev.answers, street: message.trim() },
          step: 'address-neighborhood',
        }));
        addMessage('assistant', 'Ótimo! E qual o bairro?');
        break;

      case 'address-neighborhood':
        setState((prev) => ({
          ...prev,
          answers: { ...prev.answers, neighborhood: message.trim() },
          step: 'address-city',
        }));
        addMessage('assistant', 'Perfeito! Qual a cidade?');
        break;

      case 'address-city':
        setState((prev) => ({
          ...prev,
          answers: { ...prev.answers, city: message.trim() },
          step: 'address-state',
        }));
        addMessage('assistant', 'E qual o estado? (ex: São Paulo, Rio de Janeiro, Minas Gerais)');
        break;

      case 'address-state':
        setState((prev) => ({
          ...prev,
          answers: { ...prev.answers, state: message.trim() },
          step: 'address-zip',
        }));
        addMessage('assistant', 'E o CEP? (pode ser com ou sem hífen)');
        break;

      case 'address-zip':
        const zipCode = message.trim().replace(/\D/g, '');
        setState((prev) => ({
          ...prev,
          answers: { ...prev.answers, zipCode },
          step: 'service-area',
        }));
        addMessage('assistant', 'Perfeito! Agora me conta: sua empresa atende apenas na sua cidade, em todo o estado ou em todo o Brasil?');
        addMessage('assistant', 'Digite: "cidade", "estado" ou "brasil"');
        break;

      case 'service-area':
        let serviceArea: 'city' | 'state' | 'country' | '' = '';
        if (trimmedMessage.includes('cidade') || trimmedMessage.includes('local')) {
          serviceArea = 'city';
        } else if (trimmedMessage.includes('estado') || trimmedMessage.includes('estadual')) {
          serviceArea = 'state';
        } else if (trimmedMessage.includes('brasil') || trimmedMessage.includes('nacional') || trimmedMessage.includes('todo')) {
          serviceArea = 'country';
        }
        
        if (serviceArea) {
          setState((prev) => ({
            ...prev,
            answers: { ...prev.answers, serviceArea },
            step: 'phone',
          }));
          const areaText = serviceArea === 'city' ? 'sua cidade' : serviceArea === 'state' ? 'todo o estado' : 'todo o Brasil';
          addMessage('assistant', `Ótimo! Atendimento em ${areaText}. 👍`);
          addMessage('assistant', 'Agora preciso do telefone de contato. Por favor, informe com DDD.');
          addMessage('assistant', 'Exemplo: (11) 98765-4321 ou 11987654321');
          addMessage('assistant', '💡 Dica: Vou formatar automaticamente com código do país (55) se necessário.');
        } else {
          addMessage('assistant', 'Por favor, digite "cidade", "estado" ou "brasil":');
        }
        break;

      case 'phone':
        const formattedPhone = formatPhone(message.trim());
        setState((prev) => ({
          ...prev,
          answers: { ...prev.answers, phone: formattedPhone },
          step: 'business-hours',
        }));
        addMessage('assistant', `Telefone registrado: ${formattedPhone}. ✅`);
        addMessage('assistant', 'Qual o horário de funcionamento da sua empresa?');
        addMessage('assistant', 'Exemplo: "Segunda a sexta, das 9h às 18h" ou "Todos os dias, das 8h às 20h"');
        break;

      case 'business-hours':
        setState((prev) => ({
          ...prev,
          answers: { ...prev.answers, businessHours: message.trim() },
          step: 'payment-methods',
        }));
        addMessage('assistant', 'Perfeito! Agora sobre formas de pagamento:');
        addMessage('assistant', 'Quais formas de pagamento sua empresa aceita?');
        addMessage('assistant', 'Você pode escolher várias opções. Digite os números separados por vírgula (ex: 1, 3, 5):');
        addMessage('assistant', PAYMENT_METHODS.map((method, idx) => `${idx + 1}. ${method}`).join('\n'));
        setShowPaymentSelection(true);
        break;

      case 'payment-methods':
        const selectedIndices = trimmedMessage.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= PAYMENT_METHODS.length);
        if (selectedIndices.length > 0) {
          const selectedMethods = selectedIndices.map(idx => PAYMENT_METHODS[idx - 1]);
          setState((prev) => ({
            ...prev,
            answers: { ...prev.answers, paymentMethods: selectedMethods },
            step: 'personality',
          }));
          setShowPaymentSelection(false);
          addMessage('assistant', `Ótimo! Formas de pagamento: ${selectedMethods.join(', ')}. ✅`);
          addMessage('assistant', 'Agora vamos definir a personalidade do seu agente!');
          addMessage('assistant', 'Como você quer que ele se comunique com seus clientes?');
          addMessage('assistant', 'Escolha uma opção (digite o número):');
          addMessage('assistant', PERSONALITY_OPTIONS.map((opt, idx) => `${idx + 1}. ${opt.label} - ${opt.description}`).join('\n'));
        } else {
          addMessage('assistant', 'Por favor, escolha pelo menos uma forma de pagamento. Digite os números separados por vírgula:');
        }
        break;

      case 'personality':
        const personalityIndex = parseInt(trimmedMessage);
        if (personalityIndex >= 1 && personalityIndex <= PERSONALITY_OPTIONS.length) {
          const selectedPersonality = PERSONALITY_OPTIONS[personalityIndex - 1].value as any;
          setState((prev) => ({
            ...prev,
            answers: { ...prev.answers, personality: selectedPersonality },
            step: 'additional-info',
          }));
          addMessage('assistant', `Perfeito! Personalidade "${PERSONALITY_OPTIONS[personalityIndex - 1].label}" selecionada. 😊`);
          addMessage('assistant', 'Tem alguma informação adicional que você gostaria que eu soubesse sobre sua empresa?');
          addMessage('assistant', 'Por exemplo: produtos especiais, diferenciais, valores, missão, etc.');
          addMessage('assistant', '(Se não tiver nada adicional, digite "não" ou "pular")');
        } else {
          addMessage('assistant', 'Por favor, escolha um número de 1 a 8:');
        }
        break;

      case 'additional-info':
        if (trimmedMessage.includes('não') || trimmedMessage.includes('nao') || trimmedMessage.includes('pular') || trimmedMessage.includes('n')) {
          setState((prev) => ({
            ...prev,
            answers: { ...prev.answers, additionalInfo: '' },
            step: 'review',
          }));
          showReview();
        } else {
          setState((prev) => ({
            ...prev,
            answers: { ...prev.answers, additionalInfo: message.trim() },
            step: 'review',
          }));
          addMessage('assistant', 'Ótimo! Informação registrada. ✅');
          showReview();
        }
        break;
    }
  };

  const showReview = () => {
    const hasData = state.answers.businessName || existingConfig?.systemPrompt;
    
    if (hasData) {
      addMessage('assistant', '📋 Vamos revisar suas configurações:\n\n');
      
      if (state.answers.businessName) {
        addMessage('assistant', `**Empresa:** ${state.answers.businessName}`);
      }
      if (state.answers.businessType) {
        addMessage('assistant', `**Ramo:** ${state.answers.businessType}`);
      }
      if (state.answers.street || state.answers.city) {
        const addressParts = [];
        if (state.answers.street) addressParts.push(state.answers.street);
        if (state.answers.neighborhood) addressParts.push(state.answers.neighborhood);
        if (state.answers.city) addressParts.push(state.answers.city);
        if (state.answers.state) addressParts.push(state.answers.state);
        if (state.answers.zipCode) addressParts.push(`CEP: ${state.answers.zipCode}`);
        if (addressParts.length > 0) {
          addMessage('assistant', `**Endereço:** ${addressParts.join(', ')}`);
        }
      }
      if (state.answers.serviceArea) {
        const areaText = state.answers.serviceArea === 'city' ? 'Apenas na cidade' : state.answers.serviceArea === 'state' ? 'Todo o estado' : 'Todo o Brasil';
        addMessage('assistant', `**Área de atendimento:** ${areaText}`);
      }
      if (state.answers.phone) {
        addMessage('assistant', `**Telefone:** ${state.answers.phone}`);
      }
      if (state.answers.businessHours) {
        addMessage('assistant', `**Horário:** ${state.answers.businessHours}`);
      }
      if (state.answers.paymentMethods.length > 0) {
        addMessage('assistant', `**Formas de pagamento:** ${state.answers.paymentMethods.join(', ')}`);
      }
      if (state.answers.personality) {
        const personality = PERSONALITY_OPTIONS.find(p => p.value === state.answers.personality);
        addMessage('assistant', `**Personalidade:** ${personality?.label || state.answers.personality}`);
      }
      if (state.answers.additionalInfo) {
        addMessage('assistant', `**Informações adicionais:** ${state.answers.additionalInfo}`);
      }
      
      addMessage('assistant', '\n✅ Está tudo certo? Vou gerar o prompt do sistema agora! 🚀');
    } else {
      addMessage('assistant', 'Vamos começar do zero! Qual o nome da sua empresa ou negócio?');
      setState(prev => ({ ...prev, step: 'business-name' }));
    }
  };

  const handleGenerate = () => {
    setIsProcessing(true);
    generatePromptMutation.mutate({
      businessName: state.answers.businessName,
      businessType: state.answers.businessType || undefined,
      street: state.answers.street || undefined,
      neighborhood: state.answers.neighborhood || undefined,
      city: state.answers.city || undefined,
      state: state.answers.state || undefined,
      zipCode: state.answers.zipCode || undefined,
      serviceArea: state.answers.serviceArea || undefined,
      phone: state.answers.phone || undefined,
      businessHours: state.answers.businessHours || undefined,
      paymentMethods: state.answers.paymentMethods.length > 0 ? state.answers.paymentMethods : undefined,
      personality: state.answers.personality || 'professional',
      additionalInfo: state.answers.additionalInfo || undefined,
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

        {/* Payment Methods Selection */}
        {showPaymentSelection && state.step === 'payment-methods' && (
          <div className="mb-4 p-4 border rounded-lg bg-muted/50">
            <h4 className="font-semibold mb-2">Selecione as formas de pagamento:</h4>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {PAYMENT_METHODS.map((method, idx) => {
                const isSelected = state.answers.paymentMethods.includes(method);
                return (
                  <Button
                    key={idx}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      const newMethods = isSelected
                        ? state.answers.paymentMethods.filter(m => m !== method)
                        : [...state.answers.paymentMethods, method];
                      setState(prev => ({
                        ...prev,
                        answers: { ...prev.answers, paymentMethods: newMethods }
                      }));
                    }}
                  >
                    {isSelected && <CheckCircle2 className="h-3 w-3 mr-1" />}
                    {method}
                  </Button>
                );
              })}
            </div>
            <Button
              onClick={() => {
                if (state.answers.paymentMethods.length > 0) {
                  setShowPaymentSelection(false);
                  setState(prev => ({ ...prev, step: 'personality' }));
                  addMessage('assistant', `Ótimo! Formas de pagamento: ${state.answers.paymentMethods.join(', ')}. ✅`);
                  addMessage('assistant', 'Agora vamos definir a personalidade do seu agente!');
                  addMessage('assistant', 'Como você quer que ele se comunique com seus clientes?');
                  addMessage('assistant', 'Escolha uma opção (digite o número):');
                  addMessage('assistant', PERSONALITY_OPTIONS.map((opt, idx) => `${idx + 1}. ${opt.label} - ${opt.description}`).join('\n'));
                } else {
                  toast.error('Selecione pelo menos uma forma de pagamento');
                }
              }}
              size="sm"
              className="w-full"
            >
              Continuar
            </Button>
          </div>
        )}

        {/* Input */}
        {state.step !== 'review' && state.step !== 'complete' && !showPaymentSelection && (
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
          <div className="space-y-2">
            <Button
              onClick={handleGenerate}
              disabled={isProcessing || !state.answers.businessName}
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
                  {existingConfig?.systemPrompt ? 'Atualizar Configurações' : 'Gerar e Salvar Configurações'}
                </>
              )}
            </Button>
            {!state.answers.businessName && (
              <p className="text-sm text-muted-foreground text-center">
                Por favor, preencha pelo menos o nome da empresa antes de gerar.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
