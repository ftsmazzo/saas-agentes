import { useState, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Send, Loader2, Sparkles, X, CheckCircle2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/_core/hooks/useAuth';

interface Message {
  role: 'assistant' | 'user' | 'system';
  content: string;
  timestamp: Date;
}

interface AssistantState {
  userName: string;
  collectedInfo: {
    businessName?: string;
    businessType?: string;
    street?: string;
    streetNumber?: string; // Adicionado para número
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    phone?: string;
    businessHours?: string;
    paymentMethods?: string[];
    personality?: string;
    purpose?: string;
    audience?: string;
    additionalInfo?: string;
  };
}

export default function AgentConfigAssistantV2({ 
  agentId,
  onComplete,
  existingConfig 
}: { 
  agentId?: number;
  onComplete: () => void;
  existingConfig?: any;
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [state, setState] = useState<AssistantState>({
    userName: user?.name?.split(' ')[0] || '',
    collectedInfo: {},
  });
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Carregar mensagens salvas do localStorage
  useEffect(() => {
    const storageKey = `assistant-messages-${agentId || 'new'}`;
    const savedMessages = localStorage.getItem(storageKey);
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        setMessages(parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })));
      } catch (e) {
        console.error('Erro ao carregar mensagens:', e);
      }
    }
  }, [agentId]);

  // Salvar mensagens no localStorage
  const saveMessages = (newMessages: Message[]) => {
    const storageKey = `assistant-messages-${agentId || 'new'}`;
    localStorage.setItem(storageKey, JSON.stringify(newMessages));
  };

  // Carregar configuração existente
  useEffect(() => {
    if (existingConfig?.companyInfo) {
      try {
        const companyInfo = JSON.parse(existingConfig.companyInfo);
        setState((prev) => ({
          ...prev,
          collectedInfo: {
            businessName: companyInfo.name || '',
            businessType: companyInfo.type || '',
            street: companyInfo.street || '',
            streetNumber: companyInfo.streetNumber || '',
            neighborhood: companyInfo.neighborhood || '',
            city: companyInfo.city || '',
            state: companyInfo.state || '',
            zipCode: companyInfo.zipCode || '',
            phone: companyInfo.phone || '',
            businessHours: companyInfo.businessHours || '',
            paymentMethods: companyInfo.paymentMethods || [],
            personality: companyInfo.personality || '',
            additionalInfo: companyInfo.additionalInfo || '',
          },
        }));
      } catch (e) {
        console.error('Erro ao carregar config existente:', e);
      }
    }
  }, [existingConfig]);

  const chatMutation = trpc.clientPanel.chatWithAssistant.useMutation({
    onSuccess: (data) => {
      addMessage('assistant', data.message);
      setIsProcessing(false);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
      setIsProcessing(false);
      addMessage('assistant', `Desculpe, ocorreu um erro. Por favor, tente novamente.`);
    },
  });

  const generatePromptMutation = trpc.clientPanel.generateSystemPrompt.useMutation({
    onSuccess: (data) => {
      addMessage('assistant', `✅ Perfeito! Seu agente foi configurado com sucesso!`);
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
      const welcomeMessage = existingConfig?.systemPrompt
        ? `👋 Olá${state.userName ? `, ${state.userName}` : ''}! Eu sou o **Criador**, seu assistente para configurar agentes de IA.\n\nVejo que você já tem um agente configurado. Posso te ajudar a revisar, melhorar ou atualizar as configurações. Como posso ajudar você hoje?`
        : `👋 Olá${state.userName ? `, ${state.userName}` : ''}! Eu sou o **Criador**, seu assistente especializado em engenharia de prompts e configuração de agentes de IA.\n\nVou te ajudar a criar um agente de IA personalizado para sua empresa. Podemos conversar naturalmente - não preciso seguir um questionário rígido. O que você gostaria de fazer primeiro?`;
      
      addMessage('assistant', welcomeMessage);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (role: 'assistant' | 'user' | 'system', content: string) => {
    const newMessage: Message = { role, content, timestamp: new Date() };
    const newMessages = [...messages, newMessage];
    setMessages(newMessages);
    saveMessages(newMessages);
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isProcessing) return;

    const userMessage = userInput.trim();
    addMessage('user', userMessage);
    setUserInput('');
    setIsProcessing(true);

    // Preparar histórico de mensagens
    const messageHistory = [
      ...messages,
      { role: 'user' as const, content: userMessage, timestamp: new Date() },
    ].map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    // Chamar API de chat
    chatMutation.mutate({
      agentId: agentId,
      messages: messageHistory,
      userName: state.userName,
    });
  };

  const handleGeneratePrompt = () => {
    if (!state.collectedInfo.businessName) {
      toast.error('Por favor, informe pelo menos o nome da empresa');
      addMessage('assistant', 'Preciso do nome da empresa para gerar o prompt. Qual é o nome da sua empresa?');
      return;
    }

    setIsProcessing(true);
    
    // Mapear personalidade
    const personalityMap: Record<string, any> = {
      'formal': 'formal',
      'profissional': 'professional',
      'técnico': 'professional',
      'amigável': 'friendly',
      'casual': 'casual',
      'persuasivo': 'energetic',
      'objetivo': 'professional',
      'consultivo': 'consultative',
      'didático': 'consultative',
      'empático': 'empathetic',
      'direto': 'professional',
    };
    
    const selectedPersonality = state.collectedInfo.personality || 'professional';
    const mappedPersonality = personalityMap[selectedPersonality.toLowerCase()] || 'professional';

    // Construir endereço completo incluindo número
    const addressParts = [];
    if (state.collectedInfo.street) {
      addressParts.push(state.collectedInfo.street);
      if (state.collectedInfo.streetNumber) {
        addressParts.push(`nº ${state.collectedInfo.streetNumber}`);
      }
    }
    if (state.collectedInfo.neighborhood) addressParts.push(state.collectedInfo.neighborhood);
    if (state.collectedInfo.city) addressParts.push(state.collectedInfo.city);
    if (state.collectedInfo.state) addressParts.push(state.collectedInfo.state);
    if (state.collectedInfo.zipCode) addressParts.push(`CEP: ${state.collectedInfo.zipCode}`);

    generatePromptMutation.mutate({
      agentId: agentId,
      businessName: state.collectedInfo.businessName!,
      businessType: state.collectedInfo.businessType,
      street: addressParts.length > 0 ? addressParts.join(', ') : undefined,
      neighborhood: state.collectedInfo.neighborhood,
      city: state.collectedInfo.city,
      state: state.collectedInfo.state,
      zipCode: state.collectedInfo.zipCode,
      phone: state.collectedInfo.phone,
      businessHours: state.collectedInfo.businessHours,
      paymentMethods: state.collectedInfo.paymentMethods,
      personality: mappedPersonality,
      additionalInfo: state.collectedInfo.additionalInfo,
    });
  };

  const clearChat = () => {
    if (confirm('Tem certeza que deseja limpar a conversa? As mensagens serão perdidas.')) {
      setMessages([]);
      const storageKey = `assistant-messages-${agentId || 'new'}`;
      localStorage.removeItem(storageKey);
      // Reiniciar com mensagem de boas-vindas
      const welcomeMessage = `👋 Olá${state.userName ? `, ${state.userName}` : ''}! Como posso ajudar você hoje?`;
      addMessage('assistant', welcomeMessage);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Criador - Assistente Inteligente
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearChat}
            className="text-muted-foreground"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Limpar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Chat Messages */}
        <div 
          ref={messagesContainerRef}
          className="h-[500px] overflow-y-auto border rounded-lg p-4 mb-4 space-y-4 bg-muted/30"
        >
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
                className={`max-w-[85%] rounded-lg p-3 ${
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
                <p className="text-sm">Pensando...</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <Input
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Digite sua mensagem..."
            disabled={isProcessing}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isProcessing || !userInput.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Botão de gerar prompt (aparece quando há informações suficientes) */}
        {state.collectedInfo.businessName && messages.length > 2 && (
          <div className="mt-4 pt-4 border-t">
            <Button
              onClick={handleGeneratePrompt}
              disabled={isProcessing || generatePromptMutation.isPending}
              className="w-full"
              size="lg"
            >
              {generatePromptMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Gerando prompt...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar e Salvar Configurações
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

