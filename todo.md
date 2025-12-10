# TODO - SaaS de Agentes N8N

## URGENTE - Fluxo Completo de Assinatura (PRIORIDADE MÁXIMA)

### 1. Webhook do Stripe
- [x] Criar endpoint `/api/webhooks/stripe` para receber eventos do Stripe
- [x] Configurar validação de assinatura do webhook (modo desenvolvimento sem validação)
- [x] Processar evento `checkout.session.completed`
- [x] Extrair email e plano do cliente do evento

### 2. Provisionamento Automático
- [ ] Criar tenant automaticamente após pagamento confirmado
- [ ] Provisionar Evolution API instance
- [ ] Provisionar N8N workflow
- [ ] Gerar token de ativação único
- [ ] Salvar tudo no banco de dados

### 3. Email de Ativação
- [ ] Implementar envio de email automático após pagamento
- [ ] Template de email com link de ativação
- [ ] Link deve levar para `/activate/:token`

### 4. Página de Ativação
- [x] Criar página `/activate/:token`
- [x] Validar token de ativação
- [x] Formulário para cliente definir senha
- [x] Criar hash de senha e salvar no banco
- [x] Marcar conta como ativada

### 5. Sistema de Login
- [ ] Criar página `/client/login`
- [ ] Formulário de login com email + senha
- [ ] Validar credenciais
- [ ] Criar sessão do cliente
- [ ] Redirecionar para painel do cliente

### 6. Painel do Cliente
- [ ] Criar ClientLayout com sidebar
- [ ] Página de QR Code do WhatsApp
- [ ] Página de configuração do agente
- [ ] Proteger rotas (só acessa se logado)
- [ ] Buscar tenant pelo userId do cliente logado

### 7. Bugs Existentes
- [ ] Corrigir exclusão de tenant (está marcando como deleted mas não remove da lista)
- [ ] Remover páginas soltas que não fazem parte do fluxo

## Implementado ✅
- [x] Landing page com pricing
- [x] Integração Stripe checkout
- [x] Provisionamento real (Evolution + N8N + Chatwoot)
- [x] Painel admin funcional
- [x] CRUD de planos
- [x] CRUD de tenants (admin)
- [x] Logs de plataforma

## BUGS CRÍTICOS (BLOQUEADORES)
- [x] Erro de permissão 10002 ao acessar /admin/setup (usuário com role "user" não pode acessar)
- [x] Loop de redirecionamento em WelcomePage causando erro "Cannot update component while rendering"
- [x] Usuário fica preso entre páginas sem conseguir voltar ao admin
- [ ] Planos não podem ser excluídos, alterados ou adicionados
- [x] Stripe configurado com chave do sandbox

## CONFIGURAÇÃO STRIPE (URGENTE)
- [x] Verificar planos cadastrados no banco de dados
- [x] Criar produtos no Stripe Dashboard correspondentes aos planos
- [x] Atualizar tabela plans com stripe_price_id corretos
- [x] Configurar chave do Stripe Sandbox
- [ ] Testar checkout end-to-end
- [ ] Configurar webhook do Stripe para receber eventos de pagamento

## TAREFAS FINAIS
- [ ] Configurar webhook do Stripe para provisionamento automático
- [ ] Testar fluxo completo: pagamento → webhook → email → ativação → login
- [ ] Corrigir CRUD de planos (editar, excluir, adicionar)
- [ ] Testar sistema end-to-end

## BUG CRÍTICO WEBHOOK
- [x] Rota /api/webhooks/stripe retorna 404 na versão publicada - precisa republicar

## SISTEMA DE TESTE SIMULADO (NOVA PRIORIDADE)
- [x] Criar endpoint tRPC para simular pagamento sem Stripe
- [x] Adicionar botão "Modo Teste" na interface de planos
- [x] Testar fluxo completo de provisionamento (tenant + N8N + Evolution + email)
