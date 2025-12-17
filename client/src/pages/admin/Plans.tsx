import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Check, Edit } from "lucide-react";
import { toast } from "sonner";

export default function PlansPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    stripePriceId: "",
    priceMonthly: "",
    maxWorkflowExecutions: "",
    maxConversations: "",
    maxStorageGB: "",
    isActive: true,
  });

  const utils = trpc.useUtils();
  const { data: plans, isLoading } = trpc.plans.list.useQuery();

  const createMutation = trpc.plans.create.useMutation({
    onSuccess: () => {
      toast.success("Plano criado com sucesso!");
      setCreateDialogOpen(false);
      resetForm();
      utils.plans.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao criar plano: ${error.message}`);
    },
  });

  const updateMutation = trpc.plans.update.useMutation({
    onSuccess: () => {
      toast.success("Plano atualizado com sucesso!");
      setEditDialogOpen(null);
      resetForm();
      utils.plans.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar plano: ${error.message}`);
    },
  });

  const toggleActiveMutation = trpc.plans.toggleActive.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.plans.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao alterar status: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      stripePriceId: "",
      priceMonthly: "",
      maxWorkflowExecutions: "",
      maxConversations: "",
      maxStorageGB: "",
      isActive: true,
    });
  };

  const handleCreate = () => {
    createMutation.mutate({
      name: formData.name,
      description: formData.description || undefined,
      stripePriceId: formData.stripePriceId,
      priceMonthly: Math.round(parseFloat(formData.priceMonthly) * 100), // Converter para centavos
      maxWorkflowExecutions: formData.maxWorkflowExecutions ? parseInt(formData.maxWorkflowExecutions) : undefined,
      maxConversations: formData.maxConversations ? parseInt(formData.maxConversations) : undefined,
      maxStorageGB: formData.maxStorageGB ? parseInt(formData.maxStorageGB) : undefined,
      isActive: formData.isActive,
    });
  };

  const handleEdit = (planId: number) => {
    const plan = plans?.find((p) => p.id === planId);
    if (!plan) return;

    setFormData({
      name: plan.name || "",
      description: plan.description || "",
      stripePriceId: plan.stripePriceId || "",
      priceMonthly: plan.priceMonthly ? (plan.priceMonthly / 100).toFixed(2) : "",
      maxWorkflowExecutions: plan.maxWorkflowExecutions?.toString() || "",
      maxConversations: plan.maxConversations?.toString() || "",
      maxStorageGB: plan.maxStorageGB?.toString() || "",
      isActive: plan.isActive ?? true,
    });
    setEditDialogOpen(planId);
  };

  const handleUpdate = () => {
    if (!editDialogOpen) return;

    updateMutation.mutate({
      id: editDialogOpen,
      name: formData.name,
      description: formData.description || undefined,
      stripePriceId: formData.stripePriceId || undefined,
      priceMonthly: formData.priceMonthly ? Math.round(parseFloat(formData.priceMonthly) * 100) : undefined,
      maxWorkflowExecutions: formData.maxWorkflowExecutions ? parseInt(formData.maxWorkflowExecutions) : undefined,
      maxConversations: formData.maxConversations ? parseInt(formData.maxConversations) : undefined,
      maxStorageGB: formData.maxStorageGB ? parseInt(formData.maxStorageGB) : undefined,
      isActive: formData.isActive,
    });
  };

  const handleToggleActive = (planId: number) => {
    toggleActiveMutation.mutate({ id: planId });
  };

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
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Plano
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Novo Plano</DialogTitle>
                <DialogDescription>
                  Preencha as informações do novo plano de assinatura
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Plano *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Plano Básico"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Ideal para pequenas empresas"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stripePriceId">Stripe Price ID *</Label>
                    <Input
                      id="stripePriceId"
                      value={formData.stripePriceId}
                      onChange={(e) => setFormData({ ...formData, stripePriceId: e.target.value })}
                      placeholder="price_1234567890"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priceMonthly">Preço Mensal (R$) *</Label>
                    <Input
                      id="priceMonthly"
                      type="number"
                      step="0.01"
                      value={formData.priceMonthly}
                      onChange={(e) => setFormData({ ...formData, priceMonthly: e.target.value })}
                      placeholder="99.00"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxWorkflowExecutions">Execuções/mês</Label>
                    <Input
                      id="maxWorkflowExecutions"
                      type="number"
                      value={formData.maxWorkflowExecutions}
                      onChange={(e) => setFormData({ ...formData, maxWorkflowExecutions: e.target.value })}
                      placeholder="1000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxConversations">Conversas/mês</Label>
                    <Input
                      id="maxConversations"
                      type="number"
                      value={formData.maxConversations}
                      onChange={(e) => setFormData({ ...formData, maxConversations: e.target.value })}
                      placeholder="500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxStorageGB">Armazenamento (GB)</Label>
                    <Input
                      id="maxStorageGB"
                      type="number"
                      value={formData.maxStorageGB}
                      onChange={(e) => setFormData({ ...formData, maxStorageGB: e.target.value })}
                      placeholder="5"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={createMutation.isPending || !formData.name || !formData.stripePriceId || !formData.priceMonthly}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    "Criar Plano"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {plans && plans.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">Nenhum plano cadastrado</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEdit(plan.id)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      variant={plan.isActive ? "destructive" : "default"}
                      size="sm"
                      className="flex-1"
                      onClick={() => handleToggleActive(plan.id)}
                      disabled={toggleActiveMutation.isPending}
                    >
                      {toggleActiveMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        plan.isActive ? "Desativar" : "Ativar"
                      )}
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
