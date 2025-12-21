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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Bot, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight,
  Loader2,
  Wand2
} from "lucide-react";
import { agentTemplates, type AgentTemplate } from "@shared/agent-templates.js";

export default function CreateAgentPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<"template" | "customize">("template");
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  
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
    onSuccess: () => {
      toast.success("Agente criado com sucesso! 🎉");
      setTimeout(() => {
        setLocation("/client/whatsapp");
      }, 1000);
    },
    onError: (error) => {
      toast.error(`Erro ao criar agente: ${error.message}`);
    },
  });

  const handleTemplateSelect = (template: AgentTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      agentName: template.name,
      systemPrompt: template.systemPrompt,
      welcomeMessage: template.welcomeMessage,
      companyInfo: "",
      enableHumanHandoff: template.suggestedFeatures.enableHumanHandoff,
      enableAudioTranscription: template.suggestedFeatures.enableAudioTranscription,
      enableImageProcessing: template.suggestedFeatures.enableImageProcessing,
    });
    setStep("customize");
  };

  const handleCreate = () => {
    if (!formData.agentName.trim()) {
      toast.error("Por favor, informe o nome do agente");
      return;
    }

    if (!formData.systemPrompt.trim() || formData.systemPrompt.length < 50) {
      toast.error("O prompt do sistema deve ter pelo menos 50 caracteres");
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

  const categories = Array.from(new Set(agentTemplates.map(t => t.category)));

  if (step === "template") {
    return (
      <ClientLayout>
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Criar Novo Agente</h1>
            <p className="text-muted-foreground">
              Escolha um template ou crie um agente personalizado
            </p>
          </div>

          {/* Templates por Categoria */}
          {categories.map((category) => {
            const templates = agentTemplates.filter(t => t.category === category);
            return (
              <div key={category} className="space-y-4">
                <h2 className="text-xl font-semibold">{category}</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {templates.map((template) => (
                    <Card
                      key={template.id}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{template.icon}</span>
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                          </div>
                        </div>
                        <CardDescription>{template.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-1 mb-4">
                          {template.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <Button className="w-full" variant="outline">
                          Usar este template
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Personalizar Agente</h1>
            <p className="text-muted-foreground">
              Ajuste o template escolhido ao seu gosto
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setStep("template")}
          >
            Trocar Template
          </Button>
        </div>

        {selectedTemplate && (
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <span className="text-xl">{selectedTemplate.icon}</span>
                <div>
                  <p className="font-semibold">Template: {selectedTemplate.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                  {formData.systemPrompt.length} caracteres (mínimo 50)
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
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setStep("template")}
            >
              Voltar
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

