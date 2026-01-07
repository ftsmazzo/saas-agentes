import { useState, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Send, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/_core/hooks/useAuth';

interface Message {
  role: 'assistant' | 'user' | 'system';
  content: string;
  timestamp: Date;
}

interface CollectedInfo {
  businessName?: string;
  businessType?: string;
  street?: string;
  streetNumber?: string;
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
}

export default function AgentConfigAssistantV3({ 
  agentId,
  onComplete,
  existingConfig 
}: { 
  agentId?: number;
  onComplete: () => void;
  existingConfig?: any;
}) {
  const { user, tenant } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [collectedInfo, setCollectedInfo] = useState<CollectedInfo>({});
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [shouldShowGenerateButton, setShouldShowGenerateButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userName = (user?.name || tenant?.companyName || '').split(' ')[0] || '';

  const getConversationQuery = trpc.clientPanel.getAssistantConversation.useQuery(
    { agentId: agentId },
    { enabled: !hasStarted && !!agentId, retry: false }
  );

  // Carregar conversa anterior ou configuração existente
  useEffect(() => {
    // Primeiro, tentar carregar do banco de dados
    if (!hasStarted && agentId && getConversationQuery.data) {
      const data = getConversationQuery.data;
      if (data?.conversation) {
        const conv = data.conversation;
        setConversationId(conv.conversationId);
        if (conv.messages && Array.isArray(conv.messages)) {
          setMessages(conv.messages.map((msg: any) => ({
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp || Date.now()),
          })));
        }
        if (conv.collectedInfo) {
          setCollectedInfo(conv.collectedInfo);
        }
        setHasStarted(true);
        return;
      }
    }
    
    // Se não tem conversa no banco, tentar localStorage
    if (!hasStarted) {
      const storageKey = `assistant-messages-${agentId || 'new'}`;
      const savedMessages = localStorage.getItem(storageKey);
      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages);
          setMessages(parsed.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })));
          setHasStarted(true);
          return;
        } catch (e) {
          console.error('Erro ao carregar mensagens do localStorage:', e);
        }
      }
    }
    
    // Se não tem conversa, carregar config existente
    if (!hasStarted && existingConfig?.companyInfo) {
      try {
        const companyInfo = JSON.parse(existingConfig.companyInfo);
        setCollectedInfo({
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
        });
      } catch (e) {
        console.error('Erro ao carregar config existente:', e);
      }
    }
    
    if (!hasStarted) {
      setHasStarted(true);
    }
  }, [existingConfig, hasStarted, agentId, getConversationQuery.data]);

  // Salvar mensagens no localStorage sempre que mudarem
  useEffect(() => {
    if (messages.length > 0) {
      const storageKey = `assistant-messages-${agentId || 'new'}`;
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, agentId]);

  const chatMutation = trpc.clientPanel.chatWithAssistant.useMutation({
    onSuccess: (data) => {
      try {
        if (!data) {
          console.error('[Chat] Resposta vazia do servidor');
          toast.error('Erro: Resposta vazia do servidor');
          setIsProcessing(false);
          addMessage('assistant', `Desculpe, ocorreu um erro. Por favor, tente novamente.`);
          return;
        }

        if (!data.message || typeof data.message !== 'string') {
          console.error('[Chat] Resposta inválida:', data);
          toast.error('Erro: Resposta inválida do servidor');
          setIsProcessing(false);
          addMessage('assistant', `Desculpe, ocorreu um erro. Por favor, tente novamente.`);
          return;
        }

        addMessage('assistant', data.message);
        setIsProcessing(false);
        
        // Atualizar conversationId se retornado
        if (data.conversationId) {
          setConversationId(data.conversationId);
        }
        
        // Atualizar informações coletadas se retornadas
        if (data.collectedInfo && typeof data.collectedInfo === 'object') {
          setCollectedInfo((prev) => ({ ...prev, ...data.collectedInfo }));
        }
        
        // Não fazer nada aqui - a detecção do botão será feita em handleSendMessage
        // quando o usuário confirmar após o assistente perguntar
      } catch (error: any) {
        console.error('[Chat] Erro ao processar resposta:', error);
        toast.error(`Erro: ${error.message || 'Erro desconhecido'}`);
        setIsProcessing(false);
        addMessage('assistant', `Desculpe, ocorreu um erro. Por favor, tente novamente.`);
      }
    },
    onError: (error) => {
      console.error('[Chat] Erro na mutation:', error);
      toast.error(`Erro: ${error.message || 'Erro desconhecido'}`);
      setIsProcessing(false);
      addMessage('assistant', `Desculpe, ocorreu um erro. Por favor, tente novamente.`);
    },
  });

  const generatePromptMutation = trpc.clientPanel.generateSystemPrompt.useMutation({
    onSuccess: (data) => {
      addMessage('assistant', `✅ Perfeito, ${userName || 'amigo'}! Seu agente foi configurado com sucesso!`);
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
    if (messages.length === 0 && !hasStarted) {
      const welcomeMessage = existingConfig?.systemPrompt
        ? `👋 Olá${userName ? `, ${userName}` : ''}! Vejo que você já tem um agente configurado. Posso te ajudar a revisar e atualizar as configurações. Vamos começar?`
        : `👋 Olá${userName ? `, ${userName}` : ''}! Eu sou o **Criador**, seu assistente para configurar agentes de IA.\n\nVou fazer algumas perguntas para criar um agente totalmente ajustado à sua necessidade. Podemos conversar naturalmente - se quiser adicionar algo ou tiver dúvidas, é só me falar!\n\nAntes de começarmos, qual é o seu nome?`;
      
      addMessage('assistant', welcomeMessage);
      setHasStarted(true);
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
    setMessages((prev) => [...prev, newMessage]);
  };

  // Extrair informações da mensagem do usuário de forma mais inteligente
  const extractInfoFromMessage = (message: string, currentInfo: CollectedInfo): CollectedInfo => {
    const lower = message.toLowerCase();
    const updated = { ...currentInfo };

    // Nome da empresa - múltiplos padrões
    if (!updated.businessName) {
      // Padrão 1: "empresa X", "negócio X", "nome X"
      const match1 = message.match(/(?:empresa|negócio|nome|chama)[\s:]+(.+?)(?:\.|$|,|é|será)/i);
      if (match1) {
        const name = match1[1].trim();
        // Evitar pegar palavras muito curtas ou comuns
        if (name.length > 2 && !['a', 'o', 'de', 'da', 'do', 'em', 'no', 'na'].includes(name.toLowerCase())) {
          updated.businessName = name;
        }
      }
      // Padrão 2: "X é minha empresa", "X é o negócio"
      const match2 = message.match(/(.+?)\s+(?:é|será|chama)\s+(?:minha|meu|o|a)\s+(?:empresa|negócio)/i);
      if (match2 && !updated.businessName) {
        updated.businessName = match2[1].trim();
      }
    }

    // Tipo de negócio/ramo
    if (!updated.businessType) {
      const typeMatch = message.match(/(?:ramo|tipo|atividade|setor|área)[\s:]+(.+?)(?:\.|$|,)/i);
      if (typeMatch) {
        updated.businessType = typeMatch[1].trim();
      }
      // Padrões comuns: "sou de X", "trabalho com X", "vendo X"
      const typeMatch2 = message.match(/(?:sou de|trabalho com|vendo|vendo|atendo|atua em)\s+(.+?)(?:\.|$|,)/i);
      if (typeMatch2 && !updated.businessType) {
        updated.businessType = typeMatch2[1].trim();
      }
    }

    // Público-alvo
    if (!updated.audience) {
      const audienceMatch = message.match(/(?:público|clientes|atende|atender|falar com)[\s:]+(.+?)(?:\.|$|,)/i);
      if (audienceMatch) {
        updated.audience = audienceMatch[1].trim();
      }
    }

    // Personalidade/tom
    if (!updated.personality) {
      const personalityMatch = message.match(/(?:tom|personalidade|tom de voz|ser|quero que seja)[\s:]+(.+?)(?:\.|$|,)/i);
      if (personalityMatch) {
        updated.personality = personalityMatch[1].trim();
      }
    }

    // Finalidade/objetivo
    if (!updated.purpose) {
      const purposeMatch = message.match(/(?:objetivo|finalidade|propósito|vai|serve para)[\s:]+(.+?)(?:\.|$|,)/i);
      if (purposeMatch) {
        updated.purpose = purposeMatch[1].trim();
      }
    }

    // CEP
    const cepMatch = message.match(/\b\d{5}-?\d{3}\b/);
    if (cepMatch && !updated.zipCode) {
      updated.zipCode = cepMatch[0].replace(/\D/g, '');
    }

    // Telefone
    const phoneMatch = message.match(/(?:\(?\d{2}\)?\s?)?\d{4,5}-?\d{4}/);
    if (phoneMatch && !updated.phone) {
      updated.phone = phoneMatch[0].replace(/\D/g, '');
    }

    // Número do endereço
    const numberMatch = message.match(/(?:n[úu]mero|n[º°]|#)\s*(\d+)/i);
    if (numberMatch && !updated.streetNumber) {
      updated.streetNumber = numberMatch[1];
    }

    return updated;
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isProcessing) return;

    const userMessage = userInput.trim();
    addMessage('user', userMessage);
    
    // Verificar se a última mensagem do assistente foi perguntando se pode gerar o prompt
    // Pegar as últimas 2 mensagens do assistente para ter mais contexto
    const assistantMessages = messages.filter(m => m.role === 'assistant').slice(-2);
    const lastAssistantMessage = assistantMessages.length > 0 
      ? assistantMessages[assistantMessages.length - 1].content.toLowerCase() 
      : '';
    
    // Verificar se assistente perguntou sobre gerar (mais flexível)
    const assistantAskedToGenerate = lastAssistantMessage.includes('posso gerar') || 
                                      lastAssistantMessage.includes('posso criar') || 
                                      lastAssistantMessage.includes('pode gerar') || 
                                      lastAssistantMessage.includes('pode criar') ||
                                      lastAssistantMessage.includes('gerar o prompt') ||
                                      lastAssistantMessage.includes('gerar o sistema') ||
                                      lastAssistantMessage.includes('gerar agora') ||
                                      (lastAssistantMessage.includes('prompt') && 
                                       (lastAssistantMessage.includes('agora') || 
                                        lastAssistantMessage.includes('posso') || 
                                        lastAssistantMessage.includes('pode')));
    
    // Se o assistente perguntou, verificar se o usuário confirmou
    if (assistantAskedToGenerate) {
      const userMessageLower = userMessage.toLowerCase().trim();
      
      // Detecção de confirmação - aceitar várias formas (MUITO MAIS FLEXÍVEL)
      const isConfirmingGenerate = 
        // Confirmações diretas e curtas
        userMessageLower === 'sim' || 
        userMessageLower === 'pode' || 
        userMessageLower === 'ok' || 
        userMessageLower === 'claro' ||
        userMessageLower === 'pode sim' ||
        userMessageLower === 'sim pode' ||
        userMessageLower === 'vamos' ||
        userMessageLower === 'vamos lá' ||
        userMessageLower === 'pode gerar' ||
        userMessageLower === 'pode criar' ||
        userMessageLower === 'vamos gerar' ||
        userMessageLower === 'gerar' ||
        // Frases que incluem confirmação
        userMessageLower.includes('pode gerar') ||
        userMessageLower.includes('pode criar') ||
        userMessageLower.includes('vamos gerar') ||
        userMessageLower.includes('pode gerar o prompt') ||
        userMessageLower.includes('gerar o prompt') ||
        userMessageLower.includes('gerar agora') ||
        userMessageLower.includes('pode') && lastAssistantMessage.includes('gerar');
      
      // Se o usuário confirmou, mostrar o botão IMEDIATAMENTE (mesmo sem businessName)
      if (isConfirmingGenerate) {
        console.log('[Chat] ✅ Usuário confirmou geração. Mostrando botão...', {
          userMessage: userMessageLower,
          hasBusinessName: !!collectedInfo.businessName,
          collectedInfo
        });
        setShouldShowGenerateButton(true);
      }
    }
    
    // Extrair informações da mensagem
    const updatedInfo = extractInfoFromMessage(userMessage, collectedInfo);
    
    // Atualizar estado com todas as informações coletadas
    setCollectedInfo(updatedInfo);

    setUserInput('');
    setIsProcessing(true);

    // Preparar histórico de mensagens com informações coletadas
    const messageHistory = [
      ...messages,
      { role: 'user' as const, content: userMessage, timestamp: new Date() },
    ].map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    // Chamar API de chat com informações coletadas ATUALIZADAS
    try {
      chatMutation.mutate({
        agentId: agentId,
        conversationId: conversationId || undefined,
        messages: messageHistory,
        userName: userName,
        collectedInfo: updatedInfo || {}, // Garantir que sempre seja um objeto
      });
    } catch (error: any) {
      console.error('[Chat] Erro ao chamar mutation:', error);
      toast.error(`Erro: ${error.message || 'Erro ao enviar mensagem'}`);
      setIsProcessing(false);
      addMessage('assistant', `Desculpe, ocorreu um erro ao enviar sua mensagem. Por favor, tente novamente.`);
    }
  };

  const handleGeneratePrompt = () => {
    if (!collectedInfo.businessName) {
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
    
    const selectedPersonality = collectedInfo.personality || 'professional';
    const mappedPersonality = personalityMap[selectedPersonality.toLowerCase()] || 'professional';

    // Construir endereço completo
    const addressParts = [];
    if (collectedInfo.street) {
      addressParts.push(collectedInfo.street);
    }
    if (collectedInfo.neighborhood) addressParts.push(collectedInfo.neighborhood);
    if (collectedInfo.city) addressParts.push(collectedInfo.city);
    if (collectedInfo.state) addressParts.push(collectedInfo.state);
    if (collectedInfo.zipCode) addressParts.push(`CEP: ${collectedInfo.zipCode}`);

    generatePromptMutation.mutate({
      agentId: agentId,
      businessName: collectedInfo.businessName,
      businessType: collectedInfo.businessType,
      street: addressParts.length > 0 ? addressParts.join(', ') : undefined,
      neighborhood: collectedInfo.neighborhood,
      city: collectedInfo.city,
      state: collectedInfo.state,
      zipCode: collectedInfo.zipCode,
      phone: collectedInfo.phone,
      businessHours: collectedInfo.businessHours,
      paymentMethods: collectedInfo.paymentMethods,
      personality: mappedPersonality,
      additionalInfo: collectedInfo.additionalInfo,
    });
  };

  const clearChat = () => {
    if (confirm('Tem certeza que deseja limpar a conversa? As mensagens serão perdidas.')) {
      setMessages([]);
      setCollectedInfo({});
      setHasStarted(false);
      setShouldShowGenerateButton(false);
      setConversationId(null);
      // Limpar localStorage também
      const storageKey = `assistant-messages-${agentId || 'new'}`;
      localStorage.removeItem(storageKey);
      const welcomeMessage = `👋 Olá${userName ? `, ${userName}` : ''}! Como posso ajudar você hoje?`;
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

        {/* Botão de gerar prompt (só aparece quando usuário confirmar explicitamente) */}
        {shouldShowGenerateButton && (
          <div className="mt-4 pt-4 border-t">
            <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                ✅ <strong>Pronto!</strong> Clique no botão abaixo para gerar e salvar o prompt do sistema do seu agente.
              </p>
            </div>
            <Button
              onClick={handleGeneratePrompt}
              disabled={isProcessing || generatePromptMutation.isPending}
              className="w-full bg-primary hover:bg-primary/90"
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
                  Gerar e Salvar Configurações do Agente
                </>
              )}
            </Button>
            {!collectedInfo.businessName && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                ⚠️ Atenção: Nome da empresa não foi informado. O prompt será gerado com informações disponíveis.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

