import { trpc } from "@/lib/trpc";
import ClientLayout from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function SubscriptionPage() {
  const { data: subscriptionInfo, isLoading } = trpc.payment.getSubscriptionInfo.useQuery();
  const utils = trpc.useUtils();

  const createCheckoutMutation = trpc.payment.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        toast.info("Redirecionando para o checkout...");
        window.open(data.checkoutUrl, '_blank');
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
        window.open(data.portalUrl, '_blank');
      }
    },
    onError: (error) => {
      toast.error(`Erro ao abrir portal: ${error.message}`);
    },
  });

  const handleSubscribe = (planId: number) => {
    createCheckoutMutation.mutate({ planId });
  };

  const handleManageSubscription = () => {
    createPortalMutation.mutate();
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
          <h1 className="text-3xl font-bold tracking-tight">Assinatura</h1>
          <p className="text-muted-foreground">
            Gerencie seu plano e informações de pagamento
          </p>
        </div>

        {subscriptionInfo?.hasSubscription ? (
          // Cliente já tem assinatura ativa
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Assinatura Ativa
                </CardTitle>
                <CardDescription>
                  Informações do seu plano atual
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b">
                  <span className="text-sm font-medium">Plano</span>
                  <span className="text-sm text-muted-foreground">
                    {subscriptionInfo.plan?.name || 'N/A'}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-4 border-b">
                  <span className="text-sm font-medium">Status</span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      subscriptionInfo.status === "active"
                        ? "bg-green-100 text-green-700"
                        : subscriptionInfo.status === "past_due"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {subscriptionInfo.status}
                  </span>
                </div>

                {subscriptionInfo.currentPeriodEnd && (
                  <div className="flex items-center justify-between pb-4 border-b">
                    <span className="text-sm font-medium">Próxima cobrança</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(subscriptionInfo.currentPeriodEnd).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between pb-4 border-b">
                  <span className="text-sm font-medium">Valor Mensal</span>
                  <span className="text-sm text-muted-foreground">
                    R$ {((subscriptionInfo.plan?.priceMonthly || 0) / 100).toFixed(2)}
                  </span>
                </div>

                {subscriptionInfo.cancelAtPeriodEnd && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      Sua assinatura será cancelada no final do período atual.
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleManageSubscription}
                  disabled={createPortalMutation.isPending}
                  className="w-full"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Gerenciar Assinatura
                </Button>
              </CardContent>
            </Card>

            {/* Recursos do Plano */}
            {subscriptionInfo.plan && (
              <Card>
                <CardHeader>
                  <CardTitle>Recursos do Plano</CardTitle>
                  <CardDescription>
                    Limites e funcionalidades incluídas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">
                        {subscriptionInfo.plan.maxWorkflowExecutions?.toLocaleString() || 'Ilimitadas'} execuções de workflow por mês
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">
                        {subscriptionInfo.plan.maxConversations?.toLocaleString() || 'Ilimitadas'} conversas por mês
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">
                        {subscriptionInfo.plan.maxStorageGB || 'Ilimitado'} GB de armazenamento
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          // Cliente ainda não tem assinatura
          <div className="space-y-6">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma Assinatura Ativa</h3>
                <p className="text-sm text-muted-foreground text-center mb-6">
                  Você ainda não possui uma assinatura ativa. Entre em contato com o administrador para ativar seu plano.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
