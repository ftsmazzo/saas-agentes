import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import ClientLayout from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { 
  Save, 
  Bot, 
  Settings, 
  Calendar, 
  FileText, 
  MessageSquare,
  Database,
  MapPin,
  Search,
  Loader2,
  CheckCircle2,
  Clock,
  Sparkles
} from "lucide-react";
import AgentConfigAssistant from "@/components/AgentConfigAssistant";

// Tools disponíveis baseados no workflow N8N
const AVAILABLE_TOOLS = [
  {
    id: "agentSQL",
    name: "Agente SQL",
    description: "Consultas a banco de dados para extrair dados quantitativos",
    icon: Database,
    enabled: true,
  },
  {
    id: "agentTerritorio",
    name: "Agente Território",
    description: "Identificação de CRAS e abrangência territorial",
    icon: MapPin,
    enabled: true,
  },
  {
    id: "vectorRAG",
    name: "Vector (RAG)",
    description: "Consulta a documentos e base de conhecimento",
    icon: Search,
    enabled: false,
  },
  {
    id: "buscaEndereco",
    name: "Busca Endereço",
    description: "Consulta ViaCEP para obter dados de endereço",
    icon: MapPin,
    enabled: true,
  },
  {
    id: "scheduling",
    name: "Agendamento",
    description: "Sistema de agendamentos e calendário",
    icon: Calendar,
    enabled: false,
  },
];

