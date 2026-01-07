import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, Bot, Zap, Shield, Check, MessageSquare, Settings, BarChart3, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Home() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [loadingCheckout, setLoadingCheckout] = useState<number | null>(null);
  const [checkoutModal, setCheckoutModal] = useState<{ open: boolean; planId: number | null }>({ open: false, planId: null });
  const [checkoutData, setCheckoutData] = useState({ email: "", companyName: "" });

  const { data: plans, isLoading: plansLoading } = trpc.plans.list.useQuery();
  const createPublicCheckout = trpc.payment.createPublicCheckoutSession.useMutation();

  // Tratar retorno do checkout do Stripe
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const checkoutStatus = searchParams.get('checkout');
    
    if (checkoutStatus === 'success') {
      toast.success('Pagamento realizado com sucesso! Você receberá um email com instruções para ativar sua conta.');
      // Limpar parâmetro da URL
      window.history.replaceState({}, '', '/');
    } else if (checkoutStatus === 'canceled') {
      toast.info('Checkout cancelado. Você pode tentar novamente quando quiser.');
      // Limpar parâmetro da URL
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const handleSubscribe = async (planId: number) => {
    // Abrir modal para coletar dados
    setCheckoutModal({ open: true, planId });
  };

  const handleCheckoutSubmit = async () => {
    if (!checkoutData.email || !checkoutData.companyName || !checkoutModal.planId) {
      toast.error("Preencha todos os campos");
      return;
    }

    setLoadingCheckout(checkoutModal.planId);
    try {
      const { checkoutUrl } = await createPublicCheckout.mutateAsync({
        planId: checkoutModal.planId,
        email: checkoutData.email,
        companyName: checkoutData.companyName,
      });
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    } catch (error: any) {
      toast.error(`Erro ao iniciar checkout: ${error.message}`);
      setLoadingCheckout(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">SaaS Agentes</span>
          </div>
          
          {user ? (
            <Button onClick={() => setLocation(user.role === 'admin' ? '/admin' : '/client')}>
              {user.role === 'admin' ? 'Painel Admin' : 'Meu Painel'}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setLocation('/client/login')}>
              Fazer Login
            </Button>
          )}
        </div>
      </header>
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-20 pb-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium">
            <Zap className="h-4 w-4" />
            Automatize seu atendimento com IA
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold text-gray-900 leading-tight">
            Agentes de IA para
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"> WhatsApp</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto">
            Conecte seu WhatsApp a um agente de IA inteligente que responde seus clientes 24/7, 
            com personalidade customizável e integração completa
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="lg" className="text-lg px-8 py-6" onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>
              Ver Planos
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
              Como Funciona
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Tudo que você precisa
            </h2>
            <p className="text-xl text-gray-600">
              Plataforma completa para gerenciar seu agente de IA
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2 hover:border-blue-200 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <MessageSquare className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>WhatsApp Integrado</CardTitle>
                <CardDescription>
                  Conecte seu WhatsApp Business em segundos com QR Code
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-blue-200 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <Bot className="h-6 w-6 text-indigo-600" />
                </div>
                <CardTitle>IA Personalizável</CardTitle>
                <CardDescription>
                  Configure o comportamento e personalidade do seu agente
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-blue-200 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle>Métricas em Tempo Real</CardTitle>
                <CardDescription>
                  Acompanhe conversas, satisfação e performance do agente
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-blue-200 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Settings className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>Fácil Configuração</CardTitle>
                <CardDescription>
                  Interface intuitiva para gerenciar tudo em um só lugar
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-blue-200 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-orange-600" />
                </div>
                <CardTitle>Respostas Instantâneas</CardTitle>
                <CardDescription>
                  Seu agente responde em segundos, 24 horas por dia
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-blue-200 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-red-600" />
                </div>
                <CardTitle>Seguro e Confiável</CardTitle>
                <CardDescription>
                  Seus dados protegidos com criptografia de ponta a ponta
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Escolha seu plano
            </h2>
            <p className="text-xl text-gray-600">
              Comece hoje e escale conforme sua necessidade
            </p>
          </div>

          {plansLoading ? (
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8">
              {plans?.filter((p: any) => p.isActive).map((plan: any) => (
                <Card key={plan.id} className={`relative border-2 ${plan.name.includes('Pro') ? 'border-blue-500 shadow-xl scale-105' : 'border-gray-200'}`}>
                  {plan.name.includes('Pro') && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                        Mais Popular
                      </span>
                    </div>
                  )}
                  
                  <CardHeader>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription className="text-base">{plan.description}</CardDescription>
                    <div className="pt-4">
                      <span className="text-3xl font-bold">R$ {(plan.priceMonthly / 100).toFixed(2)}</span>
                      <span className="text-gray-600 text-sm">/mês</span>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    {plan.monthlyCredits && (
                      <div className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">
                          <strong>{plan.monthlyCredits.toLocaleString('pt-BR')} créditos</strong> mensais incluídos
                        </span>
                      </div>
                    )}
                    {plan.description && plan.description.includes('clientes') && (
                      <div className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{plan.description}</span>
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Suporte por email</span>
                    </div>
                  </CardContent>
                  
                  <CardFooter className="flex-col gap-2">
                    <Button 
                      className="w-full" 
                      size="lg"
                      variant={plan.name.includes('Pro') ? 'default' : 'outline'}
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={loadingCheckout !== null}
                    >
                      {loadingCheckout === plan.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        'Assinar Agora'
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Perguntas Frequentes
            </h2>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Como funciona a integração com WhatsApp?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Após assinar, você receberá um email com link para ativar sua conta. 
                  No painel, basta escanear o QR Code com seu WhatsApp Business e pronto! 
                  O agente de IA estará conectado e pronto para responder seus clientes.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Posso personalizar as respostas do agente?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Sim! Você pode configurar a personalidade, tom de voz e instruções específicas 
                  para o agente. Ele aprende sobre seu negócio e responde de acordo com suas diretrizes.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Posso cancelar a qualquer momento?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Sim, sem burocracia! Você pode cancelar sua assinatura a qualquer momento 
                  pelo painel. Não há multas ou taxas de cancelamento.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">O que acontece se eu exceder os limites do plano?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Você receberá notificações quando estiver próximo do limite. 
                  Você pode fazer upgrade para um plano maior a qualquer momento, 
                  e a cobrança será proporcional ao período restante.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-12 text-white">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Pronto para automatizar seu atendimento?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Comece hoje e veja seus clientes sendo atendidos 24/7 por IA
          </p>
          <Button size="lg" variant="secondary" className="text-lg px-8 py-6" onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>
            Ver Planos
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Modal de Checkout */}
      {checkoutModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Complete seus dados</CardTitle>
              <CardDescription>
                Preencha as informações abaixo para prosseguir com a assinatura
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="seu@email.com"
                  value={checkoutData.email}
                  onChange={(e) => setCheckoutData({ ...checkoutData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Nome da Empresa</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Minha Empresa"
                  value={checkoutData.companyName}
                  onChange={(e) => setCheckoutData({ ...checkoutData, companyName: e.target.value })}
                />
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setCheckoutModal({ open: false, planId: null });
                  setLoadingCheckout(null);
                }}
                disabled={loadingCheckout !== null}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleCheckoutSubmit}
                disabled={loadingCheckout !== null}
              >
                {loadingCheckout ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...</>
                ) : (
                  "Continuar para Pagamento"
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-gray-600">
            <p>© 2025 SaaS Agentes. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
