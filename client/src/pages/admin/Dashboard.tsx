import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Activity, DollarSign, AlertCircle } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

export default function AdminDashboard() {
  const { data: tenants, isLoading } = trpc.tenants.list.useQuery();
  const { data: logs } = trpc.logs.list.useQuery({ limit: 10 });

  const stats = {
    totalTenants: tenants?.length || 0,
    activeTenants: tenants?.filter(t => t.status === "active").length || 0,
    suspendedTenants: tenants?.filter(t => t.status === "suspended").length || 0,
    recentLogs: logs?.length || 0,
  };

  const statCards = [
    {
      title: "Total de Clientes",
      value: stats.totalTenants,
      description: "Clientes cadastrados",
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "Clientes Ativos",
      value: stats.activeTenants,
      description: "Com agentes funcionando",
      icon: Activity,
      color: "text-green-600",
    },
    {
      title: "Clientes Suspensos",
      value: stats.suspendedTenants,
      description: "Temporariamente inativos",
      icon: AlertCircle,
      color: "text-yellow-600",
    },
    {
      title: "Eventos Recentes",
      value: stats.recentLogs,
      description: "Últimos 10 eventos",
      icon: DollarSign,
      color: "text-purple-600",
    },
  ];

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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral da plataforma SaaS de Agentes N8N
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => {
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

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
            <CardDescription>
              Últimos eventos da plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logs && logs.length > 0 ? (
              <div className="space-y-4">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 pb-4 border-b last:border-0"
                  >
                    <div
                      className={`mt-1 h-2 w-2 rounded-full ${
                        log.severity === "error" || log.severity === "critical"
                          ? "bg-red-500"
                          : log.severity === "warning"
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }`}
                    />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{log.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        log.severity === "error" || log.severity === "critical"
                          ? "bg-red-100 text-red-700"
                          : log.severity === "warning"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {log.eventType}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma atividade recente
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Tenants */}
        <Card>
          <CardHeader>
            <CardTitle>Clientes Recentes</CardTitle>
            <CardDescription>
              Últimos clientes cadastrados na plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tenants && tenants.length > 0 ? (
              <div className="space-y-4">
                {tenants.slice(0, 5).map((tenant) => (
                  <div
                    key={tenant.id}
                    className="flex items-center justify-between pb-4 border-b last:border-0"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{tenant.companyName}</p>
                      <p className="text-xs text-muted-foreground">{tenant.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          tenant.status === "active"
                            ? "bg-green-100 text-green-700"
                            : tenant.status === "suspended"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {tenant.status}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(tenant.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum cliente cadastrado ainda
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
