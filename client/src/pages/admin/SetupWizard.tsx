import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  CreditCard,
  Workflow,
  Rocket,
  DollarSign
} from "lucide-react";
import { useLocation } from "wouter";

type Step = "n8n" | "stripe" | "plan" | "complete";

export default function SetupWizard() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState<Step>("n8n");
  
  // N8N State
  const [n8nUrl, setN8nUrl] = useState("");
  const [n8nApiKey, setN8nApiKey] = useState("");
  const [n8nWorkflowId, setN8nWorkflowId] = useState("");
  const [n8nTested, setN8nTested] = useState(false);

  // Stripe State
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState("");

  // Plan State
  const [planName, setPlanName] = useState("");
  const [planDescription, setPlanDescription] = useState("");
  const [planStripePriceId, setPlanStripePriceId] = useState("");
  const [planPrice, setPlanPrice] = useState("");

  const testN8NMutation = trpc.config.testN8N.useMutation();
  const saveN8NMutation = trpc.config.saveN8N.useMutation();
  const saveStripeMutation = trpc.config.saveStripe.useMutation();
  const createPlanMutation = trpc.plans.create.useMutation();

  const steps: { id: Step; title: string; icon: React.ReactNode }[] = [
    { id: "n8n", title: "Configurar N8N", icon: <Workflow className="h-5 w-5" /> },
    { id: "stripe", title: "Configurar Stripe", icon: <CreditCard className="h-5 w-5" /> },
    { id: "plan", title: "Criar Plano", icon: <DollarSign className="h-5 w-5" /> },
    { id: "complete", title: "Concluído", icon: <Rocket className="h-5 w-5" /> },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleTestN8N = async () => {
    try {
      await testN8NMutation.mutateAsync({ apiUrl: n8nUrl, apiKey: n8nApiKey });
      setN8nTested(true);
      toast.success("Conexão com N8N testada com sucesso!");
    } catch (error) {
      toast.error("Falha ao conectar com N8N. Verifique as credenciais.");
    }
  };

  const handleSaveN8N = async () => {
    if (!n8nTested) {
      toast.error("Por favor, teste a conexão primeiro");
      return;
    }

    try {
      await saveN8NMutation.mutateAsync({
        apiUrl: n8nUrl,
        apiKey: n8nApiKey,
        templateWorkflowId: n8nWorkflowId,
      });
      toast.success("Configurações N8N salvas!");
      setCurrentStep("stripe");
    } catch (error) {
      toast.error("Erro ao salvar configurações N8N");
    }
  };

  const handleSaveStripe = async () => {
    try {
      await saveStripeMutation.mutateAsync({
        secretKey: stripeSecretKey,
        webhookSecret: stripeWebhookSecret,
      });
      toast.success("Configurações Stripe salvas!");
      setCurrentStep("plan");
    } catch (error) {
      toast.error("Erro ao salvar configurações Stripe");
    }
  };

  const handleCreatePlan = async () => {
    try {
      await createPlanMutation.mutateAsync({
        name: planName,
        description: planDescription,
        stripePriceId: planStripePriceId,
        priceMonthly: parseInt(planPrice) * 100, // Converter para centavos
      });
      toast.success("Plano criado com sucesso!");
      setCurrentStep("complete");
    } catch (error) {
      toast.error("Erro ao criar plano");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Assistente de Configuração</h1>
          <p className="text-gray-600">Configure sua plataforma SaaS em poucos passos</p>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full ${
                      index <= currentStepIndex
                        ? "bg-primary text-primary-foreground"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {step.icon}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-12 h-1 mx-2 ${
                        index < currentStepIndex ? "bg-primary" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-gray-600 mt-2 text-center">
              Passo {currentStepIndex + 1} de {steps.length}
            </p>
          </CardContent>
        </Card>

        {currentStep === "n8n" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Workflow className="h-6 w-6" />
                Configurar N8N
              </CardTitle>
              <CardDescription>
                Configure a conexão com a API do N8N para provisionamento de workflows
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="n8n-url">URL da API do N8N *</Label>
                <Input
                  id="n8n-url"
                  type="text"
                  placeholder="https://seu-n8n.exemplo.com"
                  value={n8nUrl}
                  onChange={(e) => setN8nUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Variável de ambiente: N8N_API_URL
                </p>
              </div>

              <div>
                <Label htmlFor="n8n-key">API Key *</Label>
                <Input
                  id="n8n-key"
                  type="password"
                  placeholder="Sua API Key do N8N"
                  value={n8nApiKey}
                  onChange={(e) => setN8nApiKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Variável de ambiente: N8N_API_KEY
                </p>
              </div>

              <div>
                <Label htmlFor="n8n-workflow">ID do Workflow Template *</Label>
                <Input
                  id="n8n-workflow"
                  type="text"
                  placeholder="123"
                  value={n8nWorkflowId}
                  onChange={(e) => setN8nWorkflowId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  ID do workflow master que será clonado para cada cliente
                </p>
              </div>

              {n8nTested && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Conexão com N8N testada com sucesso!
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleTestN8N}
                  variant="outline"
                  disabled={!n8nUrl || !n8nApiKey || testN8NMutation.isPending}
                >
                  {testN8NMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Testar Conexão
                </Button>
                <Button
                  onClick={handleSaveN8N}
                  disabled={!n8nTested || !n8nWorkflowId || saveN8NMutation.isPending}
                  className="flex-1"
                >
                  {saveN8NMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar e Continuar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === "stripe" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-6 w-6" />
                Configurar Stripe
              </CardTitle>
              <CardDescription>
                Configure as credenciais do Stripe para processar pagamentos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Você precisa criar produtos e preços no Stripe Dashboard antes de continuar.
                </AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="stripe-secret">Secret Key *</Label>
                <Input
                  id="stripe-secret"
                  type="password"
                  placeholder="sk_test_..."
                  value={stripeSecretKey}
                  onChange={(e) => setStripeSecretKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Encontre em: Stripe Dashboard → Developers → API Keys
                </p>
              </div>

              <div>
                <Label htmlFor="stripe-webhook">Webhook Secret *</Label>
                <Input
                  id="stripe-webhook"
                  type="password"
                  placeholder="whsec_..."
                  value={stripeWebhookSecret}
                  onChange={(e) => setStripeWebhookSecret(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Crie um webhook apontando para: /api/stripe/webhook
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => setCurrentStep("n8n")} variant="outline">
                  Voltar
                </Button>
                <Button
                  onClick={handleSaveStripe}
                  disabled={!stripeSecretKey || !stripeWebhookSecret || saveStripeMutation.isPending}
                  className="flex-1"
                >
                  {saveStripeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar e Continuar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === "plan" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-6 w-6" />
                Criar Primeiro Plano
              </CardTitle>
              <CardDescription>
                Crie seu primeiro plano de assinatura
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="plan-name">Nome do Plano *</Label>
                <Input
                  id="plan-name"
                  type="text"
                  placeholder="Plano Básico"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="plan-desc">Descrição</Label>
                <Textarea
                  id="plan-desc"
                  placeholder="Descrição do plano..."
                  value={planDescription}
                  onChange={(e) => setPlanDescription(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="plan-price-id">Stripe Price ID *</Label>
                <Input
                  id="plan-price-id"
                  type="text"
                  placeholder="price_..."
                  value={planStripePriceId}
                  onChange={(e) => setPlanStripePriceId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Copie o Price ID do Stripe Dashboard
                </p>
              </div>

              <div>
                <Label htmlFor="plan-price">Preço Mensal (R$) *</Label>
                <Input
                  id="plan-price"
                  type="number"
                  placeholder="99"
                  value={planPrice}
                  onChange={(e) => setPlanPrice(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={() => setCurrentStep("stripe")} variant="outline">
                  Voltar
                </Button>
                <Button
                  onClick={handleCreatePlan}
                  disabled={
                    !planName ||
                    !planStripePriceId ||
                    !planPrice ||
                    createPlanMutation.isPending
                  }
                  className="flex-1"
                >
                  {createPlanMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Criar Plano e Finalizar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === "complete" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-6 w-6" />
                Configuração Concluída!
              </CardTitle>
              <CardDescription>
                Sua plataforma está pronta para uso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Rocket className="h-4 w-4" />
                <AlertDescription>
                  Parabéns! Você configurou com sucesso:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Integração com N8N</li>
                    <li>Processamento de pagamentos via Stripe</li>
                    <li>Primeiro plano de assinatura</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Próximos Passos:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                  <li>Acesse a página de Clientes para criar seu primeiro cliente</li>
                  <li>Configure o agente do cliente com prompt personalizado</li>
                  <li>Teste o workflow N8N clonado</li>
                </ol>
              </div>

              <Button onClick={() => setLocation("/admin")} className="w-full">
                Ir para o Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
