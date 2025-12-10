import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  Circle, 
  AlertCircle, 
  BookOpen, 
  Rocket,
  Settings,
  CreditCard,
  Workflow,
  Database
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useEffect } from "react";

export default function WelcomePage() {
  const [, setLocation] = useLocation();
  const { data: isSetupCompleted, isLoading } = trpc.config.isSetupCompleted.useQuery();

  // Redirect to setup wizard if not completed (usando useEffect para evitar erro de render)
  useEffect(() => {
    if (!isLoading && !isSetupCompleted) {
      setLocation("/admin/setup");
    }
  }, [isLoading, isSetupCompleted, setLocation]);

  // Mostrar loading enquanto verifica
  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Verificando configuração...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // TODO: Implementar verificação real do status de configuração
  const configStatus = {
    stripe: true,
    n8n: true,
    postgresql: true,
    plans: true,
  };

  const allConfigured = Object.values(configStatus).every(Boolean);

  const steps = [
    {
      id: "stripe",
      title: "Configurar Stripe",
      description: "Configure os produtos e preços no Stripe Dashboard",
      icon: CreditCard,
      completed: configStatus.stripe,
      link: "/admin/settings",
      guideSection: "#integração-com-stripe",
    },
    {
      id: "n8n",
      title: "Integrar N8N",
      description: "Configure a API do N8N e crie o workflow template",
      icon: Workflow,
      completed: configStatus.n8n,
      link: "/admin/settings",
      guideSection: "#integração-com-n8n",
    },
    {
      id: "postgresql",
      title: "Configurar PostgreSQL Master",
      description: "Configure o servidor PostgreSQL para provisionar bancos dos clientes",
      icon: Database,
      completed: configStatus.postgresql,
      link: "/admin/settings",
      guideSection: "#configuração-do-postgresql-master",
    },
    {
      id: "plans",
      title: "Criar Planos",
      description: "Cadastre os planos de assinatura no banco de dados",
      icon: Settings,
      completed: configStatus.plans,
      link: "/admin/plans",
      guideSection: "#gerenciamento-de-planos-e-assinaturas",
    },
  ];

  const completedSteps = steps.filter(s => s.completed).length;
  const progress = (completedSteps / steps.length) * 100;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bem-vindo ao SaaS de Agentes! 🎉</h1>
          <p className="text-muted-foreground mt-2">
            Siga os passos abaixo para configurar sua plataforma e começar a provisionar clientes
          </p>
        </div>

        {!allConfigured && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Configuração Necessária</AlertTitle>
            <AlertDescription>
              Você precisa completar a configuração inicial antes de criar clientes. 
              Siga o checklist abaixo e consulte o guia completo para instruções detalhadas.
            </AlertDescription>
          </Alert>
        )}

        {allConfigured && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-900">Tudo Pronto!</AlertTitle>
            <AlertDescription className="text-green-800">
              Sua plataforma está configurada e pronta para uso. Você já pode criar seu primeiro cliente!
            </AlertDescription>
          </Alert>
        )}

        {/* Progress Bar */}
        <Card>
          <CardHeader>
            <CardTitle>Progresso da Configuração</CardTitle>
            <CardDescription>
              {completedSteps} de {steps.length} etapas concluídas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full bg-secondary rounded-full h-3">
              <div 
                className="bg-primary h-3 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {progress.toFixed(0)}% completo
            </p>
          </CardContent>
        </Card>

        {/* Checklist */}
        <Card>
          <CardHeader>
            <CardTitle>Checklist de Configuração</CardTitle>
            <CardDescription>
              Complete estas etapas para começar a usar a plataforma
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const StatusIcon = step.completed ? CheckCircle2 : Circle;
              
              return (
                <div 
                  key={step.id}
                  className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="mt-1">
                    <StatusIcon 
                      className={`h-6 w-6 ${
                        step.completed ? "text-green-600" : "text-muted-foreground"
                      }`} 
                    />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold">
                        {index + 1}. {step.title}
                      </h3>
                      {step.completed && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Concluído
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {step.description}
                    </p>
                    <div className="flex gap-2">
                      <Link href={step.link}>
                        <Button size="sm" variant="outline">
                          Ir para Configurações
                        </Button>
                      </Link>
                      <a 
                        href={`/GUIA_DE_USO.md${step.guideSection}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button size="sm" variant="ghost">
                          <BookOpen className="h-4 w-4 mr-2" />
                          Ver Guia
                        </Button>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📚 Guia Completo</CardTitle>
              <CardDescription>
                Documentação detalhada com instruções passo a passo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a 
                href="/GUIA_DE_USO.md"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="w-full">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Abrir Guia de Uso
                </Button>
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🚀 Criar Primeiro Cliente</CardTitle>
              <CardDescription>
                {allConfigured 
                  ? "Tudo pronto! Crie seu primeiro cliente agora"
                  : "Complete a configuração antes de criar clientes"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/tenants">
                <Button 
                  className="w-full" 
                  disabled={!allConfigured}
                >
                  <Rocket className="h-4 w-4 mr-2" />
                  {allConfigured ? "Criar Cliente" : "Configuração Pendente"}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Help Section */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">💡 Precisa de Ajuda?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>1. Consulte o Guia de Uso:</strong> Documento completo com todas as instruções
            </p>
            <p>
              <strong>2. Verifique os Logs:</strong> Acesse <Link href="/admin/logs"><span className="text-primary hover:underline">Logs</span></Link> para ver eventos e erros
            </p>
            <p>
              <strong>3. Teste as Integrações:</strong> Use a página de <Link href="/admin/settings"><span className="text-primary hover:underline">Configurações</span></Link> para validar conexões
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
