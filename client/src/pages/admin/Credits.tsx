import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Coins, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Search,
  Plus,
  Minus,
  Loader2,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function CreditsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: tenants, isLoading: isLoadingTenants, refetch: refetchTenants } = trpc.tenants.list.useQuery();
  const utils = trpc.useUtils();

  // Buscar créditos de um tenant específico
  const { data: tenantCredits, isLoading: isLoadingCredits } = trpc.metrics.getTenantCredits.useQuery(
    { tenantId: selectedTenantId! },
    { enabled: !!selectedTenantId }
  );

  // Filtrar tenants por busca
  const filteredTenants = tenants?.filter(tenant => 
    tenant.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Calcular estatísticas agregadas
  const totalCredits = tenants?.reduce((sum, tenant) => {
    // Aqui precisaríamos buscar créditos de cada tenant, mas por performance vamos estimar
    return sum;
  }, 0) || 0;

  const handleAdjustCredits = async () => {
    if (!selectedTenantId || !adjustmentAmount || !adjustmentReason.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }

    const amount = parseInt(adjustmentAmount);
    if (isNaN(amount) || amount === 0) {
      toast.error("Valor inválido");
      return;
    }

    // TODO: Implementar mutation para ajustar créditos
    // Por enquanto, apenas mostrar mensagem
    toast.info("Funcionalidade de ajuste manual será implementada em breve");
    setIsDialogOpen(false);
    setAdjustmentAmount("");
    setAdjustmentReason("");
  };

  if (isLoadingTenants) {
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Créditos</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie créditos de todos os clientes
          </p>
        </div>

        {/* Estatísticas Agregadas */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tenants?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                Clientes cadastrados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tenants?.filter(t => t.status === "active").length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Com assinatura ativa
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes Suspensos</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tenants?.filter(t => t.status === "suspended").length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Temporariamente inativos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Busca */}
        <Card>
          <CardHeader>
            <CardTitle>Buscar Cliente</CardTitle>
            <CardDescription>
              Digite o nome da empresa ou email para filtrar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por empresa ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Lista de Tenants */}
        <Card>
          <CardHeader>
            <CardTitle>Clientes e Créditos</CardTitle>
            <CardDescription>
              Clique em um cliente para ver detalhes e ajustar créditos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredTenants.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mb-4 opacity-50" />
                <p>Nenhum cliente encontrado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTenants.map((tenant) => (
                  <TenantCreditsCard
                    key={tenant.id}
                    tenant={tenant}
                    onSelect={() => {
                      setSelectedTenantId(tenant.id);
                      setIsDialogOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog para Ajustar Créditos */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajustar Créditos</DialogTitle>
              <DialogDescription>
                {selectedTenantId && tenants?.find(t => t.id === selectedTenantId)?.companyName}
              </DialogDescription>
            </DialogHeader>
            
            {isLoadingCredits ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : tenantCredits ? (
              <div className="space-y-4 py-4">
                <div className="grid gap-2">
                  <Label>Saldo Atual</Label>
                  <div className="text-2xl font-bold flex items-center gap-2">
                    <Coins className="h-5 w-5 text-yellow-500" />
                    {tenantCredits.currentCredits?.toLocaleString('pt-BR') || 0} créditos
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="adjustment">Ajuste (positivo para adicionar, negativo para remover)</Label>
                  <Input
                    id="adjustment"
                    type="number"
                    placeholder="Ex: 1000 ou -500"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="reason">Motivo do Ajuste</Label>
                  <Input
                    id="reason"
                    placeholder="Ex: Bônus promocional, Correção de erro..."
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                  />
                </div>

                {adjustmentAmount && !isNaN(parseInt(adjustmentAmount)) && (
                  <Alert>
                    <AlertDescription>
                      Novo saldo: {(tenantCredits.currentCredits || 0) + parseInt(adjustmentAmount)} créditos
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : null}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAdjustCredits} disabled={!adjustmentAmount || !adjustmentReason.trim()}>
                Aplicar Ajuste
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

// Componente para card de créditos do tenant
function TenantCreditsCard({ tenant, onSelect }: { tenant: any; onSelect: () => void }) {
  const { data: credits, isLoading } = trpc.metrics.getTenantCredits.useQuery(
    { tenantId: tenant.id },
    { refetchInterval: 30000 }
  );

  return (
    <div
      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
      onClick={onSelect}
    >
      <div className="flex items-center gap-4 flex-1">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-medium">{tenant.companyName}</span>
            <Badge variant={tenant.status === "active" ? "default" : "secondary"}>
              {tenant.status === "active" ? "Ativo" : "Suspenso"}
            </Badge>
          </div>
          <span className="text-sm text-muted-foreground">{tenant.email}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-yellow-500" />
              <span className="font-semibold">
                {credits?.currentCredits?.toLocaleString('pt-BR') || 0}
              </span>
              <span className="text-sm text-muted-foreground">créditos</span>
            </div>
            <Button variant="outline" size="sm">
              Ajustar
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

