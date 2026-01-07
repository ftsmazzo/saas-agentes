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

export default function AgentConfigAssistantV4({ 
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
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [promptDraft, setPromptDraft] = useState<string>('');
  const [shouldShowFinalizeButton, setShouldShowFinalizeButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userName = (user?.name || tenant?.companyName || '').split(' ')[0] || '';

  // Buscar conversa anterior
  const getConversationQuery = trpc.clientPanel.getAssistantConversation.useQuery(
    { agentId: agentId! },
    { enabled: !hasStarted && !!agentId, retry: false }
  );

  // Carregar conversa anterior
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
        if (conv.promptDraft) {
          setPromptDraft(conv.promptDraft);
        }
        setHasStarted(true);
        return;
      }
    }
    
    // Se não tem conversa, carregar config existente
    if (!hasStarted && existingConfig?.systemPrompt) {
      setPromptDraft(existingConfig.systemPrompt);
    }
    
    if (!hasStarted) {
      setHasStarted(true);
    }
  }, [existingConfig, hasStarted, agentId, getConversationQuery.data]);

  // Salvar mensagens no localStorage
  useEffect(() => {
    if (messages.length > 0) {
      const storageKey = `assistant-messages-v4-${agentId || 'new'}`;
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, agentId]);

  const buildPromptMutation = trpc.clientPanel.buildPromptIncrementally.useMutation({
    onSuccess: (data) => {
      try {
        if (!data || !data.message) {
          console.error('[BuildPrompt] Resposta inválida:', data);
          toast.error('Erro: Resposta inválida do servidor');
          setIsProcessing(false);
          addMessage('assistant', `Desculpe, ocorreu um erro. Por favor, tente novamente.`);
          return;
        }

        addMessage('assistant', data.message);
        setIsProcessing(false);
        
        // Atualizar conversationId e promptDraft
        if (data.conversationId) {
          setConversationId(data.conversationId);
        }
        
        if (data.promptDraft) {
          setPromptDraft(data.promptDraft);
        }

        // Verificar se deve mostrar botão de finalizar
        if (data.shouldShowFinalizeButton) {
          setShouldShowFinalizeButton(true);
        }
      } catch (error: any) {
        console.error('[BuildPrompt] Erro ao processar resposta:', error);
        toast.error(`Erro: ${error.message || 'Erro desconhecido'}`);
        setIsProcessing(false);
        addMessage('assistant', `Desculpe, ocorreu um erro. Por favor, tente novamente.`);
      }
    },
    onError: (error) => {
      console.error('[BuildPrompt] Erro na mutation:', error);
      toast.error(`Erro: ${error.message || 'Erro desconhecido'}`);
      setIsProcessing(false);
      addMessage('assistant', `Desculpe, ocorreu um erro. Por favor, tente novamente.`);
    },
  });

  const finalizeMutation = trpc.clientPanel.finalizeIncrementalPrompt.useMutation({
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
    if (messages.length === 0 && hasStarted) {
      const welcomeMessage = existingConfig?.systemPrompt
        ? `👋 Olá${userName ? `, ${userName}` : ''}! Vejo que você já tem um agente configurado. Posso te ajudar a revisar e atualizar as configurações através de uma conversa natural. Vamos começar?`
        : `👋 Olá${userName ? `, ${userName}` : ''}! Eu sou o **Criador**, seu assistente para configurar agentes de IA.\n\nVou conversar com você de forma natural e, durante nossa conversa, vou construindo o prompt do sistema do seu agente. Você pode me dizer o que quiser sobre seu negócio, e eu vou adaptando o prompt conforme conversamos.\n\nVamos começar? Me conte sobre sua empresa ou o que você precisa do agente!`;
      
      addMessage('assistant', welcomeMessage);
    }
  }, [hasStarted]);

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

  const handleSendMessage = async () => {
    if (!userInput.trim() || isProcessing) return;

    const userMessage = userInput.trim();
    addMessage('user', userMessage);

    // Verificar se a última mensagem do assistente foi perguntando se pode finalizar
    const lastAssistantMessage = messages.length > 0 && messages[messages.length - 1].role === 'assistant' 
      ? messages[messages.length - 1].content.toLowerCase() 
      : '';
    
    const assistantAskedToFinalize = (lastAssistantMessage.includes('posso finalizar') || 
                                      lastAssistantMessage.includes('posso gerar') || 
                                      lastAssistantMessage.includes('pode finalizar') ||
                                      lastAssistantMessage.includes('finalizar o prompt')) &&
                                     (lastAssistantMessage.includes('prompt') || 
                                      lastAssistantMessage.includes('agora'));
    
    // Se o assistente perguntou, verificar se o usuário confirmou
    if (assistantAskedToFinalize) {
      const userMessageLower = userMessage.toLowerCase().trim();
      
      const isConfirmingFinalize = 
        userMessageLower === 'sim' || 
        userMessageLower === 'pode' || 
        userMessageLower === 'ok' || 
        userMessageLower === 'claro' ||
        userMessageLower === 'pode finalizar' ||
        userMessageLower === 'finalizar' ||
        userMessageLower.includes('pode finalizar') ||
        userMessageLower.includes('finalizar o prompt');
      
      if (isConfirmingFinalize) {
        setShouldShowFinalizeButton(true);
      }
    }

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

    // Chamar API para construir prompt incrementalmente
    try {
      buildPromptMutation.mutate({
        agentId: agentId,
        conversationId: conversationId || undefined,
        messages: messageHistory,
        userName: userName,
        currentPromptDraft: promptDraft || undefined,
      });
    } catch (error: any) {
      console.error('[BuildPrompt] Erro ao chamar mutation:', error);
      toast.error(`Erro: ${error.message || 'Erro ao enviar mensagem'}`);
      setIsProcessing(false);
      addMessage('assistant', `Desculpe, ocorreu um erro ao enviar sua mensagem. Por favor, tente novamente.`);
    }
  };

  const handleFinalizePrompt = () => {
    if (!conversationId || !agentId) {
      toast.error('Erro: Conversa ou agente não encontrado');
      return;
    }

    setIsProcessing(true);
    
    finalizeMutation.mutate({
      agentId: agentId,
      conversationId: conversationId,
    });
  };

  const clearChat = () => {
    if (confirm('Tem certeza que deseja limpar a conversa? As mensagens serão perdidas.')) {
      setMessages([]);
      setPromptDraft('');
      setHasStarted(false);
      setShouldShowFinalizeButton(false);
      setConversationId(null);
      // Limpar localStorage também
      const storageKey = `assistant-messages-v4-${agentId || 'new'}`;
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
            Criador V4 - Construção Incremental
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

        {/* Botão de finalizar prompt */}
        {shouldShowFinalizeButton && (
          <div className="mt-4 pt-4 border-t">
            <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                ✅ <strong>Pronto!</strong> Clique no botão abaixo para finalizar e salvar o prompt do seu agente.
              </p>
            </div>
            <Button
              onClick={handleFinalizePrompt}
              disabled={isProcessing || finalizeMutation.isPending}
              className="w-full bg-primary hover:bg-primary/90"
              size="lg"
            >
              {finalizeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Finalizando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Finalizar e Salvar Prompt
                </>
              )}
            </Button>
          </div>
        )}

        {/* Preview do prompt em construção (colapsável) */}
        {promptDraft && (
          <details className="mt-4 pt-4 border-t">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
              📝 Ver prompt em construção
            </summary>
            <div className="mt-2 p-3 bg-muted rounded-lg max-h-60 overflow-y-auto">
              <pre className="text-xs font-mono whitespace-pre-wrap">{promptDraft}</pre>
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

