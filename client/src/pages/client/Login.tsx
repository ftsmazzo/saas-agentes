import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, LogIn, Mail, Lock } from "lucide-react";
import { toast } from "sonner";

export default function ClientLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  
  // Verificar se veio da ativação
  const urlParams = new URLSearchParams(window.location.search);
  const activated = urlParams.get('activated');
  
  useEffect(() => {
    if (activated === 'true') {
      toast.success("Conta ativada com sucesso! Faça login para continuar.");
    }
  }, [activated]);

  const loginMutation = trpc.auth.clientLogin.useMutation({
    onSuccess: (data) => {
      toast.success(`Bem-vindo, ${data.tenant?.companyName}!`);
      // Aguardar um pouco para garantir que o cookie foi definido
      // e então redirecionar para o painel do cliente
      setTimeout(() => {
        window.location.href = "/client/agents";
      }, 100);
    },
    onError: (err) => {
      // Tratar erros de validação do Zod
      let errorMessage = err.message;
      
      if (err.data?.code === 'BAD_REQUEST' && err.data?.zodError) {
        const zodError = err.data.zodError;
        const emailError = zodError.fieldErrors?.email?.[0];
        if (emailError) {
          errorMessage = emailError;
        } else {
          errorMessage = 'Por favor, verifique os dados informados';
        }
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Limpar espaços em branco do email
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      setError("Preencha todos os campos");
      return;
    }

    // Validação básica de email no frontend
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Por favor, insira um email válido");
      return;
    }

    loginMutation.mutate({ email: trimmedEmail, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
              <LogIn className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Login do Cliente</CardTitle>
          <CardDescription>
            Entre com seu email e senha para acessar seu painel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  disabled={loginMutation.isPending}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  disabled={loginMutation.isPending}
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
              size="lg"
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Entrar
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>
              Não tem uma conta?{" "}
              <a
                href="/"
                className="text-blue-600 hover:underline font-medium"
              >
                Assine um plano
              </a>
            </p>
            <p className="mt-2">
              Esqueceu sua senha?{" "}
              <a
                href="#"
                className="text-blue-600 hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  toast.info("Funcionalidade em desenvolvimento");
                }}
              >
                Recuperar senha
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

