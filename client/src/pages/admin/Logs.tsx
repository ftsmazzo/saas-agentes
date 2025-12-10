import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, AlertCircle, Info, AlertTriangle, CheckCircle } from "lucide-react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function LogsPage() {
  const [limit, setLimit] = useState(50);
  const { data: logs, isLoading } = trpc.logs.list.useQuery({ limit });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case "info":
        return <Info className="h-4 w-4 text-blue-600" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
      error: "destructive",
      warning: "default",
      info: "secondary",
      success: "outline",
    };
    return variants[severity] || "secondary";
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
            <h1 className="text-3xl font-bold tracking-tight">Logs da Plataforma</h1>
            <p className="text-muted-foreground">
              Histórico de eventos e atividades do sistema
            </p>
          </div>
          <Select value={limit.toString()} onValueChange={(v) => setLimit(Number(v))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Quantidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">Últimos 25</SelectItem>
              <SelectItem value="50">Últimos 50</SelectItem>
              <SelectItem value="100">Últimos 100</SelectItem>
              <SelectItem value="200">Últimos 200</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Eventos Recentes</CardTitle>
            <CardDescription>
              Mostrando os {logs?.length || 0} eventos mais recentes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!logs || logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Info className="h-12 w-12 mb-4 opacity-50" />
                <p>Nenhum log registrado ainda</p>
              </div>
            ) : (
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="mt-0.5">{getSeverityIcon(log.severity)}</div>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={getSeverityBadge(log.severity)} className="text-xs">
                            {log.eventType}
                          </Badge>
                          {log.tenantId && (
                            <span className="text-xs text-muted-foreground">
                              Tenant ID: {log.tenantId}
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm">{log.message}</p>
                        
                        {log.metadata && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              Ver metadados
                            </summary>
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                              {JSON.stringify(JSON.parse(log.metadata), null, 2)}
                            </pre>
                          </details>
                        )}
                        
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
