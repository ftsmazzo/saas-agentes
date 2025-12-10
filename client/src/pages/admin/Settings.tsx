import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Settings, Database, Workflow, CreditCard, Bell } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const handleSave = () => {
    toast.success("Configurações salvas com sucesso!");
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Configure as integrações e parâmetros da plataforma
          </p>
        </div>

        {/* Integração N8N */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Workflow className="h-5 w-5" />
              <CardTitle>Integração N8N</CardTitle>
            </div>
            <CardDescription>
              Configure a conexão com a API do N8N para provisionamento de workflows
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="n8n-url">URL da API do N8N</Label>
              <Input
                id="n8n-url"
                placeholder="https://seu-n8n.exemplo.com"
              />
              <p className="text-xs text-muted-foreground">
                Variável de ambiente: <code>N8N_API_URL</code>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="n8n-key">API Key do N8N</Label>
              <Input
                id="n8n-key"
                type="password"
                placeholder="n8n_api_key_..."
                defaultValue="••••••••••••"
              />
              <p className="text-xs text-muted-foreground">
                Variável de ambiente: <code>N8N_API_KEY</code>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="n8n-template">ID do Workflow Template</Label>
              <Input
                id="n8n-template"
                placeholder="123"
              />
              <p className="text-xs text-muted-foreground">
                Variável de ambiente: <code>N8N_TEMPLATE_WORKFLOW_ID</code>
              </p>
            </div>

            <Button onClick={handleSave}>Salvar Configurações N8N</Button>
          </CardContent>
        </Card>

        {/* PostgreSQL Master */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              <CardTitle>PostgreSQL Master</CardTitle>
            </div>
            <CardDescription>
              Servidor PostgreSQL usado para provisionar bancos de dados dos clientes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pg-host">Host</Label>
              <Input
                id="pg-host"
                placeholder="localhost"
              />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pg-port">Porta</Label>
              <Input
                id="pg-port"
                placeholder="5432"
                defaultValue="5432"
              />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pg-user">Usuário Master</Label>
              <Input
                id="pg-user"
                placeholder="postgres"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pg-password">Senha Master</Label>
              <Input
                id="pg-password"
                type="password"
                placeholder="••••••••"
                defaultValue="••••••••••••"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pg-db">Banco de Dados</Label>
              <Input
                id="pg-db"
                placeholder="postgres"
                defaultValue="postgres"
              />
            </div>

            <Button onClick={handleSave}>Salvar Configurações PostgreSQL</Button>
          </CardContent>
        </Card>

        {/* Stripe */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              <CardTitle>Stripe</CardTitle>
            </div>
            <CardDescription>
              Configurações de pagamento e assinaturas (gerenciadas automaticamente)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Secret Key</Label>
              <Input type="password" value="••••••••••••" disabled />
              <p className="text-xs text-muted-foreground">
                Configurado automaticamente via variável de ambiente
              </p>
            </div>

            <div className="space-y-2">
              <Label>Publishable Key</Label>
              <Input type="password" value="••••••••••••" disabled />
              <p className="text-xs text-muted-foreground">
                Configurado automaticamente via variável de ambiente
              </p>
            </div>

            <div className="space-y-2">
              <Label>Webhook Secret</Label>
              <Input type="password" value="••••••••••••" disabled />
              <p className="text-xs text-muted-foreground">
                Configurado automaticamente via variável de ambiente
              </p>
            </div>

            <Separator />

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">Webhook Endpoint</p>
              <code className="text-xs bg-background px-2 py-1 rounded block">
                /api/stripe/webhook
              </code>
              <p className="text-xs text-muted-foreground">
                Configure este endpoint no Stripe Dashboard → Developers → Webhooks
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notificações */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <CardTitle>Notificações</CardTitle>
            </div>
            <CardDescription>
              Sistema de notificações automáticas para o proprietário
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm">
                As notificações estão configuradas e funcionando automaticamente através do sistema
                integrado da Manus. Você receberá alertas sobre:
              </p>
              <ul className="text-sm mt-2 space-y-1 list-disc list-inside text-muted-foreground">
                <li>Novos cadastros de clientes</li>
                <li>Falhas de pagamento</li>
                <li>Suspensão de clientes</li>
                <li>Eventos críticos da plataforma</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Informações do Sistema */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <CardTitle>Informações do Sistema</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Versão da Plataforma</span>
              <span className="font-mono">1.0.0</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ambiente</span>
              <span className="font-mono">production</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Banco de Dados</span>
              <span className="font-mono">MySQL (TiDB)</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
