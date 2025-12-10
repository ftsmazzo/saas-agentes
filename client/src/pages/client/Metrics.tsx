import { trpc } from "@/lib/trpc";
import ClientLayout from "@/components/ClientLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Zap, CheckCircle, XCircle } from "lucide-react";

export default function MetricsPage() {
  const { data: metrics, isLoading } = trpc.metrics.getMyMetrics.useQuery();

  const stats = [
    {
      title: "Total de Conversas",
      value: metrics?.currentMonth?.totalConversations || 0,
      description: "Conversas iniciadas este mês",
      icon: MessageSquare,
      color: "text-blue-600",
    },
    {
      title: "Total de Mensagens",
      value: metrics?.currentMonth?.totalMessages || 0,
      description: "Mensagens processadas",
      icon: MessageSquare,
      color: "text-purple-600",
    },
    {
      title: "Execuções do Workflow",
      value: metrics?.workflowStats?.totalExecutions || 0,
      description: "Execuções do agente N8N",
      icon: Zap,
      color: "text-yellow-600",
    },
    {
      title: "Taxa de Sucesso",
      value: metrics?.workflowStats
        ? `${Math.round(
            ((metrics.workflowStats.successfulExecutions || 0) /
              (metrics.workflowStats.totalExecutions || 1)) *
              100
          )}%`
        : "0%",
      description: "Execuções bem-sucedidas",
      icon: CheckCircle,
      color: "text-green-600",
    },
  ];

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
          <h1 className="text-3xl font-bold tracking-tight">Métricas de Uso</h1>
          <p className="text-muted-foreground">
            Acompanhe o desempenho e uso do seu agente de IA
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Workflow Statistics */}
        {metrics?.workflowStats && (
          <Card>
            <CardHeader>
              <CardTitle>Estatísticas do Workflow N8N</CardTitle>
              <CardDescription>
                Detalhes sobre as execuções do seu agente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium">Execuções Bem-Sucedidas</p>
                      <p className="text-xs text-muted-foreground">
                        Workflows completados sem erros
                      </p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-green-600">
                    {metrics.workflowStats.successfulExecutions}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-4 border-b">
                  <div className="flex items-center gap-3">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="text-sm font-medium">Execuções com Falha</p>
                      <p className="text-xs text-muted-foreground">
                        Workflows interrompidos por erros
                      </p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-red-600">
                    {metrics.workflowStats.failedExecutions}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Zap className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium">Total de Execuções</p>
                      <p className="text-xs text-muted-foreground">
                        Todas as execuções registradas
                      </p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-blue-600">
                    {metrics.workflowStats.totalExecutions}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Monthly Usage */}
        {metrics?.currentMonth && (
          <Card>
            <CardHeader>
              <CardTitle>Uso Mensal</CardTitle>
              <CardDescription>
                Período: {new Date(metrics.currentMonth.periodStart).toLocaleDateString("pt-BR")} -{" "}
                {new Date(metrics.currentMonth.periodEnd).toLocaleDateString("pt-BR")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Chamadas à API OpenAI</span>
                  <span className="text-sm text-muted-foreground">
                    {metrics.currentMonth.apiCallsOpenAI || 0}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Armazenamento Utilizado</span>
                  <span className="text-sm text-muted-foreground">
                    {metrics.currentMonth.storageUsedMB || 0} MB
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Execuções de Workflow</span>
                  <span className="text-sm text-muted-foreground">
                    {metrics.currentMonth.workflowExecutions || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!metrics && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">
                Nenhuma métrica disponível ainda. Comece a usar seu agente para ver as estatísticas.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </ClientLayout>
  );
}
