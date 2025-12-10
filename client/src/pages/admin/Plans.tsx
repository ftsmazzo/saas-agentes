import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Check } from "lucide-react";

export default function PlansPage() {
  const { data: plans, isLoading } = trpc.plans.list.useQuery();

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Planos</h1>
            <p className="text-muted-foreground">
              Gerencie os planos de assinatura disponíveis
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Plano
          </Button>
        </div>

        {plans && plans.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">Nenhum plano cadastrado</p>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Plano
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {plans?.map((plan) => (
              <Card key={plan.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{plan.name}</CardTitle>
                      <CardDescription className="mt-2">
                        {plan.description || "Sem descrição"}
                      </CardDescription>
                    </div>
                    {plan.isActive ? (
                      <Badge variant="default">Ativo</Badge>
                    ) : (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-3xl font-bold">
                    R$ {((plan.priceMonthly || 0) / 100).toFixed(2)}
                    <span className="text-sm font-normal text-muted-foreground">/mês</span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>
                        {plan.maxWorkflowExecutions?.toLocaleString() || "Ilimitadas"} execuções/mês
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>
                        {plan.maxConversations?.toLocaleString() || "Ilimitadas"} conversas/mês
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>
                        {plan.maxStorageGB || "Ilimitado"} GB de armazenamento
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground">
                      Stripe Price ID: <code className="text-xs">{plan.stripePriceId}</code>
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      Editar
                    </Button>
                    <Button 
                      variant={plan.isActive ? "destructive" : "default"} 
                      size="sm" 
                      className="flex-1"
                    >
                      {plan.isActive ? "Desativar" : "Ativar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">Como configurar planos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              1. Crie os produtos e preços no{" "}
              <a
                href="https://dashboard.stripe.com/products"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Stripe Dashboard
              </a>
            </p>
            <p>2. Copie o Price ID de cada plano criado</p>
            <p>3. Atualize o arquivo <code>server/products.ts</code> com os IDs corretos</p>
            <p>4. Execute o SQL para inserir os planos no banco de dados (veja CONFIGURACAO.md)</p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
