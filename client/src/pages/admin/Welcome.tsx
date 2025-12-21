import { useEffect } from "react";
import { useLocation } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Users, CreditCard, FileText, Settings, LayoutDashboard, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function WelcomePage() {
  const [, setLocation] = useLocation();
  const { data: tenants, isLoading: tenantsLoading } = trpc.tenants.list.useQuery();
  const { data: plans, isLoading: plansLoading } = trpc.plans.list.useQuery();

  // Redirecionar para dashboard após um momento (opcional)
  // Ou manter como página inicial simples

  const quickStats = {
    totalClients: tenants?.length || 0,
    totalPlans: plans?.length || 0,
  };

  const quickActions = [
    {
      title: "Dashboard",
      description: "Visão geral da plataforma",
      icon: LayoutDashboard,
      href: "/admin/dashboard",
      color: "text-blue-600",
    },
    {
      title: "Clientes",
      description: "Gerenciar clientes e tenants",
      icon: Users,
      href: "/admin/tenants",
      color: "text-green-600",
    },
    {
      title: "Planos",
      description: "Gerenciar planos de assinatura",
      icon: CreditCard,
      href: "/admin/plans",
      color: "text-purple-600",
    },
    {
      title: "Logs",
      description: "Ver eventos e logs do sistema",
      icon: FileText,
      href: "/admin/logs",
      color: "text-orange-600",
    },
    {
      title: "Configurações",
      description: "Configurar integrações",
      icon: Settings,
      href: "/admin/settings",
      color: "text-gray-600",
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Painel Administrativo</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie sua plataforma SaaS de Agentes N8N
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tenantsLoading ? "..." : quickStats.totalClients}
              </div>
              <p className="text-xs text-muted-foreground">
                Clientes cadastrados na plataforma
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Planos Disponíveis</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {plansLoading ? "..." : quickStats.totalPlans}
              </div>
              <p className="text-xs text-muted-foreground">
                Planos de assinatura configurados
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>
              Acesse rapidamente as principais funcionalidades
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link key={action.href} href={action.href}>
                    <div className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer">
                      <div className={`p-2 rounded-lg bg-muted ${action.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{action.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {action.description}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Primary Action */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Começar</CardTitle>
            <CardDescription>
              Acesse o dashboard para ver uma visão completa da plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/dashboard">
              <Button className="w-full md:w-auto">
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Ir para Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
