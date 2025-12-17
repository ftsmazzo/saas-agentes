import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pause, Play, Trash2, ExternalLink, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function TenantsPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    email: "",
    subdomain: "",
    planId: 1,
  });

  const utils = trpc.useUtils();
  const { data: tenants, isLoading } = trpc.tenants.list.useQuery();
  const { data: plans } = trpc.plans.list.useQuery();

  const createMutation = trpc.tenants.create.useMutation({
    onSuccess: () => {
      toast.success("Cliente criado com sucesso!");
      setCreateDialogOpen(false);
      setFormData({ companyName: "", email: "", subdomain: "", planId: 1 });
      utils.tenants.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao criar cliente: ${error.message}`);
    },
  });

  const suspendMutation = trpc.tenants.suspend.useMutation({
    onSuccess: () => {
      toast.success("Cliente suspenso com sucesso!");
      utils.tenants.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao suspender cliente: ${error.message}`);
    },
  });

  const reactivateMutation = trpc.tenants.reactivate.useMutation({
    onSuccess: () => {
      toast.success("Cliente reativado com sucesso!");
      utils.tenants.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao reativar cliente: ${error.message}`);
    },
  });

  const deleteMutation = trpc.tenants.delete.useMutation({
    onSuccess: () => {
      toast.success("Cliente deletado com sucesso!");
      utils.tenants.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao deletar cliente: ${error.message}`);
    },
  });

  const deleteAllTestClientsMutation = trpc.tenants.deleteAllTestClients.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Clientes de teste deletados com sucesso!");
      utils.tenants.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao deletar clientes de teste: ${error.message}`);
    },
  });

  const deleteAllClientsMutation = trpc.tenants.deleteAllClients.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Todos os clientes foram deletados!");
      utils.tenants.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao deletar todos os clientes: ${error.message}`);
    },
  });

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
            <p className="text-muted-foreground">
              Gerencie todos os clientes da plataforma
            </p>
          </div>

          <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Limpar Testes
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Deletar Todos os Clientes de Teste</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação irá deletar permanentemente todos os clientes identificados como teste (emails com "test", "teste", "demo", etc.). Esta ação é irreversível.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteAllTestClientsMutation.mutate()}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    Deletar Testes
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Deletar Todos
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>⚠️ ATENÇÃO: Deletar TODOS os Clientes</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação irá deletar PERMANENTEMENTE TODOS os clientes, incluindo Evolution, Chatwoot e N8N. Esta ação é IRREVERSÍVEL e deve ser usada apenas em desenvolvimento ou limpeza completa.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteAllClientsMutation.mutate()}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Deletar Todos
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Cliente
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Cliente</DialogTitle>
                <DialogDescription>
                  Preencha as informações do novo cliente. Um banco de dados e workflow serão provisionados automaticamente.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nome da Empresa</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) =>
                      setFormData({ ...formData, companyName: e.target.value })
                    }
                    placeholder="Imobiliária XYZ"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="contato@empresa.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subdomain">Subdomínio (opcional)</Label>
                  <Input
                    id="subdomain"
                    value={formData.subdomain}
                    onChange={(e) =>
                      setFormData({ ...formData, subdomain: e.target.value })
                    }
                    placeholder="empresa"
                  />
                  <p className="text-xs text-muted-foreground">
                    Deixe em branco para configurar depois
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="planId">Plano</Label>
                  <select
                    id="planId"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.planId}
                    onChange={(e) =>
                      setFormData({ ...formData, planId: Number(e.target.value) })
                    }
                  >
                    {plans?.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} - R$ {(plan.priceMonthly / 100).toFixed(2)}/mês
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Criando..." : "Criar Cliente"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Clientes</CardTitle>
            <CardDescription>
              {tenants?.length || 0} cliente(s) cadastrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tenants && tenants.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Subdomínio</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">
                        {tenant.companyName}
                      </TableCell>
                      <TableCell>{tenant.email}</TableCell>
                      <TableCell>
                        {tenant.subdomain ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{tenant.subdomain}</span>
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            Não configurado
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            tenant.status === "active"
                              ? "bg-green-100 text-green-700"
                              : tenant.status === "suspended"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {tenant.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(tenant.createdAt).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {tenant.status === "active" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => suspendMutation.mutate({ id: tenant.id })}
                              disabled={suspendMutation.isPending}
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => reactivateMutation.mutate({ id: tenant.id })}
                              disabled={reactivateMutation.isPending}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja deletar o cliente{" "}
                                  <strong>{tenant.companyName}</strong>? Esta ação é
                                  irreversível e todos os dados serão perdidos.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate({ id: tenant.id })}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Deletar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  Nenhum cliente cadastrado ainda.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Primeiro Cliente
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
