import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import ClientLayout from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  Bot, 
  Sparkles, 
  Loader2,
  ArrowLeft
} from "lucide-react";

export default function CreateAgentPage() {
  const [, setLocation] = useLocation();
  
  const [formData, setFormData] = useState({
    agentName: "",
    systemPrompt: "",
    welcomeMessage: "",
    companyInfo: "",
    enableHumanHandoff: true,
    enableAudioTranscription: true,
    enableImageProcessing: true,
  });

  const createAgentMutation = trpc.agent.createAgent.useMutation({
    onSuccess: (data) => {
      toast.success("Agente criado com sucesso! 🎉");
      // Redirecionar para página de configuração do agente recém-criado
      if (data.agentId) {
        setTimeout(() => {
          setLocation(`/client/agents/${data.agentId}/settings`);
        }, 1000);
      } else {
        // Fallback: redirecionar para lista de agentes
        setTimeout(() => {
          setLocation("/client/agents");
        }, 1000);
      }
    },
    onError: (error) => {
      toast.error(`Erro ao criar agente: ${error.message}`);
    },
  });

  const handleCreate = () => {
    if (!formData.agentName.trim()) {
      toast.error("Por favor, informe o nome do agente");
      return;
    }

    if (!formData.systemPrompt.trim() || formData.systemPrompt.length < 10) {
      toast.error("O prompt do sistema deve ter pelo menos 10 caracteres");
      return;
    }

    createAgentMutation.mutate({
      agentName: formData.agentName,
      systemPrompt: formData.systemPrompt,
      welcomeMessage: formData.welcomeMessage,
      companyInfo: formData.companyInfo,
      enableHumanHandoff: formData.enableHumanHandoff,
      enableAudioTranscription: formData.enableAudioTranscription,
      enableImageProcessing: formData.enableImageProcessing,
    });
  };

  return (
    <ClientLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Criar Novo Agente</h1>
            <p className="text-muted-foreground">
              Configure seu agente de IA personalizado
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

        <div className="grid gap-6">
          {/* Nome do Agente */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="agentName">Nome do Agente *</Label>
                <Input
                  id="agentName"
                  value={formData.agentName}
                  onChange={(e) =>
                    setFormData({ ...formData, agentName: e.target.value })
                  }
                  placeholder="Ex: Agente de Vendas"
                />
              </div>
            </CardContent>
          </Card>

          {/* Prompt do Sistema */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Personalidade do Agente
              </CardTitle>
              <CardDescription>
                Defina como o agente deve se comportar e responder
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="systemPrompt">Instruções para o Agente *</Label>
                <Textarea
                  id="systemPrompt"
                  value={formData.systemPrompt}
                  onChange={(e) =>
                    setFormData({ ...formData, systemPrompt: e.target.value })
                  }
                  placeholder="Descreva a personalidade e comportamento do agente..."
                  rows={10}
                  className="resize-none font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {formData.systemPrompt.length} caracteres (mínimo 10)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="welcomeMessage">Mensagem de Boas-Vindas</Label>
                <Textarea
                  id="welcomeMessage"
                  value={formData.welcomeMessage}
                  onChange={(e) =>
                    setFormData({ ...formData, welcomeMessage: e.target.value })
                  }
                  placeholder="Primeira mensagem que o agente envia..."
                  rows={3}
                  className="resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Informações da Empresa */}
          <Card>
            <CardHeader>
              <CardTitle>Informações da Empresa</CardTitle>
              <CardDescription>
                Dados que o agente pode usar nas conversas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="companyInfo">Dados da Empresa (JSON)</Label>
                <Textarea
                  id="companyInfo"
                  value={formData.companyInfo}
                  onChange={(e) =>
                    setFormData({ ...formData, companyInfo: e.target.value })
                  }
                  placeholder='{"name": "Minha Empresa", "address": "Rua X, 123", "phone": "(11) 99999-9999"}'
                  rows={6}
                  className="resize-none font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Formato JSON com informações relevantes sobre sua empresa
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Funcionalidades */}
          <Card>
            <CardHeader>
              <CardTitle>Funcionalidades do Agente</CardTitle>
              <CardDescription>
                Ative ou desative recursos específicos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableHumanHandoff">
                    Transferência para Atendimento Humano
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Permite que usuários solicitem atendimento humano
                  </p>
                </div>
                <Switch
                  id="enableHumanHandoff"
                  checked={formData.enableHumanHandoff}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, enableHumanHandoff: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableAudioTranscription">
                    Transcrição de Áudio
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Converte mensagens de áudio em texto
                  </p>
                </div>
                <Switch
                  id="enableAudioTranscription"
                  checked={formData.enableAudioTranscription}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, enableAudioTranscription: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableImageProcessing">
                    Processamento de Imagens
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Permite que o agente analise imagens enviadas
                  </p>
                </div>
                <Switch
                  id="enableImageProcessing"
                  checked={formData.enableImageProcessing}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, enableImageProcessing: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Botões de Ação */}
          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => setLocation("/client/agents")}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createAgentMutation.isPending}
              size="lg"
            >
              {createAgentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Criar Agente
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}

