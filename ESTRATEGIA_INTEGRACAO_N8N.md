# Estratégia de Integração Completa com Workflow N8N

## Objetivo

Criar uma comunicação bidirecional entre o sistema e o workflow N8N, permitindo:
- Sincronização de configurações do agente
- Atualização dinâmica do prompt do sistema
- Configuração de Tools/Agentes Especialistas
- Sincronização de dados de agendamento
- Configuração de RAG
- Monitoramento de execuções
- Sincronização de conversas e mensagens

## Arquitetura de Comunicação

### 1. Sistema → N8N (Comandos/Configurações)

**Canais:**
- **API N8N**: Para atualizar workflow, ativar/desativar, buscar estatísticas
- **Webhook N8N**: Para enviar comandos e atualizações de configuração
- **Variáveis de Ambiente do Workflow**: Para configurações estáticas

**Dados a Sincronizar:**
1. **Configuração do Agente**
   - `systemPrompt` (prompt principal)
   - `welcomeMessage`
   - `companyInfo` (JSON)
   - `toolsConfig` (quais tools estão ativos)
   - `schedulingConfig` (configuração de agendamento)
   - `ragConfig` (configuração de RAG)

2. **Configurações de Funcionalidades**
   - `enableHumanHandoff`
   - `enableAudioTranscription`
   - `enableImageProcessing`

3. **Dados do Tenant**
   - `tenantId`
   - `companyName`
   - `evolutionInstanceName`
   - `chatwootInboxId`

### 2. N8N → Sistema (Dados/Eventos)

**Canais:**
- **Webhook do Sistema**: N8N chama webhook do sistema para:
  - Salvar conversas e mensagens
  - Atualizar status de conexão WhatsApp
  - Reportar erros e eventos
  - Enviar métricas de uso

**Dados a Receber:**
1. **Conversas e Mensagens**
   - Novas mensagens recebidas
   - Mensagens enviadas pelo agente
   - Status de conversas

2. **Eventos**
   - WhatsApp conectado/desconectado
   - Erros de execução
   - Uso de tokens OpenAI
   - Execuções de workflows

3. **Métricas**
   - Número de mensagens processadas
   - Tempo de resposta
   - Taxa de sucesso

## Estratégia de Implementação

### Fase 1: Sincronização de Configurações

**Objetivo:** Quando o cliente atualizar configurações no sistema, o workflow N8N deve receber essas atualizações.

**Implementação:**
1. Criar endpoint no sistema para receber atualizações de configuração
2. Criar função `syncAgentConfigToN8N()` que:
   - Busca configuração atual do agente
   - Envia via webhook para o workflow N8N
   - Workflow N8N atualiza suas variáveis internas

**Arquivos:**
- `server/n8n-integration.ts` - Adicionar `syncAgentConfigToN8N()`
- `server/routers.ts` - Chamar sync após atualizar configuração
- Workflow N8N - Criar node para receber e processar atualizações

### Fase 2: Webhook do Sistema para Receber Dados

**Objetivo:** Criar webhook no sistema para receber dados do N8N.

**Implementação:**
1. Criar rota `/api/webhooks/n8n/:tenantId`
2. Receber payload do N8N com:
   - Tipo de evento (message, conversation, error, metrics)
   - Dados do evento
3. Processar e salvar no banco de dados

**Arquivos:**
- `server/webhooks/n8n.ts` - Novo arquivo
- `server/_core/index.ts` - Registrar rota
- Workflow N8N - Configurar chamada HTTP para webhook

### Fase 3: Sincronização de Tools/Agentes Especialistas

**Objetivo:** Ativar/desativar tools no workflow baseado na configuração.

**Implementação:**
1. Mapear tools do sistema para nodes do workflow
2. Quando tool for ativado/desativado:
   - Atualizar workflow N8N via API
   - Habilitar/desabilitar nodes específicos
3. Sincronizar configurações específicas de cada tool

**Tools e seus Nodes no Workflow:**
- `agentSQL` → Node "AgenteSQL"
- `agentTerritorio` → Node "AgenteTerritorio"
- `vectorRAG` → Node "Vector"
- `buscaEndereco` → Node "BuscaEndereco"
- `scheduling` → Node de agendamento (a criar)

### Fase 4: Sincronização de Agendamento

**Objetivo:** Configurar dados de agendamento no workflow.

**Implementação:**
1. Criar node no workflow para gerenciar agendamentos
2. Sincronizar `schedulingConfig` do sistema para o workflow
3. Workflow usa esses dados para validar horários

### Fase 5: Sincronização de RAG

**Objetivo:** Configurar base de conhecimento no workflow.

**Implementação:**
1. Sincronizar `ragConfig` (kbId, apiUrl) para o workflow
2. Workflow usa essas configurações no node "Vector"

### Fase 6: Monitoramento e Métricas

**Objetivo:** Receber métricas de execução do workflow.

**Implementação:**
1. Workflow envia métricas via webhook após cada execução
2. Sistema salva em `usageMetrics`
3. Dashboard mostra estatísticas

## Estrutura de Dados

### Payload Sistema → N8N

```json
{
  "action": "update_config",
  "tenantId": 1,
  "config": {
    "systemPrompt": "...",
    "welcomeMessage": "...",
    "companyInfo": {...},
    "tools": {
      "agentSQL": true,
      "agentTerritorio": true,
      "vectorRAG": false,
      "buscaEndereco": true,
      "scheduling": false
    },
    "scheduling": {
      "enabled": false,
      "businessHours": {...},
      "timezone": "..."
    },
    "rag": {
      "enabled": false,
      "kbId": "",
      "apiUrl": ""
    },
    "features": {
      "enableHumanHandoff": true,
      "enableAudioTranscription": true,
      "enableImageProcessing": true
    }
  },
  "timestamp": "2025-01-20T10:00:00Z"
}
```

### Payload N8N → Sistema

```json
{
  "eventType": "message_received" | "message_sent" | "conversation_updated" | "error" | "metrics",
  "tenantId": 1,
  "data": {
    // Dados específicos do evento
  },
  "timestamp": "2025-01-20T10:00:00Z"
}
```

## Ordem de Implementação

1. ✅ **Fase 1**: Sincronização de Configurações Básicas (systemPrompt, welcomeMessage)
2. ✅ **Fase 2**: Webhook do Sistema para Receber Dados
3. ✅ **Fase 3**: Sincronização de Tools
4. ✅ **Fase 4**: Sincronização de Agendamento
5. ✅ **Fase 5**: Sincronização de RAG
6. ✅ **Fase 6**: Monitoramento e Métricas

## Próximos Passos

1. Criar função `syncAgentConfigToN8N()` no `server/n8n-integration.ts`
2. Criar webhook handler em `server/webhooks/n8n.ts`
3. Atualizar workflow N8N para:
   - Receber atualizações de configuração
   - Enviar dados para webhook do sistema
4. Testar comunicação bidirecional
5. Ajustar funções uma a uma conforme necessário

