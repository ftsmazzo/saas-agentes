# 📊 Diagrama: Fluxo do Prompt Dinâmico

## 🔄 Fluxo Atual vs Novo Fluxo

### ❌ FLUXO ATUAL (Prompt Fixo)

```
Webhook
  ↓
Edit Fields2 (extrai tenantId)
  ↓
Select rows from a table (busca tenant)
  ↓
Filter
  ↓
Info2
  ↓
... (outros nodes)
  ↓
Supervisor ← [PROMPT FIXO HARDCODED]
```

### ✅ FLUXO NOVO (Prompt Dinâmico)

```
Webhook
  ↓
Edit Fields2 (extrai tenantId)
  ↓
Select rows from a table (busca tenant)
  ↓
[NOVO] Buscar Configurações Agente (PostgreSQL)
  ↓
[NOVO] Criar Prompt Dinâmico (Code Node)
  ↓
Filter
  ↓
Info2
  ↓
... (outros nodes)
  ↓
Supervisor ← [PROMPT DINÂMICO: $('Criar Prompt Dinâmico').item.json.dynamicSystemPrompt]
```

---

## 📍 Onde Inserir os Novos Nodes

### Posição Exata no Workflow

```
┌─────────────────────────────────────────────────────────┐
│  Edit Fields2                                            │
│  (extrai tenantId)                                       │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Select rows from a table                                │
│  (busca tenant completo)                                 │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  [NOVO] Buscar Configurações Agente                     │
│  Tipo: PostgreSQL                                        │
│  Query: SELECT * FROM agentConfigs WHERE tenantId = ...  │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  [NOVO] Criar Prompt Dinâmico                            │
│  Tipo: Code Node (ou Set Node)                          │
│  Função: Monta prompt usando systemPrompt + companyInfo │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Filter                                                  │
│  (continua normalmente)                                  │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Info2                                                   │
│  (continua normalmente)                                  │
└─────────────────────────────────────────────────────────┘
```

---

## 🔗 Conexões Detalhadas

### 1. Conexão: Select rows → Buscar Configurações Agente

**De:** `Select rows from a table`  
**Para:** `Buscar Configurações Agente`  
**Tipo:** `main` (output principal)

**Dados disponíveis:**
- `$('Select rows from a table').item.json` → dados do tenant
- `$('Edit Fields2').item.json.tenantId` → ID do tenant

---

### 2. Conexão: Buscar Configurações → Criar Prompt Dinâmico

**De:** `Buscar Configurações Agente`  
**Para:** `Criar Prompt Dinâmico`  
**Tipo:** `main` (output principal)

**Dados disponíveis:**
- `$('Buscar Configurações Agente').item.json.systemPrompt`
- `$('Buscar Configurações Agente').item.json.companyInfo`
- `$('Buscar Configurações Agente').item.json.welcomeMessage`
- `$('Select rows from a table').item.json.companyName`

---

### 3. Conexão: Criar Prompt Dinâmico → Filter

**De:** `Criar Prompt Dinâmico`  
**Para:** `Filter`  
**Tipo:** `main` (output principal)

**Dados disponíveis:**
- `$('Criar Prompt Dinâmico').item.json.dynamicSystemPrompt` ← **USAR NO SUPERVISOR**

---

### 4. Modificação: Supervisor

**Node:** `Supervisor`  
**Campo a modificar:** `parameters.options.systemMessage`

**Antes:**
```
systemMessage: "=## **1. Identidade e Propósito**\n\nVocê é **CaduIA**..."
```

**Depois:**
```
systemMessage: "={{ $('Criar Prompt Dinâmico').item.json.dynamicSystemPrompt }}"
```

---

## 🎯 Resumo Visual das Mudanças

### Nodes a Adicionar

```
┌─────────────────────────────────────┐
│ 1. Buscar Configurações Agente     │
│    - Tipo: PostgreSQL               │
│    - Posição: Após "Select rows"   │
│    - Query: SELECT * FROM agent... │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 2. Criar Prompt Dinâmico           │
│    - Tipo: Code Node (recomendado) │
│    - Posição: Após "Buscar Config" │
│    - Função: Monta prompt dinâmico  │
└─────────────────────────────────────┘
```

### Nodes a Modificar

```
┌─────────────────────────────────────┐
│ Supervisor                         │
│ - Modificar: systemMessage         │
│ - De: Prompt fixo                  │
│ - Para: Prompt dinâmico             │
└─────────────────────────────────────┘
```

---

## ✅ Ordem de Implementação

1. ✅ **Adicionar** node "Buscar Configurações Agente"
2. ✅ **Conectar** "Select rows" → "Buscar Configurações Agente"
3. ✅ **Adicionar** node "Criar Prompt Dinâmico"
4. ✅ **Conectar** "Buscar Configurações Agente" → "Criar Prompt Dinâmico"
5. ✅ **Conectar** "Criar Prompt Dinâmico" → "Filter"
6. ✅ **Desconectar** "Select rows" → "Filter" (antiga conexão)
7. ✅ **Modificar** node "Supervisor" (systemMessage)
8. ✅ **Testar** workflow completo

---

## 🧪 Pontos de Teste

### Teste 1: Verificar Dados no "Buscar Configurações Agente"

Execute o workflow e verifique o output:
```json
{
  "systemPrompt": "Você é um assistente...",
  "companyInfo": "{...}",
  "welcomeMessage": "..."
}
```

### Teste 2: Verificar Prompt no "Criar Prompt Dinâmico"

Execute e verifique:
```json
{
  "dynamicSystemPrompt": "Você é um assistente... [prompt montado]",
  "tenantId": 10,
  "hasConfig": true
}
```

### Teste 3: Verificar Supervisor Usando Prompt Dinâmico

Execute e verifique que o Supervisor está usando:
```
{{ $('Criar Prompt Dinâmico').item.json.dynamicSystemPrompt }}
```

---

**Pronto para implementar! 🚀**

