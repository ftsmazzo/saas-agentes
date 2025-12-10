import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import ClientLayout from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save, Bot } from "lucide-react";

export default function AgentConfigPage() {
  const { data: config, isLoading } = trpc.agent.getConfig.useQuery();
  const utils = trpc.useUtils();

  const [formData, setFormData] = useState({
    systemPrompt: "",
    welcomeMessage: "",
    companyInfo: "",
    enableHumanHandoff: true,
    enableAudioTranscription: true,
    enableImageProcessing: true,
  });

  useEffect(() => {
    if (config) {
      setFormData({
        systemPrompt: config.systemPrompt || "",
        welcomeMessage: config.welcomeMessage || "",
        companyInfo: config.companyInfo || "",
        enableHumanHandoff: config.enableHumanHandoff ?? true,
        enableAudioTranscription: config.enableAudioTranscription ?? true,
        enableImageProcessing: config.enableImageProcessing ?? true,
      });
    }
  }, [config]);

  const updateMutation = trpc.agent.updateConfig.useMutation({
    onSuccess: () => {
      toast.success("Configurações salvas com sucesso!");
      utils.agent.getConfig.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao salvar configurações: ${error.message}`);
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuração do Agente</h1>
          <p className="text-muted-foreground">
            Personalize o comportamento e as respostas do seu agente de IA
          </p>
        </div>

        <div className="grid gap-6">
          {/* Prompt do Sistema */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Prompt do Sistema
              </CardTitle>
              <CardDescription>
                Define a personalidade e o comportamento base do agente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="systemPrompt">Instruções para o Agente</Label>
                <Textarea
                  id="systemPrompt"
                  value={formData.systemPrompt}
                  onChange={(e) =>
                    setFormData({ ...formData, systemPrompt: e.target.value })
                  }
                  placeholder="Você é um assistente virtual prestativo e profissional..."
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Descreva como o agente deve se comportar e responder aos usuários
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
                  placeholder="Olá! Como posso ajudá-lo hoje?"
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Primeira mensagem que o agente envia ao iniciar uma conversa
                </p>
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

          {/* Botão de Salvar */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              size="lg"
            >
              <Save className="mr-2 h-4 w-4" />
              {updateMutation.isPending ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
