import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Bot, 
  MessageSquare, 
  BarChart3, 
  CreditCard,
  LogOut,
  Menu,
  X,
  Settings,
  AlertCircle,
  Smartphone
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  // TODOS OS HOOKS DEVEM VIR PRIMEIRO (regra do React)
  const { user, logout, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      setIsLoggingOut(false);
    }
  };
  
  // Agora podemos fazer returns condicionais
  // Mostrar loading enquanto verifica autenticação ou durante logout
  if (loading || isLoggingOut) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">
            {isLoggingOut ? 'Saindo...' : 'Verificando autenticação...'}
          </p>
        </div>
      </div>
    );
  }
  
  // Verificar se usuário não é cliente (mas não durante logout)
  if (!isLoggingOut && (!user || (user.role !== 'client' && user.role !== 'admin'))) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto" />
          <h1 className="text-2xl font-bold">Acesso Negado</h1>
          <p className="text-muted-foreground">
            Você precisa estar logado como cliente para acessar esta área.
          </p>
          <div className="flex gap-2 justify-center">
            <Link href="/client/login">
              <Button>Fazer Login</Button>
            </Link>
            <Link href="/">
              <Button variant="outline">Voltar para Home</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  // Se for admin, redirecionar
  if (user.role === 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto" />
          <h1 className="text-2xl font-bold">Área do Cliente</h1>
          <p className="text-muted-foreground">
            Você está logado como administrador. Esta é a área exclusiva para clientes da plataforma.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => window.location.href = '/admin'}>
              Ir para Painel Admin
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              Voltar para Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const navigation = [
    { name: "WhatsApp", href: "/client", icon: Smartphone },
    { name: "Interações", href: "/client/interactions", icon: MessageSquare },
    { name: "Configurações", href: "/client/settings", icon: Settings },
    { name: "Métricas", href: "/client/metrics", icon: BarChart3 },
    { name: "Assinatura", href: "/client/subscription", icon: CreditCard },
  ];

  const isActive = (href: string) => {
    if (href === "/client") {
      return location === href;
    }
    return location.startsWith(href);
  };

  const companyName = (user as any)?.tenant?.companyName || user?.name || "Cliente";
  const userEmail = (user as any)?.tenant?.email || user?.email || "";
  const initials = companyName
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase() || "CL";

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } transition-all duration-300 border-r bg-card flex flex-col overflow-hidden`}
      >
        <div className="p-6">
          <h1 className="text-2xl font-bold text-foreground">Meu Agente IA</h1>
          <p className="text-sm text-muted-foreground">Painel do Cliente</p>
        </div>

        <Separator />

        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link 
                  key={item.name} 
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        <Separator />

        <div className="p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm font-medium">{companyName}</span>
                  <span className="text-xs text-muted-foreground">{userEmail}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
                <LogOut className="mr-2 h-4 w-4" />
                {isLoggingOut ? 'Saindo...' : 'Sair'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b bg-card">
          <div className="flex items-center justify-between px-6 py-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Bem-vindo, <strong>{companyName}</strong>
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
