import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import ClientLayout from "@/components/ClientLayout";
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
  X,
  MoreVertical
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
      thumbnail?: string;
    };
  };
  contact?: {
    id: number;
    name: string;
    email?: string;
    phone_number?: string;
    thumbnail?: string;
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
  const [selectedFiles, setSelectedFiles] = useState<Array<{ file: File; preview?: string }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const { data: authData } = trpc.auth.me.useQuery();
  const currentUser = authData?.type === 'client' ? authData.tenant : null;

  const { data: conversations, isLoading: isLoadingConversations, refetch: refetchConversations } = 
    trpc.chatwoot.getMyConversations.useQuery(undefined, {
      refetchInterval: 30000,
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
        refetchInterval: 5000,
      }
    );

  const sendMessageMutation = trpc.chatwoot.sendMessage.useMutation({
    onSuccess: () => {
      setMessageInput("");
      setSelectedFiles([]);
      selectedFiles.forEach(({ preview }) => { if (preview) URL.revokeObjectURL(preview); });
      refetchMessages();
      refetchConversations();
      toast.success("Mensagem enviada!");
    },
    onError: (error) => {
      toast.error(`Erro ao enviar mensagem: ${error.message}`);
    },
  });

  const uploadFileMutation = trpc.chatwoot.uploadFile.useMutation();
  const updateStatusMutation = trpc.chatwoot.updateConversationStatus.useMutation({
    onSuccess: () => {
      refetchConversations();
      toast.success("Status atualizado!");
    },
  });

  const checkInboxMutation = trpc.chatwoot.checkAndUpdateInboxId.useMutation({
    onSuccess: () => {
      refetchConversations();
      toast.success("Inbox verificado e atualizado!");
    },
  });

  // Auto-scroll para última mensagem
  useEffect(() => {
    if (messagesEndRef.current && messages) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Selecionar primeira conversa automaticamente
  useEffect(() => {
    if (!selectedConversationId && conversations && conversations.length > 0) {
      const firstValidConversation = conversations.find((c: Conversation) => {
        const contactName = c.meta?.sender?.name || c.contact?.name || '';
        return contactName.toLowerCase() !== 'evolution';
      });
      if (firstValidConversation) {
        setSelectedConversationId(firstValidConversation.id);
      }
    }
  }, [conversations, selectedConversationId]);

  // Re-selecionar conversa se a atual foi filtrada
  useEffect(() => {
    if (selectedConversationId && conversations) {
      const exists = conversations.some((c: Conversation) => c.id === selectedConversationId);
      if (!exists && conversations.length > 0) {
        const firstValid = conversations.find((c: Conversation) => {
          const contactName = c.meta?.sender?.name || c.contact?.name || '';
          return contactName.toLowerCase() !== 'evolution';
        });
        if (firstValid) {
          setSelectedConversationId(firstValid.id);
        }
      }
    }
  }, [conversations, selectedConversationId]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const maxSize = 10 * 1024 * 1024;
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        toast.error(`Arquivo ${file.name} excede o limite de 10MB`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

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
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index);
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
      const attachments = await Promise.all(
        selectedFiles.map(async ({ file }) => {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          const uploadResult = await uploadFileMutation.mutateAsync({
            file: base64,
            fileName: file.name,
            contentType: file.type
          });
          return uploadResult;
        })
      );

      await sendMessageMutation.mutateAsync({
        conversationId: selectedConversationId,
        content: messageInput.trim() || '',
        messageType: 'outgoing',
        attachments: attachments.length > 0 ? attachments : undefined
      });

      setMessageInput("");
      setSelectedFiles([]);
      selectedFiles.forEach(({ preview }) => { if (preview) URL.revokeObjectURL(preview); });
      refetchMessages();
      refetchConversations();
    } catch (error: any) {
      toast.error(`Erro ao enviar mensagem: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="default" className="bg-green-500">Aberta</Badge>;
      case 'resolved':
        return <Badge variant="secondary">Resolvida</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500">Pendente</Badge>;
      default:
        return null;
    }
  };

  const filteredConversations = conversations?.filter((conv: Conversation) => {
    const contactName = conv.meta?.sender?.name || conv.contact?.name || '';
    const nameLower = contactName.toLowerCase();
    
    if (nameLower === 'evolution' || nameLower.includes('evolution')) {
      return false;
    }
    
    if (statusFilter !== 'all' && conv.status !== statusFilter) {
      return false;
    }
    
    if (searchQuery.trim()) {
      return contactName.toLowerCase().includes(searchQuery.toLowerCase());
    }
    
    return true;
  }) || [];

  const selectedConversation = conversations?.find(
    (c: Conversation) => c.id === selectedConversationId
  );

  const contact = conversationDetails?.contact || 
                  selectedConversation?.meta?.sender || 
                  selectedConversation?.contact;

  const formatMessageTime = (dateString: string) => {
    try {
      if (!dateString) return 'Agora';
      const date = new Date(dateString);
      if (isNaN(date.getTime()) || date.getTime() < 1000000000) {
        const timestamp = parseInt(dateString);
        if (!isNaN(timestamp) && timestamp > 1000000000) {
          const validDate = new Date(timestamp * 1000);
          if (!isNaN(validDate.getTime())) {
            return formatDistanceToNow(validDate, { addSuffix: true, locale: ptBR });
          }
        }
        return 'Agora';
      }
      return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
    } catch (error) {
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
      <div className="h-screen flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-16 border-b bg-background flex items-center px-6 flex-shrink-0">
          <h1 className="text-xl font-semibold">Mensagens</h1>
        </div>

        {/* Main Content - 3 Column Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Conversations List (Fixed Width) */}
          <div className="w-80 border-r bg-background flex flex-col flex-shrink-0">
            {/* Search and Filters */}
            <div className="p-4 border-b space-y-3 bg-background">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar conversas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                  className="flex-1"
                >
                  Todas
                </Button>
                <Button
                  variant={statusFilter === 'open' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('open')}
                  className="flex-1"
                >
                  Abertas
                </Button>
                <Button
                  variant={statusFilter === 'resolved' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('resolved')}
                  className="flex-1"
                >
                  Resolvidas
                </Button>
              </div>
            </div>

            {/* Conversations List */}
            <ScrollArea className="flex-1">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground space-y-4">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">Nenhuma conversa encontrada</p>
                  {!isLoadingConversations && (
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
                        "Verificar Inbox"
                      )}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredConversations.map((conversation: Conversation) => {
                    const isSelected = conversation.id === selectedConversationId;
                    const contactName = conversation.meta?.sender?.name || 
                                       conversation.contact?.name || 
                                       'Contato';
                    const contactThumbnail = conversation.meta?.sender?.thumbnail || 
                                            conversation.contact?.thumbnail;
                    const lastActivity = conversation.last_activity_at || 
                                        conversation.updated_at || 
                                        '';

                    return (
                      <div
                        key={conversation.id}
                        onClick={() => setSelectedConversationId(conversation.id)}
                        className={`p-4 cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-primary/10 border-l-4 border-l-primary' 
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            {contactThumbnail ? (
                              <img 
                                src={contactThumbnail} 
                                alt={contactName}
                                className="h-12 w-12 rounded-full object-cover"
                              />
                            ) : (
                              <User className="h-6 w-6 text-primary" />
                            )}
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className="font-semibold text-sm truncate">{contactName}</p>
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

          {/* Center - Messages Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {selectedConversationId ? (
              <>
                {/* Conversation Header */}
                <div className="h-16 border-b bg-background flex items-center justify-between px-6 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {contact?.thumbnail ? (
                        <img 
                          src={contact.thumbnail} 
                          alt={contact?.name || 'Contato'}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <h2 className="font-semibold text-sm">{contact?.name || 'Contato'}</h2>
                      {contact?.phone_number && (
                        <p className="text-xs text-muted-foreground">{contact.phone_number}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {selectedConversation?.status === 'open' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ 
                          conversationId: selectedConversationId, 
                          status: 'resolved' 
                        })}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Resolver
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ 
                          conversationId: selectedConversationId, 
                          status: 'open' 
                        })}
                      >
                        <Circle className="h-4 w-4 mr-2" />
                        Reabrir
                      </Button>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1" ref={messagesContainerRef}>
                  <div className="p-6 space-y-4">
                    {isLoadingMessages ? (
                      <div className="flex items-center justify-center h-64">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : messages && messages.length > 0 ? (
                      messages.map((message: Message) => {
                        const isOutgoing = message.message_type === 'outgoing';
                        
                        // Detectar anexos
                        let attachments: Array<{ file_url: string; file_type: string; file_name?: string }> = [];
                        if (message.attachments && Array.isArray(message.attachments) && message.attachments.length > 0) {
                          attachments = message.attachments.map(att => ({
                            file_url: att.file_url || att.url || att.data_url || '',
                            file_type: att.file_type || att.type || 'application/octet-stream',
                            file_name: att.file_name || att.name
                          }));
                        } else if (message.content_attributes?.items && Array.isArray(message.content_attributes.items)) {
                          attachments = message.content_attributes.items.map(item => ({
                            file_url: item.url || '',
                            file_type: item.file_type || 'application/octet-stream',
                            file_name: item.file_name
                          }));
                        }
                        
                        const hasAttachments = attachments.length > 0;

                        return (
                          <div
                            key={message.id}
                            className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[75%] rounded-lg p-3 ${
                              isOutgoing
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}>
                              {/* Anexos */}
                              {hasAttachments && (
                                <div className="space-y-2 mb-2">
                                  {attachments.map((attachment, idx) => {
                                    const fileUrl = attachment.file_url || '';
                                    const fileType = attachment.file_type || '';
                                    const fileName = attachment.file_name || 'Arquivo';
                                    
                                    return (
                                      <div key={idx} className="space-y-1">
                                        {fileType.startsWith('image/') || message.content_type === 'image' ? (
                                          <div className="rounded overflow-hidden bg-black/5">
                                            <img
                                              src={fileUrl}
                                              alt={fileName}
                                              className="max-w-full h-auto max-h-64 object-contain"
                                              onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                              }}
                                            />
                                          </div>
                                        ) : fileType.startsWith('audio/') || message.content_type === 'audio' ? (
                                          <div className="p-2 bg-black/10 rounded">
                                            <audio controls className="w-full">
                                              <source src={fileUrl} type={fileType} />
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
                                            <span className="text-xs truncate">{fileName}</span>
                                            <Download className="h-3 w-3 ml-auto" />
                                          </a>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              
                              {/* Content */}
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
                      })
                    ) : (
                      <div className="flex items-center justify-center h-64 text-muted-foreground">
                        <p>Nenhuma mensagem ainda</p>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* File Preview */}
                {selectedFiles.length > 0 && (
                  <div className="border-t p-2 bg-muted/50 flex gap-2 overflow-x-auto">
                    {selectedFiles.map(({ file, preview }, index) => (
                      <div key={index} className="relative flex-shrink-0">
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
                )}

                {/* Message Input */}
                <div className="border-t p-4 bg-background flex-shrink-0">
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
                      className="h-12 w-12 flex-shrink-0"
                    >
                      <Image className="h-5 w-5" />
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
                      className="min-h-[48px] max-h-32 resize-none flex-1"
                      disabled={isUploading || sendMessageMutation.isPending}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={(!messageInput.trim() && selectedFiles.length === 0) || isUploading || sendMessageMutation.isPending}
                      className="h-12 w-12 flex-shrink-0"
                    >
                      {(isUploading || sendMessageMutation.isPending) ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
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
