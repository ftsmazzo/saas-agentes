# ✅ Expressões N8N Corrigidas - Extrair tenantId e agentId

## ❌ Problema

Quando você usa `const` diretamente em expressões N8N, dá erro:
```javascript
{{const path = $json.webhookUrl.split('/webhook/')[1] || $json.webhookUrl.split('/').pop(); const match = path.match(/tenant_(\d+)/i); return match ? parseInt(match[1]) : null;}}
```

## ✅ Solução: Usar Função Anônima (IIFE)

Em expressões N8N, você precisa usar uma função anônima que retorna o valor diretamente.

### Campo `webhookPath` (extrair path completo):
- **Name:** `webhookPath`
- **Value:** `={{$json.webhookUrl.split('/webhook/')[1] || $json.webhookUrl.split('/').pop() }}`
- **Type:** String
- **Exemplo:** `tenant_52/agent_14`

### Campo `tenantId` (extrair do path):
- **Name:** `tenantId`
- **Value:** `={{(function() { const path = $json.webhookUrl.split('/webhook/')[1] || $json.webhookUrl.split('/').pop(); const match = path ? path.match(/tenant_(\d+)/i) : null; return match ? parseInt(match[1]) : null; })()}}`
- **Type:** Number

**OU versão mais simples (sem função):**
- **Value:** `={{$json.webhookUrl ? (($json.webhookUrl.split('/webhook/')[1] || $json.webhookUrl.split('/').pop() || '').match(/tenant_(\d+)/i) || [])[1] : null}}`
- **Type:** Number

**OU versão ainda mais simples (recomendada):**
- **Value:** `={{$json.webhookUrl ? parseInt(($json.webhookUrl.split('/webhook/')[1] || $json.webhookUrl.split('/').pop() || '').split('/')[0].replace(/^tenant_/i, '')) || null : null}}`
- **Type:** Number

### Campo `agentId` (extrair do path):
- **Name:** `agentId`
- **Value:** `={{(function() { const path = $json.webhookUrl.split('/webhook/')[1] || $json.webhookUrl.split('/').pop(); const match = path ? path.match(/agent_(\d+)/i) : null; return match ? parseInt(match[1]) : null; })()}}`
- **Type:** Number

**OU versão mais simples (sem função):**
- **Value:** `={{$json.webhookUrl ? (($json.webhookUrl.split('/webhook/')[1] || $json.webhookUrl.split('/').pop() || '').match(/agent_(\d+)/i) || [])[1] : null}}`
- **Type:** Number

**OU versão ainda mais simples (recomendada):**
- **Value:** `={{$json.webhookUrl ? parseInt(($json.webhookUrl.split('/webhook/')[1] || $json.webhookUrl.split('/').pop() || '').split('/').pop().replace(/^agent_/i, '')) || null : null}}`
- **Type:** Number

## 🎯 Versão Final Recomendada (Mais Simples e Funcional)

### Configuração no Node "Edit Fields2":

| Name | Value | Type |
|------|-------|------|
| `webhookPath` | `={{$json.webhookUrl.split('/webhook/')[1] || $json.webhookUrl.split('/').pop() }}` | String |
| `tenantId` | `={{$json.webhookUrl ? parseInt(($json.webhookUrl.split('/webhook/')[1] || $json.webhookUrl.split('/').pop() || '').split('/')[0].replace(/^tenant_/i, '')) || null : null}}` | Number |
| `agentId` | `={{$json.webhookUrl ? parseInt(($json.webhookUrl.split('/webhook/')[1] || $json.webhookUrl.split('/').pop() || '').split('/').pop().replace(/^agent_/i, '')) || null : null}}` | Number |

## 📝 Explicação da Versão Recomendada

### Para `tenantId`:
1. `$json.webhookUrl.split('/webhook/')[1]` - Tenta pegar a parte após `/webhook/`
2. `|| $json.webhookUrl.split('/').pop()` - Se não encontrar, pega a última parte da URL
3. `|| ''` - Se ainda não encontrar, usa string vazia
4. `.split('/')[0]` - Divide por `/` e pega a primeira parte (ex: `tenant_52`)
5. `.replace(/^tenant_/i, '')` - Remove o prefixo `tenant_` (case-insensitive)
6. `parseInt(...)` - Converte para número
7. `|| null` - Se não conseguir converter, retorna `null`

### Para `agentId`:
1. `$json.webhookUrl.split('/webhook/')[1]` - Tenta pegar a parte após `/webhook/`
2. `|| $json.webhookUrl.split('/').pop()` - Se não encontrar, pega a última parte da URL
3. `|| ''` - Se ainda não encontrar, usa string vazia
4. `.split('/').pop()` - Divide por `/` e pega a última parte (ex: `agent_14`)
5. `.replace(/^agent_/i, '')` - Remove o prefixo `agent_` (case-insensitive)
6. `parseInt(...)` - Converte para número
7. `|| null` - Se não conseguir converter, retorna `null`

## 🔍 Exemplo de URLs e Resultados

| URL | webhookPath | tenantId | agentId |
|-----|-------------|----------|---------|
| `https://n8n.example.com/webhook/tenant_52/agent_14` | `tenant_52/agent_14` | `52` | `14` |
| `https://n8n.example.com/webhook/tenant_52` | `tenant_52` | `52` | `null` |
| `https://n8n.example.com/webhook/agent_14` | `agent_14` | `null` | `14` |

## ✅ Teste

Após configurar, teste executando o workflow e verificando os valores:
- `webhookPath` deve conter o path completo (ex: `tenant_52/agent_14`)
- `tenantId` deve ser um número (ex: `52`) ou `null`
- `agentId` deve ser um número (ex: `14`) ou `null`

