import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import ClientLayout from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { 
  Loader2,
  ArrowLeft,
  Sparkles,
  Bot
} from "lucide-react";
import AgentConfigAssistantV4 from "@/components/AgentConfigAssistantV4";

export default function CreateAgentPage() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  
  const [agentName, setAgentName] = useState("");
  const [agentId, setAgentId] = useState<number | null>(null);
  const [assistantComplete, setAssistantComplete] = useState(false);

  // Criar agente básico primeiro (sem configuração)
  const createAgentMutation = trpc.agent.createAgent.useMutation({
    onSuccess: (data) => {
      if (data.agentId) {
        setAgentId(data.agentId);
        toast.success(`Agente "${agentName}" criado! Agora vamos configurá-lo com o assistente de IA.`);
      } else {
        toast.error("Erro ao criar agente: ID não retornado");
      }
    },
    onError: (error) => {
      toast.error(`Erro ao criar agente: ${error.message}`);
    },
  });

  // Buscar configuração do agente após criação
  const { data: agentConfig } = trpc.agent.getConfig.useQuery(
    { agentId: agentId! },
    { enabled: !!agentId }
  );

  const handleCreateAgent = () => {
    if (!agentName.trim()) {
      toast.error("Por favor, informe um nome para o agente");
      return;
    }

    // Criar agente com nome escolhido e prompt temporário (será substituído pelo assistente)
    // Prompt precisa ter no mínimo 50 caracteres para passar na validação
    createAgentMutation.mutate({
      agentName: agentName.trim(),
      systemPrompt: "Você é um assistente virtual prestativo e profissional. Este prompt será substituído pelo assistente de configuração.",
      welcomeMessage: "",
      companyInfo: "",
      enableHumanHandoff: true,
      enableAudioTranscription: true,
      enableImageProcessing: true,
    });
  };

  const handleAssistantComplete = () => {
    setAssistantComplete(true);
    // Invalidar cache para recarregar configuração
    if (agentId) {
      utils.agent.getConfig.invalidate({ agentId });
      utils.agent.list.invalidate();
      // Redirecionar para página de configuração após 2 segundos
      setTimeout(() => {
        setLocation(`/client/agents/${agentId}/settings`);
      }, 2000);
    }
  };

  // Mostrar formulário para nome do agente se ainda não foi criado
  if (!agentId && !createAgentMutation.isPending) {
    return (
      <ClientLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Criar Novo Agente</h1>
              <p className="text-muted-foreground">
                Dê um nome ao seu agente para começar
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setLocation("/client/agents")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Nome do Agente</CardTitle>
                  <CardDescription>
                    Escolha um nome que identifique seu agente de IA
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="agentName">Nome do Agente</Label>
                <Input
                  id="agentName"
                  placeholder="Ex: Agente de Vendas, Atendimento Online, Suporte Técnico..."
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && agentName.trim()) {
                      handleCreateAgent();
                    }
                  }}
                  autoFocus
                />
                <p className="text-sm text-muted-foreground">
                  Este nome será usado para identificar seu agente e será exibido no Chatwoot e N8N.
                </p>
              </div>
              <Button
                onClick={handleCreateAgent}
                disabled={!agentName.trim() || createAgentMutation.isPending}
                className="w-full"
                size="lg"
              >
                {createAgentMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando agente...
                  </>
                ) : (
                  <>
                    Criar Agente e Continuar
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </ClientLayout>
    );
  }

  // Mostrar loading enquanto cria o agente
  if (createAgentMutation.isPending) {
    return (
      <ClientLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Criar Novo Agente</h1>
              <p className="text-muted-foreground">
                Preparando o assistente de configuração...
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setLocation("/client/agents")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Criando agente "{agentName}"...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </ClientLayout>
    );
  }

  // Mostrar assistente após agente criado
  return (
    <ClientLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Criar Novo Agente</h1>
            <p className="text-muted-foreground">
              Use o assistente de IA para configurar seu agente de forma inteligente
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setLocation("/client/agents")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>

        {assistantComplete ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4 py-8">
                <Sparkles className="h-8 w-8 text-green-600" />
                <p className="text-lg font-semibold">Agente configurado com sucesso! 🎉</p>
                <p className="text-muted-foreground">Redirecionando para a página de configuração...</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <AgentConfigAssistantV4
            agentId={agentId}
            onComplete={handleAssistantComplete}
            existingConfig={agentConfig}
          />
        )}
      </div>
    </ClientLayout>
  );
}

