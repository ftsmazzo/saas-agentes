import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, RefreshCw, CheckCircle2, XCircle, Smartphone, Play, Bot, Sparkles, PowerOff } from "lucide-react";
import ClientLayout from "@/components/ClientLayout";

export default function WhatsAppQRCode() {
  const [, setLocation] = useLocation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [forceQRCode, setForceQRCode] = useState(false);
  
  // Verificar se o agente existe
  const { data: agentConfig, isLoading: agentLoading } = trpc.agent.getConfig.useQuery();
  
  // Verificar se o agente está ativado
  const { data: agentStatus, isLoading: agentStatusLoading, refetch: refetchAgentStatus } = trpc.clientPanel.getAgentStatus.useQuery();
  
  // Só buscar QR Code se não estiver conectado ou se forçar
  const { data: qrData, isLoading: qrLoading, refetch: refetchQR } = trpc.clientPanel.getQRCode.useQuery(
    undefined,
    {
      enabled: !forceQRCode && !!agentConfig, // Só buscar se agente existir
      refetchOnWindowFocus: false,
    }
  );
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = trpc.clientPanel.getWhatsAppStatus.useQuery(
    undefined,
    {
      refetchInterval: (query) => {
        // Auto-refresh a cada 3 segundos se não estiver conectado
        const currentStatus = query.state.data?.status;
        // Parar polling quando estiver conectado (aceitar múltiplos valores)
        if (currentStatus === "open" || currentStatus === "connected" || currentStatus === "CONNECTED") {
          return false; // Parar quando conectado
        }
        return 3000; // Continuar atualizando a cada 3 segundos
      },
      refetchOnWindowFocus: true, // Atualizar quando voltar à janela
    }
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchStatus(), refetchQR()]);
    setIsRefreshing(false);
  };

  const activateAgentMutation = trpc.clientPanel.activateAgent.useMutation({
    onSuccess: async () => {
      alert("Agente ativado com sucesso! 🚀");
      await refetchAgentStatus(); // Atualizar status do agente
    },
    onError: (error) => {
      console.error("Erro ao ativar agente:", error);
      alert(`Erro ao ativar agente: ${error.message}`);
    },
  });

  const deactivateAgentMutation = trpc.clientPanel.deactivateAgent.useMutation({
    onSuccess: async () => {
      alert("Agente desativado com sucesso! O robô foi desligado.");
      await refetchAgentStatus(); // Atualizar status do agente
    },
    onError: (error) => {
      console.error("Erro ao desativar agente:", error);
      alert(`Erro ao desativar agente: ${error.message}`);
    },
  });

  const disconnectMutation = trpc.clientPanel.disconnectWhatsApp.useMutation({
    onSuccess: async () => {
      // Após desconectar, regenerar QR Code
      await refetchQR();
      await refetchStatus();
      setIsRefreshing(false);
    },
    onError: (error) => {
      console.error("Erro ao desconectar:", error);
      setIsRefreshing(false);
    },
  });

  const handleGenerateQRCode = async () => {
    setForceQRCode(false);
    setIsRefreshing(true);
    try {
      await refetchQR();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Tem certeza que deseja desconectar o WhatsApp? Você precisará escanear o QR Code novamente.")) {
      return;
    }
    setIsRefreshing(true);
    disconnectMutation.mutate();
  };

  const handleDeactivateAgent = async () => {
    if (!confirm("Tem certeza que deseja desligar o robô? O webhook e o Agent Bot serão removidos do Chatwoot.")) {
      return;
    }
    deactivateAgentMutation.mutate();
  };

  // Verificar se está conectado - simplificado e mais confiável
  const isConnected = status?.status === "open" || 
                      status?.status === "connected" || 
                      status?.status === "CONNECTED";
  
  const isLoading = qrLoading || statusLoading || agentLoading || agentStatusLoading;
  
  // Verificar se o agente está ativado
  const isAgentActivated = agentStatus?.isActivated || false;
  
  // Atualizar QR Code quando status mudar para conectado
  useEffect(() => {
    if (status?.status === "open" || status?.status === "connected" || status?.status === "CONNECTED") {
      refetchQR();
    }
  }, [status?.status, refetchQR]);

  // Se não tiver agente configurado, mostrar mensagem para criar
  if (!agentLoading && !agentConfig) {
    return (
      <ClientLayout>
        <div className="max-w-4xl mx-auto">
          <Card className="text-center py-12">
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <div className="rounded-full bg-primary/10 p-6">
                  <Bot className="h-12 w-12 text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Crie seu primeiro agente</h2>
                <p className="text-muted-foreground">
                  Antes de conectar o WhatsApp, você precisa criar e configurar seu agente de IA
                </p>
              </div>
              <Button
                onClick={() => setLocation("/client/create-agent")}
                size="lg"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Criar Agente
              </Button>
            </CardContent>
          </Card>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Conectar WhatsApp</h1>
        <p className="text-muted-foreground mt-2">
          Conecte sua conta do WhatsApp para começar a usar o agente de IA
        </p>
      </div>

      {/* Status Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Status da Conexão
            </CardTitle>
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              {isRefreshing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Atualizando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Atualizar Status
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando status...
            </div>
          ) : isConnected ? (
            <div className="space-y-3">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  WhatsApp conectado e pronto para uso!
                </AlertDescription>
              </Alert>
              {isAgentActivated ? (
                <>
                  <Button
                    disabled
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white cursor-not-allowed"
                    size="lg"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Agente Ativado
                  </Button>
                  <Button
                    onClick={handleDeactivateAgent}
                    disabled={deactivateAgentMutation.isPending}
                    variant="outline"
                    size="sm"
                    className="w-full border-red-300 text-red-600 hover:bg-red-50"
                  >
                    {deactivateAgentMutation.isPending ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin mr-2" />
                        Desligando robô...
                      </>
                    ) : (
                      <>
                        <PowerOff className="h-3 w-3 mr-2" />
                        Desligar Robô
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => activateAgentMutation.mutate()}
                  disabled={activateAgentMutation.isPending}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  {activateAgentMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Ativando agente...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Ativar Agente
                    </>
                  )}
                </Button>
              )}
              <Button
                onClick={handleDisconnect}
                disabled={isRefreshing || disconnectMutation.isPending}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {isRefreshing || disconnectMutation.isPending ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-2" />
                    Desconectando...
                  </>
                ) : (
                  "Desconectar WhatsApp"
                )}
              </Button>
            </div>
          ) : (
            <Alert className="border-yellow-200 bg-yellow-50">
              <XCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                WhatsApp não conectado. Escaneie o QR Code abaixo para conectar.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* QR Code Card */}
      {!isConnected && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>QR Code</CardTitle>
                <CardDescription>
                  Abra o WhatsApp no seu celular, vá em Configurações → Aparelhos conectados → Conectar um aparelho e escaneie este código
                </CardDescription>
              </div>
              <Button 
                onClick={handleGenerateQRCode} 
                disabled={isRefreshing || qrLoading}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                {isRefreshing || qrLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Gerar QR Code
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            {qrLoading ? (
              <div className="flex flex-col items-center gap-4 py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">Gerando QR Code...</p>
              </div>
            ) : qrData?.qrCode ? (
              <>
                <div className="bg-white p-4 rounded-lg shadow-md">
                  <img 
                    src={qrData.qrCode} 
                    alt="QR Code do WhatsApp" 
                    className="w-64 h-64"
                  />
                </div>
                <Button 
                  onClick={handleRefresh} 
                  disabled={isRefreshing}
                  variant="outline"
                  className="gap-2"
                >
                  {isRefreshing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Atualizando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Atualizar Status
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-4 py-12">
                <Alert variant="default" className="max-w-md">
                  <AlertDescription>
                    Nenhum QR Code disponível. Clique em "Gerar QR Code" para criar um novo.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Como Conectar</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Abra o WhatsApp no seu celular</li>
            <li>Toque em <strong>Mais opções</strong> (⋮) ou <strong>Configurações</strong></li>
            <li>Toque em <strong>Aparelhos conectados</strong></li>
            <li>Toque em <strong>Conectar um aparelho</strong></li>
            <li>Aponte seu celular para esta tela para escanear o código</li>
          </ol>
        </CardContent>
      </Card>
    </div>
    </ClientLayout>
  );
}
