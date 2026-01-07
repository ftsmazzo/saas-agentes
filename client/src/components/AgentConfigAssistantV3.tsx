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

// Função para buscar CEP via ViaCEP
async function fetchCEP(cep: string): Promise<{
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
} | null> {
  const cleanCEP = cep.replace(/\D/g, '');
  if (cleanCEP.length !== 8) return null;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
    const data = await response.json();
    if (data.erro) return { erro: true };
    return data;
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    return null;
  }
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
  const [isLoadingCEP, setIsLoadingCEP] = useState(false);
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

  const chatMutation = trpc.clientPanel.chatWithAssistant.useMutation({
    onSuccess: (data) => {
      if (!data || !data.message) {
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
      if (data.collectedInfo) {
        setCollectedInfo((prev) => ({ ...prev, ...data.collectedInfo }));
      }
      
      // Não mostrar botão automaticamente - só quando usuário confirmar
      // O botão será mostrado quando o usuário responder "sim", "pode", etc. em handleSendMessage
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
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

  // Extrair informações da mensagem do usuário
  const extractInfoFromMessage = (message: string, currentInfo: CollectedInfo): CollectedInfo => {
    const lower = message.toLowerCase();
    const updated = { ...currentInfo };

    // Nome da empresa
    if (!updated.businessName && (lower.includes('empresa') || lower.includes('negócio') || lower.includes('nome'))) {
      const match = message.match(/(?:empresa|negócio|nome)[\s:]+(.+?)(?:\.|$|,)/i);
      if (match) updated.businessName = match[1].trim();
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
    const lastAssistantMessage = messages.length > 0 && messages[messages.length - 1].role === 'assistant' 
      ? messages[messages.length - 1].content.toLowerCase() 
      : '';
    
    const assistantAskedToGenerate = lastAssistantMessage.includes('posso gerar') || 
                                      lastAssistantMessage.includes('posso criar') || 
                                      lastAssistantMessage.includes('pode gerar') || 
                                      lastAssistantMessage.includes('pode criar') ||
                                      lastAssistantMessage.includes('gerar o prompt') ||
                                      lastAssistantMessage.includes('gerar o sistema') ||
                                      lastAssistantMessage.includes('gerar agora');
    
    // Só verificar confirmação se o assistente realmente perguntou sobre gerar
    if (assistantAskedToGenerate) {
      const userMessageLower = userMessage.toLowerCase();
      
      // Detecção mais específica - só aceitar confirmações explícitas
      const isConfirmingGenerate = 
        // Confirmações diretas
        (userMessageLower === 'sim' || userMessageLower === 'pode' || userMessageLower === 'ok' || userMessageLower === 'claro') ||
        // Frases completas de confirmação
        userMessageLower.includes('pode gerar') ||
        userMessageLower.includes('pode criar') ||
        userMessageLower.includes('pode sim') ||
        userMessageLower.includes('sim pode') ||
        userMessageLower.includes('vamos gerar') ||
        userMessageLower.includes('pode gerar o prompt') ||
        userMessageLower.includes('pode criar o prompt') ||
        // Mas NÃO se for sobre outra coisa (ex: "pode chamar", "pode ser")
        (!userMessageLower.includes('chamar') && 
         !userMessageLower.includes('ser') && 
         !userMessageLower.includes('ter') &&
         (userMessageLower.includes('gerar') || userMessageLower.includes('criar')));
      
      // Se o usuário confirmou E tem nome da empresa, mostrar o botão
      if (isConfirmingGenerate && collectedInfo.businessName) {
        setShouldShowGenerateButton(true);
      }
    }
    
    // Verificar se é CEP e buscar automaticamente
    const cepMatch = userMessage.match(/\b\d{5}-?\d{3}\b/);
    if (cepMatch && !collectedInfo.street) {
      const cep = cepMatch[0].replace(/\D/g, '');
      if (cep.length === 8) {
        setIsLoadingCEP(true);
        try {
          const cepData = await fetchCEP(cep);
          setIsLoadingCEP(false);
          
          if (cepData && !cepData.erro) {
            setCollectedInfo((prev) => ({
              ...prev,
              street: cepData.logradouro || prev.street,
              neighborhood: cepData.bairro || prev.neighborhood,
              city: cepData.localidade || prev.city,
              state: cepData.uf || prev.state,
              zipCode: cep,
            }));
            addMessage('assistant', `✅ CEP encontrado! Preenchi: ${cepData.logradouro || ''}, ${cepData.bairro || ''}, ${cepData.localidade || ''} - ${cepData.uf || ''}`);
            setUserInput('');
            return;
          } else {
            setIsLoadingCEP(false);
            addMessage('assistant', '❌ CEP não encontrado. Por favor, verifique o CEP ou informe o endereço manualmente.');
            setUserInput('');
            return;
          }
        } catch (error) {
          setIsLoadingCEP(false);
          console.error('Erro ao buscar CEP:', error);
          addMessage('assistant', '❌ Erro ao buscar CEP. Por favor, tente novamente ou informe o endereço manualmente.');
          setUserInput('');
          return;
        }
      }
    }

    // Extrair informações da mensagem primeiro
    let updatedInfo = extractInfoFromMessage(userMessage, collectedInfo);
    
    // Número do endereço removido - deixar o assistente lidar com isso na conversa

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
    chatMutation.mutate({
      agentId: agentId,
      conversationId: conversationId || undefined,
      messages: messageHistory,
      userName: userName,
      collectedInfo: updatedInfo, // Usar updatedInfo que tem o número incluído
    });
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
          {isLoadingCEP && (
            <div className="flex gap-2 justify-start">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Loader2 className="h-4 w-4 text-primary animate-pulse" />
              </div>
              <div className="bg-background border rounded-lg p-3">
                <p className="text-sm">Buscando endereço pelo CEP...</p>
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
            disabled={isProcessing || isLoadingCEP}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isProcessing || isLoadingCEP || !userInput.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Botão de gerar prompt (aparece quando assistente sugere ou quando há informações suficientes) */}
        {(shouldShowGenerateButton || (collectedInfo.businessName && messages.length > 2)) && (
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

