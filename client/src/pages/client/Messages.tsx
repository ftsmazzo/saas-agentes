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
  Mail,
  Image,
  FileText,
  Download,
  Filter,
  Bell,
  Tag,
  X
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
  content?: string;
  message_type: 'incoming' | 'outgoing';
  created_at: string;
  content_type?: 'text' | 'input_text' | 'image' | 'audio' | 'file';
  attachments?: Array<{
    id?: number;
    file_type?: string;
    file_url?: string;
    file_name?: string;
    data_url?: string;
    url?: string;
    type?: string;
    name?: string;
  }>;
  content_attributes?: {
    origin?: string;
    via?: string;
    items?: Array<{
      type?: string;
      url?: string;
      file_type?: string;
      file_name?: string;
    }>;
  };
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
  const [showSystemMessages, setShowSystemMessages] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<Array<{ file: File; preview?: string }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: authData } = trpc.auth.me.useQuery();
  const currentUser = authData?.type === 'client' ? authData.tenant : null;

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

  // Selecionar primeira conversa automaticamente (apenas se não houver seleção)
  useEffect(() => {
    if (conversations && conversations.length > 0 && !selectedConversationId) {
      // Filtrar conversas válidas (não Evolution)
      const validConversations = conversations.filter((conv: Conversation) => {
        const contactName = conv.meta?.sender?.name || conv.contact?.name || '';
        const nameLower = contactName.toLowerCase();
        return nameLower !== 'evolution' && !nameLower.includes('evolution');
      });
      
      if (validConversations.length > 0) {
        setSelectedConversationId(validConversations[0].id);
      }
    }
  }, [conversations, selectedConversationId]);
  
  // Garantir que a conversa selecionada ainda existe após refetch
  useEffect(() => {
    if (selectedConversationId && conversations) {
      const conversationExists = conversations.some((c: Conversation) => c.id === selectedConversationId);
      if (!conversationExists) {
        // Se a conversa selecionada não existe mais, selecionar a primeira válida
        const validConversations = conversations.filter((conv: Conversation) => {
          const contactName = conv.meta?.sender?.name || conv.contact?.name || '';
          const nameLower = contactName.toLowerCase();
          return nameLower !== 'evolution' && !nameLower.includes('evolution');
        });
        
        if (validConversations.length > 0) {
          setSelectedConversationId(validConversations[0].id);
        } else {
          setSelectedConversationId(null);
        }
      }
    }
  }, [conversations, selectedConversationId]);

  const filteredConversations = conversations?.filter((conv: Conversation) => {
    // Filtrar conversas do Evolution
    const contactName = conv.meta?.sender?.name || conv.contact?.name || '';
    const nameLower = contactName.toLowerCase();
    if (nameLower === 'evolution' || nameLower.includes('evolution')) {
      return false;
    }
    
    // Filtrar por busca
    const matchesSearch = !searchQuery || 
      contactName.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filtrar por status
    const matchesStatus = statusFilter === 'all' || conv.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const selectedConversation = conversations?.find(
    (c: Conversation) => c.id === selectedConversationId
  );

  const contact = conversationDetails?.contact || 
                  selectedConversation?.meta?.sender || 
                  selectedConversation?.contact;

  const uploadFileMutation = trpc.chatwoot.uploadFile.useMutation();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validar tamanho (máximo 10MB por arquivo)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        toast.error(`Arquivo ${file.name} excede o limite de 10MB`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Adicionar previews para imagens
    const filesWithPreviews = await Promise.all(
      validFiles.map(async (file) => {
        if (file.type.startsWith('image/')) {
          const preview = URL.createObjectURL(file);
          return { file, preview };
        }
        return { file };
      })
    );

    setSelectedFiles(prev => [...prev, ...filesWithPreviews]);
    
    // Limpar input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index);
      // Revogar URL de preview se houver
      if (prev[index].preview) {
        URL.revokeObjectURL(prev[index].preview!);
      }
      return newFiles;
    });
  };

  const handleSendMessage = async () => {
    if ((!messageInput.trim() && selectedFiles.length === 0) || !selectedConversationId) return;

    setIsUploading(true);
    
    try {
      // Fazer upload de todos os arquivos
      const attachments = await Promise.all(
        selectedFiles.map(async ({ file }) => {
          // Converter arquivo para base64
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              resolve(result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          // Fazer upload para o Chatwoot
          const uploadResult = await uploadFileMutation.mutateAsync({
            file: base64,
            fileName: file.name,
            contentType: file.type
          });

          return uploadResult;
        })
      );

      // Enviar mensagem com anexos
      await sendMessageMutation.mutateAsync({
        conversationId: selectedConversationId,
        content: messageInput.trim() || '', // Pode ser vazio se houver apenas anexos
        messageType: 'outgoing',
        attachments: attachments.length > 0 ? attachments : undefined
      });

      // Limpar estado
      setMessageInput("");
      setSelectedFiles([]);
      // Revogar URLs de preview
      selectedFiles.forEach(({ preview }) => {
        if (preview) URL.revokeObjectURL(preview);
      });
      
      refetchMessages();
      refetchConversations();
    } catch (error: any) {
      toast.error(`Erro ao enviar mensagem: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
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

  const formatMessageTime = (dateString: string | null | undefined) => {
    try {
      if (!dateString) {
        return 'Agora';
      }
      
      // Tentar parsear como timestamp primeiro (em milissegundos ou segundos)
      let date: Date;
      const numValue = Number(dateString);
      
      if (!isNaN(numValue)) {
        // Se for número, pode ser timestamp
        if (numValue < 10000000000) {
          // Timestamp em segundos, converter para milissegundos
          date = new Date(numValue * 1000);
        } else {
          // Timestamp em milissegundos
          date = new Date(numValue);
        }
      } else {
        // Tentar parsear como string ISO
        date = new Date(dateString);
      }
      
      // Verificar se a data é válida e não é epoch (1970)
      const timestamp = date.getTime();
      if (isNaN(timestamp) || timestamp < 946684800000) { // 2000-01-01 em ms
        console.warn('[Messages] Data inválida ou muito antiga:', dateString, 'timestamp:', timestamp);
        return 'Data inválida';
      }
      
      // Verificar se a data não é muito antiga (mais de 1 ano)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      if (date < oneYearAgo) {
        // Se for muito antiga, mostrar data formatada
        return new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }).format(date);
      }
      
      // Para datas recentes, usar formatDistanceToNow
      const distance = formatDistanceToNow(date, {
        addSuffix: true,
        locale: ptBR,
      });
      
      // Se retornar algo como "mais de X anos", usar formatação de data
      const yearsMatch = distance.match(/(\d+)\s+anos?/);
      if (yearsMatch && parseInt(yearsMatch[1]) > 1) {
        return new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }).format(date);
      }
      
      return distance;
    } catch (error) {
      console.error('[Messages] Erro ao formatar data:', dateString, error);
      return 'Agora';
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
          <div className="w-80 border-r flex flex-col flex-shrink-0">
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
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {contact?.thumbnail ? (
                        <img 
                          src={contact.thumbnail} 
                          alt={contact?.name || 'Contato'}
                          className="h-10 w-10 rounded-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center ${contact?.thumbnail ? 'hidden' : ''}`}>
                        <User className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div>
                      <h2 className="font-semibold text-base">
                        {contact?.name || 'Contato'}
                      </h2>
                      {contact?.phone_number && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {contact.phone_number}
                        </p>
                      )}
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

                {/* Busca de Mensagens */}
                <div className="border-b p-2">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar nas mensagens..."
                        value={messageSearchQuery}
                        onChange={(e) => setMessageSearchQuery(e.target.value)}
                        className="pl-8 h-8 text-sm"
                      />
                    </div>
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
                      {messages
                        .filter((message: Message) => {
                          // Filtrar por busca de mensagens
                          if (messageSearchQuery) {
                            const searchLower = messageSearchQuery.toLowerCase();
                            const contentMatch = message.content?.toLowerCase().includes(searchLower);
                            const senderMatch = message.sender?.name?.toLowerCase().includes(searchLower);
                            if (!contentMatch && !senderMatch) return false;
                          }
                          return true;
                        })
                        .map((message: Message) => {
                          const isOutgoing = message.message_type === 'outgoing';
                          
                          // Detectar anexos em diferentes formatos do Chatwoot
                          let attachments: Array<{
                            id?: number;
                            file_type?: string;
                            file_url?: string;
                            file_name?: string;
                          }> = [];
                          
                          // Formato 1: attachments direto
                          if (message.attachments && Array.isArray(message.attachments) && message.attachments.length > 0) {
                            attachments = message.attachments.map(att => ({
                              id: att.id,
                              file_type: att.file_type || att.type,
                              file_url: att.file_url || att.url || att.data_url,
                              file_name: att.file_name || att.name
                            }));
                          }
                          
                          // Formato 2: content_attributes.items (formato alternativo)
                          if (attachments.length === 0 && message.content_attributes?.items && Array.isArray(message.content_attributes.items)) {
                            attachments = message.content_attributes.items.map((item: any) => ({
                              file_type: item.type || item.file_type,
                              file_url: item.url || item.file_url,
                              file_name: item.name || item.file_name
                            }));
                          }
                          
                          // Formato 3: content_type é image/audio/file mas sem attachments explícitos
                          if (attachments.length === 0 && (message.content_type === 'image' || message.content_type === 'audio' || message.content_type === 'file')) {
                            // Tentar usar content como URL se for uma URL válida
                            if (message.content && (message.content.startsWith('http://') || message.content.startsWith('https://'))) {
                              attachments = [{
                                file_url: message.content,
                                file_type: message.content_type === 'image' ? 'image/jpeg' : 
                                          message.content_type === 'audio' ? 'audio/mpeg' : 'application/octet-stream',
                                file_name: message.content.split('/').pop() || 'arquivo'
                              }];
                            }
                          }
                          
                          const hasAttachments = attachments.length > 0;
                          const contentType = message.content_type || 'text';
                          
                          // Log para debug de mensagens com anexos
                          if (hasAttachments) {
                            console.log('[Messages] Mensagem com anexos:', {
                              id: message.id,
                              attachments: attachments,
                              content: message.content,
                              contentType: message.content_type,
                              contentAttributes: message.content_attributes
                            });
                          }
                          
                          return (
                            <div
                              key={message.id}
                              className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[75%] rounded-lg p-3 ${
                                  isOutgoing
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                }`}
                              >
                                {/* Anexos (imagens, arquivos) */}
                                {hasAttachments && (
                                  <div className="space-y-2 mb-2">
                                    {attachments.map((attachment, idx) => {
                                      const fileUrl = attachment.file_url || '';
                                      const fileType = attachment.file_type || '';
                                      const fileName = attachment.file_name || 'Arquivo';
                                      const attachmentId = attachment.id || message.id * 1000 + idx; // ID único para key
                                      
                                      return (
                                        <div key={attachmentId} className="space-y-1">
                                          {fileType.startsWith('image/') || message.content_type === 'image' ? (
                                            <div className="rounded overflow-hidden bg-black/5">
                                              <img
                                                src={fileUrl}
                                                alt={fileName}
                                                className="max-w-full h-auto max-h-64 object-contain"
                                                onError={(e) => {
                                                  console.error('[Messages] Erro ao carregar imagem:', fileUrl);
                                                  // Se falhar, tentar mostrar como link
                                                  e.currentTarget.style.display = 'none';
                                                }}
                                              />
                                            </div>
                                          ) : fileType.startsWith('audio/') || message.content_type === 'audio' ? (
                                            <div className="p-2 bg-black/10 rounded">
                                              <audio controls className="w-full">
                                                <source src={fileUrl} type={fileType} />
                                                Seu navegador não suporta áudio.
                                              </audio>
                                            </div>
                                          ) : (
                                            <a
                                              href={fileUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex items-center gap-2 p-2 bg-black/10 rounded hover:bg-black/20 transition-colors"
                                            >
                                              <FileText className="h-4 w-4" />
                                              <span className="text-xs truncate">
                                                {fileName}
                                              </span>
                                              <Download className="h-3 w-3 ml-auto" />
                                            </a>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                
                                {/* Conteúdo da mensagem */}
                                {message.content && (
                                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                )}
                                
                                {/* Timestamp */}
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

                {/* Preview de Arquivos Selecionados */}
                {selectedFiles.length > 0 && (
                  <div className="border-t p-2 bg-muted/50">
                    <div className="flex flex-wrap gap-2">
                      {selectedFiles.map(({ file, preview }, index) => (
                        <div key={index} className="relative group">
                          {preview ? (
                            <div className="relative">
                              <img
                                src={preview}
                                alt={file.name}
                                className="h-20 w-20 object-cover rounded border"
                              />
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                onClick={() => removeFile(index)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="relative h-20 w-20 bg-muted rounded border flex items-center justify-center">
                              <FileText className="h-8 w-8 text-muted-foreground" />
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                onClick={() => removeFile(index)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                              <span className="absolute bottom-0 left-0 right-0 text-xs truncate px-1 bg-black/50 text-white rounded-b">
                                {file.name}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input de Mensagem */}
                <div className="border-t p-4 bg-background">
                  <div className="flex gap-2 items-end">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading || sendMessageMutation.isPending}
                      title="Anexar arquivo"
                      className="flex-shrink-0 h-[60px] w-[60px]"
                    >
                      <Image className="h-4 w-4" />
                    </Button>
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
                      className="min-h-[60px] resize-none flex-1"
                      disabled={isUploading || sendMessageMutation.isPending}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={(!messageInput.trim() && selectedFiles.length === 0) || isUploading || sendMessageMutation.isPending}
                      size="lg"
                      className="flex-shrink-0 h-[60px] w-[60px]"
                    >
                      {(isUploading || sendMessageMutation.isPending) ? (
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

