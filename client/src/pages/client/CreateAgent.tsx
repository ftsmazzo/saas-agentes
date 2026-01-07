import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import ClientLayout from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { 
  Loader2,
  ArrowLeft,
  Sparkles
} from "lucide-react";
import AgentConfigAssistant from "@/components/AgentConfigAssistant";

export default function CreateAgentPage() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  
  const [agentId, setAgentId] = useState<number | null>(null);
  const [assistantComplete, setAssistantComplete] = useState(false);

  // Criar agente básico primeiro (sem configuração)
  const createAgentMutation = trpc.agent.createAgent.useMutation({
    onSuccess: (data) => {
      if (data.agentId) {
        setAgentId(data.agentId);
        toast.success("Agente criado! Agora vamos configurá-lo com o assistente de IA.");
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

  // Inicializar: criar agente básico automaticamente
  useEffect(() => {
    if (!agentId && !createAgentMutation.isPending && !createAgentMutation.isSuccess) {
      // Criar agente com nome temporário e prompt mínimo
      createAgentMutation.mutate({
        agentName: "Novo Agente",
        systemPrompt: "Você é um assistente virtual prestativo.",
        welcomeMessage: "",
        companyInfo: "",
        enableHumanHandoff: true,
        enableAudioTranscription: true,
        enableImageProcessing: true,
      });
    }
  }, [agentId]);

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

  // Mostrar loading enquanto cria o agente
  if (createAgentMutation.isPending || !agentId) {
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
                <p className="text-muted-foreground">Criando agente...</p>
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
          <AgentConfigAssistant
            agentId={agentId}
            onComplete={handleAssistantComplete}
            existingConfig={agentConfig}
          />
        )}
      </div>
    </ClientLayout>
  );
}