export default function AgentConfigUnifiedPage() {
  const { data: config, isLoading } = trpc.agent.getConfig.useQuery();
  const utils = trpc.useUtils();
  
  const [showAssistant, setShowAssistant] = useState(false);
  const [assistantComplete, setAssistantComplete] = useState(false);

  const [formData, setFormData] = useState({
    systemPrompt: "",
    welcomeMessage: "",
    companyInfo: "",
    enableHumanHandoff: true,
    enableAudioTranscription: true,
    enableImageProcessing: true,
    // Tools config
    toolsConfig: {
      enabledTools: [] as string[],
      toolSettings: {} as Record<string, any>,
    },
    // Scheduling config
    schedulingConfig: {
      enabled: false,
      settings: {
        businessHours: { start: "09:00", end: "18:00" },
        timezone: "America/Sao_Paulo",
        availableDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      },
    },
    // RAG config
    ragConfig: {
      enabled: false,
      kbId: "",
      apiUrl: "",
    },
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
        toolsConfig: config.toolsConfig 
          ? JSON.parse(config.toolsConfig) 
          : { enabledTools: [], toolSettings: {} },
        schedulingConfig: config.schedulingConfig
          ? JSON.parse(config.schedulingConfig)
          : { enabled: false, settings: {} },
        ragConfig: config.ragConfig
          ? JSON.parse(config.ragConfig)
          : { enabled: false, kbId: "", apiUrl: "" },
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
    updateMutation.mutate({
      systemPrompt: formData.systemPrompt,
      welcomeMessage: formData.welcomeMessage,
      companyInfo: formData.companyInfo,
      enableHumanHandoff: formData.enableHumanHandoff,
      enableAudioTranscription: formData.enableAudioTranscription,
      enableImageProcessing: formData.enableImageProcessing,
      toolsConfig: JSON.stringify(formData.toolsConfig),
      schedulingConfig: JSON.stringify(formData.schedulingConfig),
      ragConfig: JSON.stringify(formData.ragConfig),
    });
  };

  const toggleTool = (toolId: string) => {
    const enabledTools = formData.toolsConfig.enabledTools || [];
    const newEnabledTools = enabledTools.includes(toolId)
      ? enabledTools.filter(id => id !== toolId)
      : [...enabledTools, toolId];
    
    setFormData({
      ...formData,
      toolsConfig: {
        ...formData.toolsConfig,
        enabledTools: newEnabledTools,
      },
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuração do Agente</h1>
          <p className="text-muted-foreground">
            Personalize o comportamento e configure as ferramentas do seu agente de IA
          </p>
        </div>

        {/* Se não houver configuração OU não houver systemPrompt, mostrar assistente diretamente */}
        {(!config || !config.systemPrompt) && (
          <div className="mb-6">
            <AgentConfigAssistant
              onComplete={() => {
                setShowAssistant(false);
                setAssistantComplete(true);
                utils.agent.getConfig.invalidate();
                toast.success('Configuração concluída! Agora você pode conectar o WhatsApp e ativar o agente.');
              }}
            />
          </div>
        )}

        {/* Se houver config mas sem systemPrompt, mostrar botão para iniciar assistente (não deve aparecer se já estiver mostrando o assistente acima) */}
        {config && !config.systemPrompt && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    Configure seu Agente com Assistente de IA
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Responda algumas perguntas simples e nosso assistente criará um agente personalizado para você
                  </p>
                  <Button
                    onClick={() => setShowAssistant(true)}
                    size="lg"
                    className="w-full sm:w-auto"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Começar Configuração Guiada
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Assistente de IA (quando usuário clica no botão) */}
        {showAssistant && !assistantComplete && (
          <div className="mb-6">
            <AgentConfigAssistant
              onComplete={() => {
                setShowAssistant(false);
                setAssistantComplete(true);
                utils.agent.getConfig.invalidate();
                toast.success('Configuração concluída! Você pode revisar e ajustar abaixo.');
              }}
            />
          </div>
        )}

        {/* Mostrar mensagem se já configurado */}
        {config?.systemPrompt && !showAssistant && (
          <Alert className="mb-6">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Seu agente já está configurado. Você pode editar as configurações abaixo ou usar o assistente novamente.
            </AlertDescription>
          </Alert>
        )}

        {/* Só mostrar tabs e formulário se houver configuração ou se o assistente foi completado */}
        {(config || assistantComplete) && (
          <>
          <Tabs defaultValue="basic" className="space-y-6">
          <TabsList>
            <TabsTrigger value="basic">Básico</TabsTrigger>
            <TabsTrigger value="tools">Tools/Especialistas</TabsTrigger>
            <TabsTrigger value="scheduling">Agendamento</TabsTrigger>
            <TabsTrigger value="rag">RAG</TabsTrigger>
            <TabsTrigger value="features">Funcionalidades</TabsTrigger>
          </TabsList>

          {/* Aba Básico */}
          <TabsContent value="basic" className="space-y-6">
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
                    placeholder="O prompt do sistema será gerado automaticamente pelo assistente de IA..."
                    rows={10}
                    className="resize-none font-mono text-sm"
                    readOnly={!!config?.systemPrompt}
                  />
                  {config?.systemPrompt && (
                    <p className="text-sm text-muted-foreground">
                      ℹ️ O prompt do sistema foi gerado automaticamente e não pode ser editado diretamente. Use o assistente de IA para reconfigurar.
                    </p>
                  )}
                </div>

                {/* Mensagem de Boas-Vindas e Company Info são preenchidos automaticamente pelo assistente de IA */}
                {config?.welcomeMessage && (
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
                    <p className="text-sm text-muted-foreground">
                      ℹ️ Esta mensagem foi gerada automaticamente pelo assistente de IA. Você pode editá-la se desejar.
                    </p>
                  </div>
                )}

                {config?.companyInfo && (
                  <div className="space-y-2">
                    <Label htmlFor="companyInfo">Informações da Empresa</Label>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">
                        As informações da empresa foram preenchidas automaticamente pelo assistente de IA:
                      </p>
                      <pre className="text-xs font-mono bg-background p-3 rounded border overflow-auto">
                        {formData.companyInfo || '{}'}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Tools/Especialistas */}
          <TabsContent value="tools" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Agentes Especialistas / Tools
                </CardTitle>
                <CardDescription>
                  Ative ou desative as ferramentas que o agente pode usar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {AVAILABLE_TOOLS.map((tool) => {
                  const Icon = tool.icon;
                  const isEnabled = formData.toolsConfig.enabledTools?.includes(tool.id) || tool.enabled;
                  
                  return (
                    <div
                      key={tool.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="flex items-center gap-2">
                            <Label className="font-semibold">{tool.name}</Label>
                            {isEnabled && (
                              <Badge variant="outline" className="text-green-600">
                                Ativo
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {tool.description}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={() => toggleTool(tool.id)}
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Agendamento */}
          <TabsContent value="scheduling" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Configuração de Agendamento
                </CardTitle>
                <CardDescription>
                  Configure os dados de agendamento que o agente usará
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Ativar Agendamento</Label>
                    <p className="text-sm text-muted-foreground">
                      Permite que o agente gerencie agendamentos
                    </p>
                  </div>
                  <Switch
                    checked={formData.schedulingConfig.enabled}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        schedulingConfig: {
                          ...formData.schedulingConfig,
                          enabled: checked,
                        },
                      })
                    }
                  />
                </div>

                {formData.schedulingConfig.enabled && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Horário de Início</Label>
                        <Input
                          type="time"
                          value={formData.schedulingConfig.settings?.businessHours?.start || "09:00"}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              schedulingConfig: {
                                ...formData.schedulingConfig,
                                settings: {
                                  ...formData.schedulingConfig.settings,
                                  businessHours: {
                                    ...formData.schedulingConfig.settings?.businessHours,
                                    start: e.target.value,
                                  },
                                },
                              },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Horário de Fim</Label>
                        <Input
                          type="time"
                          value={formData.schedulingConfig.settings?.businessHours?.end || "18:00"}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              schedulingConfig: {
                                ...formData.schedulingConfig,
                                settings: {
                                  ...formData.schedulingConfig.settings,
                                  businessHours: {
                                    ...formData.schedulingConfig.settings?.businessHours,
                                    end: e.target.value,
                                  },
                                },
                              },
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Fuso Horário</Label>
                      <Input
                        value={formData.schedulingConfig.settings?.timezone || "America/Sao_Paulo"}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            schedulingConfig: {
                              ...formData.schedulingConfig,
                              settings: {
                                ...formData.schedulingConfig.settings,
                                timezone: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="America/Sao_Paulo"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba RAG */}
          <TabsContent value="rag" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Base de Conhecimento (RAG)
                </CardTitle>
                <CardDescription>
                  Configure e visualize sua base de conhecimento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Ativar RAG</Label>
                    <p className="text-sm text-muted-foreground">
                      Permite que o agente consulte documentos e base de conhecimento
                    </p>
                  </div>
                  <Switch
                    checked={formData.ragConfig.enabled}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        ragConfig: {
                          ...formData.ragConfig,
                          enabled: checked,
                        },
                      })
                    }
                  />
                </div>

                {formData.ragConfig.enabled && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label>URL da API RAG</Label>
                      <Input
                        value={formData.ragConfig.apiUrl}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            ragConfig: {
                              ...formData.ragConfig,
                              apiUrl: e.target.value,
                            },
                          })
                        }
                        placeholder="https://sistemarag.fabricadosdados.online/api/kb"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>ID da Base de Conhecimento</Label>
                      <Input
                        value={formData.ragConfig.kbId}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            ragConfig: {
                              ...formData.ragConfig,
                              kbId: e.target.value,
                            },
                          })
                        }
                        placeholder="300001"
                      />
                    </div>

                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4" />
                        <span className="font-semibold">Documentos</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Visualização de documentos será implementada em breve
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Funcionalidades */}
          <TabsContent value="features" className="space-y-6">
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
          </TabsContent>
        </Tabs>

        {/* Botão de Salvar */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            size="lg"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Configurações
              </>
            )}
          </Button>
        </div>
        </>
        )}
      </div>
    </ClientLayout>
  );
}

