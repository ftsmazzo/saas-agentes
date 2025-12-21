import { useState } from "react";
import { trpc } from "@/lib/trpc";
import ClientLayout from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  MessageSquare, 
  Sparkles, 
  Loader2, 
  CheckCircle2,
  User,
  Bot,
  Calendar,
  Search,
  Wand2,
  ArrowRight,
  Filter
} from "lucide-react";
// Formatação de data simples (sem date-fns por enquanto)
const formatDate = (date: string | Date) => {
  const d = new Date(date);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

interface SelectedInteraction {
  conversationId: number;
  messages: Array<{
    role: string;
    content: string;
    createdAt: string;
  }>;
}

export default function InteractionsPage() {
  const [selectedInteractions, setSelectedInteractions] = useState<Set<number>>(new Set());
  const [improvementSuggestion, setImprovementSuggestion] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data: conversations, isLoading } = trpc.interactions.getConversations.useQuery();
  const { data: agentConfig } = trpc.agent.getConfig.useQuery();
  
  const analyzeMutation = trpc.interactions.analyzeAndImprovePrompt.useMutation({
    onSuccess: (data) => {
      setImprovementSuggestion(data.suggestedPrompt || "");
      setIsAnalyzing(false);
      toast.success("Análise concluída! Veja as sugestões abaixo.");
    },
    onError: (error) => {
      setIsAnalyzing(false);
      toast.error(`Erro ao analisar: ${error.message}`);
    },
  });

  const applyImprovementMutation = trpc.agent.updateConfig.useMutation({
    onSuccess: () => {
      toast.success("Prompt atualizado com sucesso!");
      setImprovementSuggestion("");
      setSelectedInteractions(new Set());
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const toggleInteraction = (conversationId: number) => {
    const newSelected = new Set(selectedInteractions);
    if (newSelected.has(conversationId)) {
      newSelected.delete(conversationId);
    } else {
      newSelected.add(conversationId);
    }
    setSelectedInteractions(newSelected);
  };

  const handleAnalyze = () => {
    if (selectedInteractions.size === 0) {
      toast.error("Selecione pelo menos uma interação para analisar");
      return;
    }

    setIsAnalyzing(true);
    analyzeMutation.mutate({
      conversationIds: Array.from(selectedInteractions),
    });
  };

  const handleApplyImprovement = () => {
    if (!improvementSuggestion || !agentConfig) {
      toast.error("Nenhuma sugestão disponível");
      return;
    }

    applyImprovementMutation.mutate({
      systemPrompt: improvementSuggestion,
    });
  };

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Interações</h1>
            <p className="text-muted-foreground">
              Visualize conversas e use IA para melhorar o prompt do agente
            </p>
          </div>
          {selectedInteractions.size > 0 && (
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              size="lg"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Analisar com IA ({selectedInteractions.size})
                </>
              )}
            </Button>
          )}
        </div>

        {/* Sugestão de Melhoria */}
        {improvementSuggestion && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-900">
                <Wand2 className="h-5 w-5" />
                Sugestão de Melhoria do Prompt
              </CardTitle>
              <CardDescription className="text-green-800">
                Baseado na análise das interações selecionadas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Prompt Sugerido</Label>
                <Textarea
                  value={improvementSuggestion}
                  onChange={(e) => setImprovementSuggestion(e.target.value)}
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleApplyImprovement}
                  disabled={applyImprovementMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {applyImprovementMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Aplicando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Aplicar Melhoria
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setImprovementSuggestion("");
                    setSelectedInteractions(new Set());
                  }}
                >
                  Descartar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de Conversas */}
        <div className="space-y-4">
          {conversations && conversations.length > 0 ? (
            conversations.map((conversation) => {
              const isSelected = selectedInteractions.has(conversation.id);
              return (
                <Card
                  key={conversation.id}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? "border-primary bg-primary/5" : ""
                  }`}
                  onClick={() => toggleInteraction(conversation.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleInteraction(conversation.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">
                              {conversation.contact?.name || conversation.contact?.phoneNumber || "Contato"}
                            </span>
                            <Badge variant="outline">
                              {conversation.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {conversation.lastMessageAt
                              ? formatDate(conversation.lastMessageAt)
                              : formatDate(conversation.startedAt)}
                          </div>
                        </div>
                        {conversation.messages && conversation.messages.length > 0 && (
                          <div className="space-y-2 pt-2 border-t">
                            {conversation.messages.slice(-3).map((message, idx) => (
                              <div
                                key={idx}
                                className={`flex items-start gap-2 text-sm ${
                                  message.role === "user" ? "justify-end" : "justify-start"
                                }`}
                              >
                                {message.role === "assistant" && (
                                  <Bot className="h-4 w-4 text-primary mt-1" />
                                )}
                                {message.role === "user" && (
                                  <User className="h-4 w-4 text-muted-foreground mt-1" />
                                )}
                                <div
                                  className={`rounded-lg p-2 max-w-[80%] ${
                                    message.role === "user"
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-muted"
                                  }`}
                                >
                                  <p className="text-sm">{message.content}</p>
                                </div>
                              </div>
                            ))}
                            {conversation.messages.length > 3 && (
                              <p className="text-xs text-muted-foreground text-center">
                                +{conversation.messages.length - 3} mensagens anteriores
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma interação ainda</h3>
                <p className="text-muted-foreground">
                  As conversas aparecerão aqui quando o agente começar a receber mensagens
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ClientLayout>
  );
}

