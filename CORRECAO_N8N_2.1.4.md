# ✅ Correção: Integração N8N 2.1.4

## 📋 Problemas Identificados

1. **N8N 2.1.4 mudou de `active` para `published`**
   - O sistema ainda usava `active: true/false`
   - Workflows não eram publicados corretamente
   - Erro: "Workflow N8N não provisionado" mesmo com workflow criado

2. **Path do webhook duplicado**
   - Configuração: `/webhook/tenant_10`
   - Resultado: `/webhook/webhook/tenant_10` (duplicação)
   - Causa: N8N adiciona `/webhook` automaticamente

3. **Falta de verificação de publicação**
   - Sistema não verificava se workflow estava publicado antes de ativar agente

---

## ✅ Correções Aplicadas

### 1. **server/n8n-integration.ts**

#### 1.1. Path do Webhook Corrigido
```typescript
// ANTES
path: `/webhook/tenant_${tenantId}`

// DEPOIS
path: `tenant_${tenantId}`  // N8N adiciona /webhook automaticamente
```

#### 1.2. Publicação do Workflow (cloneWorkflowForTenant)
```typescript
// ANTES
await n8nApi.post(`/workflows/${newWorkflowId}/activate`);

// DEPOIS
await n8nApi.patch(`/workflows/${newWorkflowId}`, { published: true });
```

#### 1.3. Função activateWorkflow
```typescript
// ANTES
await n8nApi.patch(`/workflows/${workflowId}`, { active: true });

// DEPOIS
await n8nApi.patch(`/workflows/${workflowId}`, { published: true });
```

#### 1.4. Função deactivateWorkflow
```typescript
// ANTES
await n8nApi.patch(`/workflows/${workflowId}`, { active: false });

// DEPOIS
await n8nApi.patch(`/workflows/${workflowId}`, { published: false });
```

#### 1.5. Nova Função: isWorkflowPublished
```typescript
export async function isWorkflowPublished(workflowId: string): Promise<boolean> {
  const response = await n8nApi.get(`/workflows/${workflowId}`);
  const workflow = response.data.data || response.data;
  return workflow.published === true || workflow.active === true; // Compatibilidade
}
```

### 2. **server/routers.ts**

#### 2.1. Verificação de Publicação Antes de Ativar
```typescript
// Verificar se o workflow está publicado (N8N 2.1.4+)
const isPublished = await isWorkflowPublished(tenant.n8nWorkflowId);
if (!isPublished) {
  console.log(`[Client] ⚠️ Workflow não está publicado. Tentando publicar...`);
  try {
    await activateWorkflow(tenant.n8nWorkflowId);
    console.log(`[Client] ✅ Workflow publicado com sucesso`);
  } catch (error: any) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: `Workflow N8N não está publicado e não foi possível publicar: ${error.message}`,
    });
  }
}
```

---

## 🎯 Resultado Esperado

### Antes das Correções:
- ❌ Workflow criado mas não publicado
- ❌ Path do webhook: `/webhook/webhook/tenant_10` (duplicado)
- ❌ Erro ao ativar agente: "Workflow N8N não provisionado"

### Depois das Correções:
- ✅ Workflow criado e publicado automaticamente
- ✅ Path do webhook: `/webhook/tenant_10` (correto)
- ✅ Verificação automática de publicação antes de ativar
- ✅ Publicação automática se não estiver publicado

---

## 📝 Notas Importantes

1. **Compatibilidade com Versões Antigas**
   - A função `isWorkflowPublished` verifica tanto `published` quanto `active` para compatibilidade
   - Funciona com N8N 2.1.4+ e versões anteriores

2. **Path do Webhook**
   - O N8N adiciona `/webhook` automaticamente na URL base
   - Portanto, o path deve ser apenas `tenant_10`, não `/webhook/tenant_10`
   - URL final: `https://n8n.example.com/webhook/tenant_10`

3. **Publicação Automática**
   - Se o workflow não estiver publicado ao tentar ativar o agente, o sistema tenta publicar automaticamente
   - Se falhar, retorna erro claro para o usuário

---

## 🧪 Como Testar

1. **Criar nova assinatura**
   - Workflow deve ser criado e publicado automaticamente
   - Verificar no N8N se workflow está "Published"

2. **Ativar agente**
   - Deve funcionar sem erros
   - Verificar logs para confirmar publicação

3. **Verificar webhook**
   - URL deve ser: `https://seu-n8n.com/webhook/tenant_X`
   - Não deve ter duplicação de `/webhook`

---

## 📊 Arquivos Modificados

- ✅ `server/n8n-integration.ts` - Correções principais
- ✅ `server/routers.ts` - Verificação de publicação

---

**Data**: 2025-01-29
**Status**: Correções aplicadas ✅

