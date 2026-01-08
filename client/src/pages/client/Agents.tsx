import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import ClientLayout from "@/components/ClientLayout";
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
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Bot, 
  Settings, 
  Trash2, 
  Play, 
  Pause,
  QrCode,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function AgentsPage() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  
  const { data: agents, isLoading } = trpc.agent.list.useQuery();

  const deleteMutation = trpc.agent.delete.useMutation({
    onSuccess: () => {
      toast.success("Agente deletado com sucesso!");
      utils.agent.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao deletar agente: ${error.message}`);
    },
  });

  const deactivateMutation = trpc.agent.deactivate.useMutation({
    onSuccess: () => {
      toast.success("Agente desativado com sucesso!");
      utils.agent.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao desativar agente: ${error.message}`);
    },
  });

  const activateMutation = trpc.agent.activate.useMutation({
    onSuccess: () => {
      toast.success("Agente ativado com sucesso!");
      utils.agent.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao ativar agente: ${error.message}`);
    },
  });

  const handleDelete = (agentId: number, agentName: string) => {
    deleteMutation.mutate({ agentId });
  };

  const handleDeactivate = (agentId: number) => {
    deactivateMutation.mutate({ agentId });
  };

  const handleActivate = (agentId: number) => {
    activateMutation.mutate({ agentId });
  };

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="container mx-auto py-8 space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-40" />
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Meus Agentes</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie e configure seus agentes de IA
            </p>
          </div>
          <Link href="/client/agents/create">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Agente
            </Button>
          </Link>
        </div>

        {/* Agents List */}
        {!agents || agents.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="p-4 bg-primary/10 rounded-full mb-4">
                <Bot className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Nenhum agente criado</h3>
              <p className="text-muted-foreground mb-6 text-center max-w-md">
                Crie seu primeiro agente de IA para começar a automatizar conversas e atender seus clientes
              </p>
              <Link href="/client/agents/create">
                <Button size="lg" className="gap-2">
                  <Plus className="h-5 w-5" />
                  Criar Primeiro Agente
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <Card key={agent.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2.5 bg-primary/10 rounded-lg">
                        <Bot className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold truncate">{agent.name}</h3>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge 
                            variant={agent.isActive ? "default" : "secondary"}
                            className="gap-1 text-xs"
                          >
                            {agent.isActive ? (
                              <>
                                <CheckCircle2 className="h-3 w-3" />
                                Ativo
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3" />
                                Inativo
                              </>
                            )}
                          </Badge>
                          {agent.evolutionInstanceName && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <MessageSquare className="h-3 w-3" />
                              Conectado
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {agent.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {agent.description}
                    </p>
                  )}

                  <div className="flex items-center text-xs text-muted-foreground">
                    <span>Criado em {new Date(agent.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <Link href={`/client/agents/${agent.id}/settings`} className="flex-1 min-w-[100px]">
                      <Button variant="outline" size="sm" className="w-full gap-2">
                        <Settings className="h-3.5 w-3.5" />
                        Configurar
                      </Button>
                    </Link>

                    <Link href={`/client/agents/${agent.id}/whatsapp`} className="flex-1 min-w-[100px]">
                      <Button variant="outline" size="sm" className="w-full gap-2">
                        <QrCode className="h-3.5 w-3.5" />
                        WhatsApp
                      </Button>
                    </Link>

                    {agent.isActive ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 flex-1 min-w-[100px]"
                        onClick={() => handleDeactivate(agent.id)}
                        disabled={deactivateMutation.isPending}
                      >
                        {deactivateMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Pause className="h-3.5 w-3.5" />
                        )}
                        Pausar
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 flex-1 min-w-[100px]"
                        onClick={() => handleActivate(agent.id)}
                        disabled={activateMutation.isPending}
                      >
                        {activateMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Play className="h-3.5 w-3.5" />
                        )}
                        Ativar
                      </Button>
                    )}

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="gap-2"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Deletar Agente</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja deletar o agente "{agent.name}"?
                            Esta ação não pode ser desfeita. Todos os recursos
                            relacionados (workflows, instâncias, configurações) serão removidos.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(agent.id, agent.name)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {deleteMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Deletando...
                              </>
                            ) : (
                              "Deletar"
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}

