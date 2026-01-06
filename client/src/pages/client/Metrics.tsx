import { useState } from "react";
import { trpc } from "@/lib/trpc";
import ClientLayout from "@/components/ClientLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MessageSquare, Coins, TrendingUp, AlertTriangle, AlertCircle, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function MetricsPage() {
  const [operationFilter, setOperationFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 20;

  const { data: metrics, isLoading } = trpc.metrics.getMyMetrics.useQuery();
  const { data: credits, isLoading: isLoadingCredits, error: creditsError, refetch: refetchCredits } = trpc.metrics.getMyCredits.useQuery(undefined, {
    retry: 1,
    refetchOnWindowFocus: true, // Atualizar quando voltar à janela
    refetchInterval: 30000, // Refetch a cada 30 segundos
  });
  const { data: usageTransactions, isLoading: isLoadingTransactions } = trpc.metrics.getMyUsageTransactions.useQuery({
    limit: pageSize,
    offset: currentPage * pageSize,
    operation: operationFilter !== "all" ? operationFilter as "chat" | "audio" | "image" | "format" | "pdf" : undefined,
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
  
  // Créditos disponíveis (saldo atual)
  const creditsAvailable = currentCredits;
  
  // Uso deste mês (vem do backend, calculado somando transações do mês)
  const creditsUsedThisMonth = credits?.creditsUsedThisMonth || 0;
  
  // Total de créditos disponíveis no início do mês (mensais + comprados)
  // Se currentCredits + creditsUsedThisMonth > monthlyCredits, há créditos extras comprados
  const totalCreditsAvailable = Math.max(monthlyCredits, currentCredits + creditsUsedThisMonth);
  
  // Percentual de uso (baseado no total de créditos disponíveis: mensais + comprados)
  const usagePercentage = totalCreditsAvailable > 0 
    ? Math.min((creditsUsedThisMonth / totalCreditsAvailable) * 100, 100) 
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
              {/* Saldo Atual - Alinhado e proporcional */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex flex-col items-center justify-center p-4 rounded-lg border bg-muted/30">
                  <span className="text-xs font-medium text-muted-foreground mb-2">Créditos Disponíveis</span>
                  <Badge variant="outline" className="text-2xl font-bold px-4 py-2">
                    {creditsAvailable.toLocaleString('pt-BR')}
                  </Badge>
                </div>
                <div className="flex flex-col items-center justify-center p-4 rounded-lg border bg-muted/30">
                  <span className="text-xs font-medium text-muted-foreground mb-2">Créditos Mensais</span>
                  <span className="text-2xl font-bold">
                    {monthlyCredits.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center p-4 rounded-lg border bg-muted/30">
                  <span className="text-xs font-medium text-muted-foreground mb-2">Utilizados Este Mês</span>
                  <span className="text-2xl font-bold text-orange-600">
                    {creditsUsedThisMonth.toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              {/* Barra de Progresso */}
              {totalCreditsAvailable > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Uso Mensal</span>
                    <span className="text-muted-foreground">
                      {creditsUsedThisMonth.toLocaleString('pt-BR')} / {totalCreditsAvailable.toLocaleString('pt-BR')} créditos
                      ({usagePercentage.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress value={usagePercentage} className="h-3" />
                  {usagePercentage > 80 && (
                    <p className="text-xs text-orange-600 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Você está usando mais de 80% dos seus créditos disponíveis
                    </p>
                  )}
                </div>
              )}

              {/* Histórico de Transações - Melhorado */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Histórico de Transações</h4>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={operationFilter} onValueChange={(value) => { setOperationFilter(value); setCurrentPage(0); }}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Filtrar por tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os tipos</SelectItem>
                        <SelectItem value="chat">💬 Chat</SelectItem>
                        <SelectItem value="audio">🎤 Áudio</SelectItem>
                        <SelectItem value="image">🖼️ Imagem</SelectItem>
                        <SelectItem value="pdf">📄 PDF</SelectItem>
                        <SelectItem value="format">📝 Formatação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {isLoadingTransactions ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : usageTransactions && usageTransactions.length > 0 ? (
                  <>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {usageTransactions.map((transaction: any) => (
                        <div
                          key={transaction.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium capitalize">
                                  {transaction.operation === 'chat' ? '💬 Chat' :
                                   transaction.operation === 'audio' ? '🎤 Áudio' :
                                   transaction.operation === 'image' ? '🖼️ Imagem' :
                                   transaction.operation === 'pdf' ? '📄 PDF' :
                                   transaction.operation === 'format' ? '📝 Formatação' :
                                   transaction.operation}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {transaction.model}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span>
                                  {new Date(transaction.createdAt).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                                {transaction.totalTokens > 0 && (
                                  <span>• {transaction.totalTokens.toLocaleString('pt-BR')} tokens</span>
                                )}
                              </div>
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

                    {/* Paginação */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="text-sm text-muted-foreground">
                        Página {currentPage + 1} • {usageTransactions.length} transações
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                          disabled={currentPage === 0 || isLoadingTransactions}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Anterior
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={usageTransactions.length < pageSize || isLoadingTransactions}
                        >
                          Próxima
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Coins className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma transação encontrada</p>
                    {operationFilter !== "all" && (
                      <p className="text-xs mt-1">Tente alterar o filtro</p>
                    )}
                  </div>
                )}
              </div>
              
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
