import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Save, Bot } from "lucide-react";
import { toast } from "sonner";

export default function AgentSettings() {
  const { data: config, isLoading } = trpc.clientPanel.getAgentConfig.useQuery();
  const [systemPrompt, setSystemPrompt] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  const updateMutation = trpc.clientPanel.updateAgentConfig.useMutation({
    onSuccess: () => {
      toast.success("Configuração atualizada com sucesso!");
      setHasChanges(false);
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  // Inicializar prompt quando carregar
  useState(() => {
    if (config?.systemPrompt && !systemPrompt) {
      setSystemPrompt(config.systemPrompt);
    }
  });

  const handleSave = () => {
    if (systemPrompt.length < 10) {
      toast.error("O prompt deve ter pelo menos 10 caracteres");
      return;
    }
    updateMutation.mutate({ systemPrompt });
  };

  const handleChange = (value: string) => {
    setSystemPrompt(value);
    setHasChanges(value !== config?.systemPrompt);
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Configuração do Agente</h1>
        <p className="text-muted-foreground mt-2">
          Configure o comportamento e personalidade do seu agente de IA
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Prompt do Sistema
          </CardTitle>
          <CardDescription>
            Defina como o agente deve se comportar e responder aos clientes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="systemPrompt">Instruções para o Agente</Label>
            <Textarea
              id="systemPrompt"
              value={systemPrompt || config?.systemPrompt || ""}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Ex: Você é um assistente virtual prestativo e profissional da empresa X. Responda de forma clara e objetiva, sempre mantendo um tom cordial..."
              className="min-h-[200px]"
            />
            <p className="text-sm text-muted-foreground">
              {systemPrompt.length} caracteres (mínimo 10)
            </p>
          </div>

          {hasChanges && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertDescription className="text-blue-800">
                Você tem alterações não salvas
              </AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={handleSave}
            disabled={updateMutation.isPending || !hasChanges}
            className="w-full gap-2"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Salvar Configuração
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Dicas para um Bom Prompt</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>Seja específico sobre o tom e personalidade do agente</li>
            <li>Inclua informações sobre sua empresa e produtos/serviços</li>
            <li>Defina limites do que o agente pode ou não fazer</li>
            <li>Especifique como lidar com perguntas fora do escopo</li>
            <li>Teste diferentes prompts para encontrar o melhor resultado</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
