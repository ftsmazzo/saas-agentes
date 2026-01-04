import { trpc } from "@/lib/trpc";
import ClientLayout from "@/components/ClientLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageSquare, Coins, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export default function MetricsPage() {
  const { data: metrics, isLoading } = trpc.metrics.getMyMetrics.useQuery();
  const { data: credits, isLoading: isLoadingCredits, error: creditsError } = trpc.metrics.getMyCredits.useQuery(undefined, {
    retry: 1,
    refetchOnWindowFocus: false,
  });
  const { data: usageTransactions, isLoading: isLoadingTransactions } = trpc.metrics.getMyUsageTransactions.useQuery({
    limit: 10,
  }, {
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const stats = [
    {
      title: "Total de Conversas",
      value: metrics?.totalConversations || 0,
      description: "Conversas iniciadas",
      icon: MessageSquare,
      color: "text-blue-600",
    },
    {
      title: "Total de Mensagens",
      value: metrics?.totalMessages || 0,
      description: "Mensagens trocadas (cliente + agente)",
      icon: MessageSquare,
      color: "text-purple-600",
    },
  ];

  if (isLoading || isLoadingCredits) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </ClientLayout>
    );
  }

  // Calcular percentual de uso de créditos
  const monthlyCredits = credits?.monthlyCredits || 0;
  const currentCredits = credits?.currentCredits || 0;
  const totalUsed = credits?.totalCreditsUsed || 0;
  const totalPurchased = credits?.totalCreditsPurchased || 0;
  
  // Calcular uso deste mês (considerando que pode ter comprado créditos extras)
  // Se currentCredits > monthlyCredits, significa que comprou extras
  // Uso mensal = monthlyCredits - (currentCredits - extras comprados)
  // Simplificando: se currentCredits <= monthlyCredits, usou (monthlyCredits - currentCredits)
  // Se currentCredits > monthlyCredits, não usou nada do plano mensal ainda
  const creditsUsedThisMonth = currentCredits <= monthlyCredits 
    ? monthlyCredits - currentCredits 
    : 0;
  const usagePercentage = monthlyCredits > 0 
    ? Math.min((creditsUsedThisMonth / monthlyCredits) * 100, 100) 
    : 0;

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Métricas de Uso</h1>
          <p className="text-muted-foreground">
            Acompanhe o desempenho e uso do seu agente de IA
          </p>
        </div>

        {/* Seção de Créditos - Sempre mostra, mesmo se não tiver dados ainda */}
        <Card className="border-primary/20">
          <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-yellow-500" />
                Créditos Disponíveis
              </CardTitle>
              <CardDescription>
                Acompanhe seu consumo de créditos mensais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Saldo Atual */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Créditos Disponíveis</span>
                    <Badge variant="outline" className="text-lg font-bold">
                      {currentCredits.toLocaleString('pt-BR')}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Créditos Mensais</span>
                    <span className="text-sm font-semibold">
                      {monthlyCredits.toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Total Utilizado</span>
                    <span className="text-sm font-semibold text-orange-600">
                      {totalUsed.toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Barra de Progresso */}
              {monthlyCredits > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Uso Mensal</span>
                    <span className="text-muted-foreground">
                      {creditsUsedThisMonth.toLocaleString('pt-BR')} / {monthlyCredits.toLocaleString('pt-BR')} créditos
                      ({usagePercentage.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress value={usagePercentage} className="h-3" />
                  {usagePercentage > 80 && (
                    <p className="text-xs text-orange-600 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Você está usando mais de 80% dos seus créditos mensais
                    </p>
                  )}
                </div>
              )}

              {/* Últimas Transações */}
              {usageTransactions && usageTransactions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Últimas Transações</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {usageTransactions.slice(0, 5).map((transaction: any) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-2 rounded-lg border bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col">
                            <span className="text-xs font-medium capitalize">
                              {transaction.operation === 'chat' ? '💬 Chat' :
                               transaction.operation === 'audio' ? '🎤 Áudio' :
                               transaction.operation === 'image' ? '🖼️ Imagem' :
                               transaction.operation === 'pdf' ? '📄 PDF' :
                               transaction.operation}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {transaction.model} • {new Date(transaction.createdAt).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-red-600">
                            -{transaction.creditsUsed || 0}
                          </span>
                          <Coins className="h-4 w-4 text-yellow-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Mensagem de erro se houver */}
              {creditsError && (
                <Alert className="mt-4">
                  <AlertDescription className="text-red-600">
                    Erro ao carregar créditos: {creditsError.message}
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Mensagem de erro se houver */}
              {creditsError && (
                <Alert className="mt-4">
                  <AlertDescription className="text-red-600">
                    Erro ao carregar créditos: {creditsError.message}
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Mensagem se ainda não tiver créditos */}
              {!isLoadingCredits && !credits && !creditsError && (
                <Alert className="mt-4">
                  <AlertDescription>
                    Seus créditos serão exibidos aqui após a primeira utilização do agente.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

        {/* Stats Cards - Apenas métricas essenciais */}
        <div className="grid gap-4 md:grid-cols-2">
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
      </div>
    </ClientLayout>
  );
}
