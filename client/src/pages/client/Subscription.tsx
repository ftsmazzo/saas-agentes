import { useState } from "react";
import { trpc } from "@/lib/trpc";
import ClientLayout from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  CreditCard, 
  Check, 
  ExternalLink, 
  Coins, 
  ArrowUpRight, 
  Loader2,
  TrendingUp,
  Calendar,
  Zap
} from "lucide-react";
import { toast } from "sonner";
import CircularProgress from "@/components/CircularProgress";

export default function SubscriptionPage() {
  const { data: subscriptionInfo, isLoading: isLoadingSubscription, error: subscriptionError } = trpc.payment.getSubscriptionInfo.useQuery(undefined, {
    retry: 1,
    refetchOnWindowFocus: false,
  });
  const { data: credits, isLoading: isLoadingCredits } = trpc.metrics.getMyCredits.useQuery(undefined, {
    retry: 1,
    refetchOnWindowFocus: false,
  });
  const { data: allPlans } = trpc.plans.list.useQuery();
  const utils = trpc.useUtils();

  const [creditsAmount, setCreditsAmount] = useState(5000);
  const [showCreditsModal, setShowCreditsModal] = useState(false);

  const createCheckoutMutation = trpc.payment.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        toast.info("Redirecionando para o checkout...");
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (error) => {
      toast.error(`Erro ao criar checkout: ${error.message}`);
    },
  });

  const createPortalMutation = trpc.payment.createCustomerPortal.useMutation({
    onSuccess: (data) => {
      if (data.portalUrl) {
        toast.info("Abrindo portal do cliente...");
        window.location.href = data.portalUrl;
      }
    },
    onError: (error) => {
      toast.error(`Erro ao abrir portal: ${error.message}`);
    },
  });

  const purchaseCreditsMutation = trpc.metrics.purchaseExtraCredits.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        toast.info("Redirecionando para o pagamento...");
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      toast.error(`Erro ao criar checkout: ${error.message}`);
    },
  });

  const handleUpgrade = (planId: number) => {
    createCheckoutMutation.mutate({ planId });
  };

  const handleManageSubscription = () => {
    createPortalMutation.mutate();
  };

  const handlePurchaseCredits = () => {
    if (creditsAmount < 1000) {
      toast.error("Mínimo de 1.000 créditos");
      return;
    }
    purchaseCreditsMutation.mutate({ creditsAmount });
  };

  if (isLoadingSubscription || isLoadingCredits) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </ClientLayout>
    );
  }

  if (subscriptionError) {
    return (
      <ClientLayout>
        <Alert className="m-6">
          <AlertDescription className="text-red-600">
            Erro ao carregar informações da assinatura: {subscriptionError.message}
          </AlertDescription>
        </Alert>
      </ClientLayout>
    );
  }

  const currentPlan = subscriptionInfo?.plan;
  const monthlyCredits = credits?.monthlyCredits || 0;
  const currentCredits = credits?.currentCredits || 0;
  
  // Créditos disponíveis (saldo atual)
  const creditsAvailable = currentCredits;
  
  // Uso deste mês (vem do backend, calculado somando transações do mês)
  const creditsUsedThisMonth = credits?.creditsUsedThisMonth || 0;
  
  // Percentual de uso (baseado no uso do plano mensal)
  const creditsPercentage = monthlyCredits > 0 
    ? Math.min((creditsUsedThisMonth / monthlyCredits) * 100, 100) 
    : 0;

  // Filtrar planos disponíveis para upgrade (apenas planos superiores ao atual)
  const availablePlans = allPlans?.filter(plan => {
    if (!currentPlan) return true;
    return plan.id > currentPlan.id;
  }) || [];

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assinatura e Créditos</h1>
          <p className="text-muted-foreground">
            Gerencie seu plano, créditos e informações de pagamento
          </p>
        </div>

        {subscriptionInfo?.hasSubscription ? (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Card do Plano Atual */}
            <Card className="border-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Plano Atual
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {currentPlan?.name || 'N/A'}
                    </CardDescription>
                  </div>
                  <Badge 
                    variant={subscriptionInfo.status === "active" ? "default" : "secondary"}
                    className={
                      subscriptionInfo.status === "active"
                        ? "bg-green-600"
                        : subscriptionInfo.status === "past_due"
                        ? "bg-yellow-600"
                        : "bg-gray-600"
                    }
                  >
                    {subscriptionInfo.status === "active" ? "Ativo" : 
                     subscriptionInfo.status === "past_due" ? "Atrasado" : 
                     "Inativo"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Valor Mensal</span>
                    <span className="font-semibold">
                      R$ {((currentPlan?.priceMonthly || 0) / 100).toFixed(2)}
                    </span>
                  </div>
                  
                  {subscriptionInfo.currentPeriodEnd && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Próxima cobrança</span>
                      <span className="font-medium">
                        {new Date(subscriptionInfo.currentPeriodEnd).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  )}

                  {currentPlan?.monthlyCredits && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Créditos Mensais</span>
                      <span className="font-semibold text-primary">
                        {currentPlan.monthlyCredits.toLocaleString('pt-BR')}
                      </span>
                    </div>
                  )}
                </div>

                {subscriptionInfo.cancelAtPeriodEnd && (
                  <Alert className="bg-yellow-50 border-yellow-200">
                    <AlertDescription className="text-yellow-800">
                      Sua assinatura será cancelada no final do período atual.
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleManageSubscription}
                  disabled={createPortalMutation.isPending}
                  variant="outline"
                  className="w-full"
                >
                  {createPortalMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="mr-2 h-4 w-4" />
                  )}
                  Gerenciar Assinatura
                </Button>
              </CardContent>
            </Card>

            {/* Card de Créditos com Progresso Circular */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-yellow-500" />
                  Créditos Disponíveis
                </CardTitle>
                <CardDescription>
                  Consumo mensal de créditos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Progresso Circular */}
                <div className="flex items-center justify-center py-4">
                  <CircularProgress 
                    value={creditsPercentage} 
                    size={140}
                    strokeWidth={10}
                    className="text-primary"
                  >
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary">
                        {creditsAvailable.toLocaleString('pt-BR')}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        disponíveis
                      </div>
                    </div>
                  </CircularProgress>
                </div>

                {/* Estatísticas */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Usados este mês</span>
                    <span className="font-semibold text-orange-600">
                      {creditsUsedThisMonth.toLocaleString('pt-BR')} / {monthlyCredits.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total utilizado</span>
                    <span className="font-medium">
                      {(credits?.totalCreditsUsed || 0).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>

                {creditsPercentage > 80 && (
                  <Alert className="bg-orange-50 border-orange-200">
                    <TrendingUp className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                      Você está usando mais de 80% dos seus créditos mensais. Considere fazer upgrade ou comprar créditos extras.
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={() => setShowCreditsModal(true)}
                  className="w-full"
                  variant="default"
                >
                  <Coins className="mr-2 h-4 w-4" />
                  Comprar Créditos Extras
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma Assinatura Ativa</h3>
              <p className="text-sm text-muted-foreground text-center mb-6">
                Você ainda não possui uma assinatura ativa. Escolha um plano para começar.
              </p>
              {allPlans && allPlans.length > 0 && (
                <div className="grid gap-4 md:grid-cols-3 w-full max-w-4xl mt-4">
                  {allPlans.map((plan) => (
                    <Card key={plan.id} className="relative">
                      <CardHeader>
                        <CardTitle>{plan.name}</CardTitle>
                        <CardDescription>{plan.description}</CardDescription>
                        <div className="mt-4">
                          <span className="text-3xl font-bold">
                            R$ {((plan.priceMonthly || 0) / 100).toFixed(2)}
                          </span>
                          <span className="text-muted-foreground">/mês</span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 mb-4">
                          {plan.monthlyCredits && (
                            <div className="flex items-center gap-2 text-sm">
                              <Check className="h-4 w-4 text-green-600" />
                              <span>{plan.monthlyCredits.toLocaleString('pt-BR')} créditos/mês</span>
                            </div>
                          )}
                        </div>
                        <Button
                          onClick={() => handleUpgrade(plan.id)}
                          className="w-full"
                          variant={plan.id === 1 ? "default" : "outline"}
                        >
                          Assinar
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Upgrade de Plano */}
        {subscriptionInfo?.hasSubscription && availablePlans.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpRight className="h-5 w-5" />
                Fazer Upgrade
              </CardTitle>
              <CardDescription>
                Escolha um plano superior para ter mais recursos e créditos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {availablePlans.map((plan) => (
                  <Card key={plan.id} className="relative border-primary/20 hover:border-primary/40 transition-colors">
                    <CardHeader>
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <CardDescription className="text-xs">{plan.description}</CardDescription>
                      <div className="mt-2">
                        <span className="text-2xl font-bold">
                          R$ {((plan.priceMonthly || 0) / 100).toFixed(2)}
                        </span>
                        <span className="text-muted-foreground text-sm">/mês</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4">
                        {plan.monthlyCredits && (
                          <div className="flex items-center gap-2 text-sm">
                            <Zap className="h-4 w-4 text-primary" />
                            <span>{plan.monthlyCredits.toLocaleString('pt-BR')} créditos/mês</span>
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={() => handleUpgrade(plan.id)}
                        className="w-full"
                        disabled={createCheckoutMutation.isPending}
                      >
                        {createCheckoutMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <ArrowUpRight className="mr-2 h-4 w-4" />
                        )}
                        Fazer Upgrade
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modal de Compra de Créditos */}
        {showCreditsModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Comprar Créditos Extras</CardTitle>
                <CardDescription>
                  Compre créditos adicionais para usar quando precisar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="credits">Quantidade de Créditos</Label>
                  <Input
                    id="credits"
                    type="number"
                    min={1000}
                    step={1000}
                    value={creditsAmount}
                    onChange={(e) => setCreditsAmount(parseInt(e.target.value) || 1000)}
                    placeholder="5000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Mínimo: 1.000 créditos. Preço: R$ 0,050 por 1.000 créditos
                  </p>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total a pagar:</span>
                      <span className="text-lg font-bold">
                        R$ {((creditsAmount / 1000) * 0.050).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowCreditsModal(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handlePurchaseCredits}
                    disabled={purchaseCreditsMutation.isPending || creditsAmount < 1000}
                    className="flex-1"
                  >
                    {purchaseCreditsMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Coins className="mr-2 h-4 w-4" />
                    )}
                    Comprar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
