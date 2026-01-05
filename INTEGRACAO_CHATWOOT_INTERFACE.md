# 💬 Integração de Interface Chatwoot no Painel

## 📋 Objetivo

Criar uma interface dentro do painel do sistema SaaS onde cada tenant possa visualizar e interagir com suas mensagens do Chatwoot, como se tivesse um Chatwoot exclusivo, mas usando o Chatwoot central.

## ✅ Viabilidade

**SIM, é totalmente viável!** O sistema já possui:
- ✅ Integração com Chatwoot central
- ✅ Cada tenant tem seu próprio inbox (`chatwootInboxId`)
- ✅ Funções para buscar conversas e mensagens
- ✅ API do Chatwoot disponível

## 🏗️ Arquitetura Proposta

### 1. Backend (tRPC Routes)

Criar endpoints em `server/routers.ts`:

```typescript
chatwoot: router({
  // Listar conversas do inbox do tenant
  getMyConversations: protectedProcedure.query(...),
  
  // Buscar mensagens de uma conversa
  getConversationMessages: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(...),
  
  // Enviar mensagem em uma conversa
  sendMessage: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
      content: z.string(),
      messageType: z.enum(['outgoing', 'incoming']).default('outgoing')
    }))
    .mutation(...),
  
  // Atualizar status da conversa
  updateConversationStatus: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
      status: z.enum(['open', 'resolved', 'pending'])
    }))
    .mutation(...),
  
  // Buscar detalhes de uma conversa
  getConversationDetails: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(...),
})
```

### 2. Frontend (Nova Página)

Criar `client/src/pages/client/Messages.tsx` com:
- Lista de conversas (sidebar esquerda)
- Área de mensagens (centro)
- Informações do contato (sidebar direita, opcional)
- Input para enviar mensagens
- Status das conversas (aberta, resolvida, pendente)

### 3. Funcionalidades

#### Visualização
- ✅ Lista de conversas ordenadas por última mensagem
- ✅ Badge com número de mensagens não lidas
- ✅ Filtros: Todas, Abertas, Resolvidas, Pendentes
- ✅ Busca por nome do contato

#### Interação
- ✅ Visualizar mensagens de uma conversa
- ✅ Enviar mensagens de texto
- ✅ Enviar mensagens com mídia (futuro)
- ✅ Marcar conversa como resolvida/aberta
- ✅ Atualização em tempo real (polling ou WebSocket)

#### Segurança
- ✅ Cada tenant só vê suas próprias conversas (filtrado por `chatwootInboxId`)
- ✅ Validação de permissões no backend
- ✅ Isolamento completo entre tenants

## 🔧 Implementação Técnica

### Backend - Funções Necessárias

1. **Enviar Mensagem**
```typescript
export async function sendChatwootMessage(
  conversationId: number,
  content: string,
  messageType: 'outgoing' | 'incoming' = 'outgoing'
): Promise<any> {
  const accountId = process.env.CHATWOOT_ACCOUNT_ID;
  const response = await chatwootApi.post(
    `/accounts/${accountId}/conversations/${conversationId}/messages`,
    {
      content,
      message_type: messageType,
      private: false,
      content_type: 'text'
    }
  );
  return response.data;
}
```

2. **Atualizar Status da Conversa**
```typescript
export async function updateConversationStatus(
  conversationId: number,
  status: 'open' | 'resolved' | 'pending'
): Promise<any> {
  const accountId = process.env.CHATWOOT_ACCOUNT_ID;
  const response = await chatwootApi.put(
    `/accounts/${accountId}/conversations/${conversationId}`,
    { status }
  );
  return response.data;
}
```

3. **Buscar Detalhes da Conversa**
```typescript
export async function getConversationDetails(conversationId: number): Promise<any> {
  const accountId = process.env.CHATWOOT_ACCOUNT_ID;
  const response = await chatwootApi.get(
    `/accounts/${accountId}/conversations/${conversationId}`
  );
  return response.data.payload || response.data;
}
```

### Frontend - Componentes

1. **MessagesPage** - Página principal
2. **ConversationList** - Lista de conversas
3. **MessageThread** - Thread de mensagens
4. **MessageInput** - Input para enviar mensagens
5. **ConversationHeader** - Cabeçalho com info do contato

## 🎨 Design da Interface

```
┌─────────────────────────────────────────────────────────┐
│  Mensagens                          [Filtros] [Buscar]  │
├──────────┬──────────────────────────┬────────────────────┤
│          │  João Silva              │  📱 +55 11 999...  │
│ Conversa │  Última mensagem...     │  📧 joao@email...  │
│ 1        │  [2h atrás]              │                    │
│          ├──────────────────────────┤  Status: Aberta    │
│ Conversa │                          │  [Resolver]        │
│ 2        │  Mensagens da conversa   │                    │
│          │                          │                    │
│ Conversa │  [Scroll de mensagens]   │                    │
│ 3        │                          │                    │
│          │                          │                    │
│ ...      │  [Input de mensagem]     │                    │
│          │  [Enviar]                │                    │
└──────────┴──────────────────────────┴────────────────────┘
```

## 📊 Fluxo de Dados

```
Frontend (Messages.tsx)
    ↓
tRPC Router (chatwoot.getMyConversations)
    ↓
chatwoot-integration.ts (getInboxConversations)
    ↓
Chatwoot API (GET /conversations?inbox_id=X)
    ↓
Retorna apenas conversas do inbox do tenant
```

## 🔒 Segurança e Isolamento

1. **Backend sempre valida:**
   - Tenant ID do usuário logado
   - `chatwootInboxId` do tenant
   - Filtra conversas apenas do inbox do tenant

2. **Frontend:**
   - Não expõe IDs de outros tenants
   - Não permite acesso direto à API do Chatwoot

## 🚀 Vantagens desta Abordagem

1. ✅ **Isolamento Total**: Cada tenant vê apenas suas conversas
2. ✅ **Experiência Unificada**: Interface integrada ao painel
3. ✅ **Sem Duplicação**: Usa o Chatwoot central existente
4. ✅ **Manutenção Simples**: Uma única instância do Chatwoot
5. ✅ **Escalável**: Fácil adicionar novos tenants

## 📝 Próximos Passos

1. ✅ Adicionar funções no `chatwoot-integration.ts`
2. ✅ Criar rotas tRPC no `server/routers.ts`
3. ✅ Criar página `Messages.tsx` no frontend
4. ✅ Adicionar rota no menu de navegação
5. ✅ Testar isolamento entre tenants
6. ✅ Adicionar atualização em tempo real (opcional)

## 🔮 Melhorias Futuras

- [x] ✅ **Filtro de mensagens do Evolution API** - Mensagens do sistema são ocultadas automaticamente
- [x] ✅ **Busca dentro das mensagens** - Busca por conteúdo nas mensagens da conversa
- [x] ✅ **Suporte para anexos** - Visualização de imagens e arquivos nas mensagens
- [x] ✅ **Envio de mídia** - Upload e envio de imagens, áudios e documentos com preview
- [ ] WebSocket para atualização em tempo real (atualmente usa polling a cada 5s)
- [ ] Notificações de novas mensagens
- [ ] Tags e labels nas conversas
- [ ] Atribuição de agentes
- [ ] Histórico e busca avançada (busca básica implementada)
- [ ] Exportação de conversas

