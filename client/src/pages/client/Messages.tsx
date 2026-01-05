import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import ClientLayout from "@/components/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { 
  MessageSquare, 
  Search, 
  Send, 
  CheckCircle2, 
  Circle, 
  Clock,
  Loader2,
  User,
  Phone,
  Mail
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Conversation = {
  id: number;
  inbox_id: number;
  status: 'open' | 'resolved' | 'pending';
  last_activity_at?: string;
  updated_at?: string;
  meta?: {
    sender?: {
      id: number;
      name: string;
      email?: string;
      phone_number?: string;
    };
  };
  contact?: {
    id: number;
    name: string;
    email?: string;
    phone_number?: string;
  };
};

type Message = {
  id: number;
  content: string;
  message_type: 'incoming' | 'outgoing';
  created_at: string;
  sender?: {
    id: number;
    name: string;
  };
};

export default function MessagesPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved' | 'pending'>('all');
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading: isLoadingConversations, refetch: refetchConversations } = 
    trpc.chatwoot.getMyConversations.useQuery(undefined, {
      refetchInterval: 30000, // Atualizar a cada 30 segundos
    });

  const { data: conversationDetails } = trpc.chatwoot.getConversationDetails.useQuery(
    { conversationId: selectedConversationId! },
    { enabled: !!selectedConversationId }
  );

  const { data: messages, isLoading: isLoadingMessages, refetch: refetchMessages } = 
    trpc.chatwoot.getConversationMessages.useQuery(
      { conversationId: selectedConversationId! },
      { 
        enabled: !!selectedConversationId,
        refetchInterval: 5000, // Atualizar mensagens a cada 5 segundos
      }
    );

  const sendMessageMutation = trpc.chatwoot.sendMessage.useMutation({
    onSuccess: () => {
      setMessageInput("");
      refetchMessages();
      refetchConversations();
      toast.success("Mensagem enviada!");
    },
    onError: (error) => {
      toast.error(`Erro ao enviar mensagem: ${error.message}`);
    },
  });

  const updateStatusMutation = trpc.chatwoot.updateConversationStatus.useMutation({
    onSuccess: () => {
      refetchConversations();
      if (selectedConversationId) {
        // Refetch conversation details
      }
      toast.success("Status atualizado!");
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    },
  });

  const checkInboxMutation = trpc.chatwoot.checkAndUpdateInboxId.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        refetchConversations();
      } else {
        toast.warning(data.message);
      }
    },
    onError: (error) => {
      toast.error(`Erro ao verificar inbox: ${error.message}`);
    },
  });

  // Scroll para última mensagem quando novas mensagens chegarem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Selecionar primeira conversa automaticamente
  useEffect(() => {
    if (conversations && conversations.length > 0 && !selectedConversationId) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  const filteredConversations = conversations?.filter((conv: Conversation) => {
    const matchesSearch = !searchQuery || 
      conv.meta?.sender?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.contact?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || conv.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const selectedConversation = conversations?.find(
    (c: Conversation) => c.id === selectedConversationId
  );

  const contact = conversationDetails?.contact || 
                  selectedConversation?.meta?.sender || 
                  selectedConversation?.contact;

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversationId) return;
    
    sendMessageMutation.mutate({
      conversationId: selectedConversationId,
      content: messageInput.trim(),
      messageType: 'outgoing',
    });
  };

  const handleStatusChange = (status: 'open' | 'resolved' | 'pending') => {
    if (!selectedConversationId) return;
    updateStatusMutation.mutate({
      conversationId: selectedConversationId,
      status,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="default" className="bg-green-600">Aberta</Badge>;
      case 'resolved':
        return <Badge variant="secondary">Resolvida</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100">Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatMessageTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return dateString;
    }
  };

  if (isLoadingConversations) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        <div className="border-b p-4">
          <h1 className="text-2xl font-bold">Mensagens</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie suas conversas do WhatsApp
          </p>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Lista de Conversas */}
          <div className="w-80 border-r flex flex-col">
            {/* Filtros e Busca */}
            <div className="p-4 border-b space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar conversas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                >
                  Todas
                </Button>
                <Button
                  variant={statusFilter === 'open' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('open')}
                >
                  Abertas
                </Button>
                <Button
                  variant={statusFilter === 'resolved' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('resolved')}
                >
                  Resolvidas
                </Button>
              </div>
            </div>

            {/* Lista de Conversas */}
            <ScrollArea className="flex-1">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground space-y-4">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma conversa encontrada</p>
                  {!isLoadingConversations && (
                    <div className="space-y-2">
                      <p className="text-xs">Se você tem conversas no Chatwoot mas não aparecem aqui,</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => checkInboxMutation.mutate()}
                        disabled={checkInboxMutation.isPending}
                      >
                        {checkInboxMutation.isPending ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                            Verificando...
                          </>
                        ) : (
                          "Verificar e Atualizar Inbox"
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredConversations.map((conversation: Conversation) => {
                    const isSelected = conversation.id === selectedConversationId;
                    const contactName = conversation.meta?.sender?.name || 
                                       conversation.contact?.name || 
                                       'Contato';
                    const lastActivity = conversation.last_activity_at || 
                                        conversation.updated_at || 
                                        '';

                    return (
                      <div
                        key={conversation.id}
                        onClick={() => setSelectedConversationId(conversation.id)}
                        className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                          isSelected ? 'bg-muted border-l-4 border-l-primary' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold truncate">{contactName}</p>
                              {getStatusBadge(conversation.status)}
                            </div>
                            {lastActivity && (
                              <p className="text-xs text-muted-foreground">
                                {formatMessageTime(lastActivity)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Área Principal - Mensagens */}
          <div className="flex-1 flex flex-col">
            {selectedConversationId ? (
              <>
                {/* Cabeçalho da Conversa */}
                <div className="border-b p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <h2 className="font-semibold">
                        {contact?.name || 'Contato'}
                      </h2>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        {contact?.phone_number && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {contact.phone_number}
                          </div>
                        )}
                        {contact?.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {contact.email}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {selectedConversation?.status === 'open' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange('resolved')}
                        disabled={updateStatusMutation.isPending}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Resolver
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange('open')}
                        disabled={updateStatusMutation.isPending}
                      >
                        <Circle className="h-4 w-4 mr-2" />
                        Reabrir
                      </Button>
                    )}
                  </div>
                </div>

                {/* Área de Mensagens */}
                <ScrollArea className="flex-1 p-4">
                  {isLoadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : messages && messages.length > 0 ? (
                    <div className="space-y-4">
                      {messages.map((message: Message) => {
                        const isOutgoing = message.message_type === 'outgoing';
                        
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg p-3 ${
                                isOutgoing
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                              <p className={`text-xs mt-1 ${
                                isOutgoing ? 'text-primary-foreground/70' : 'text-muted-foreground'
                              }`}>
                                {formatMessageTime(message.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <p>Nenhuma mensagem ainda</p>
                    </div>
                  )}
                </ScrollArea>

                {/* Input de Mensagem */}
                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <Textarea
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Digite sua mensagem..."
                      className="min-h-[60px] resize-none"
                      disabled={sendMessageMutation.isPending}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim() || sendMessageMutation.isPending}
                      size="lg"
                    >
                      {sendMessageMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Selecione uma conversa para começar</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}

