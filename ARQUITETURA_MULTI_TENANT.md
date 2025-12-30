# 🏗️ Arquitetura Multi-Tenant - Integração de Tabelas do Template

## 📋 Análise da Situação Atual

### Modelo Atual (Correto ✅)
- **Banco único PostgreSQL** compartilhado por todos os tenants
- **Isolamento por `tenantId`** em cada tabela
- **Credenciais armazenadas** na tabela `tenants` (dbHost, dbName, dbUser, dbPassword)
- **Mesmas credenciais** para todos (apontam para o mesmo banco)

### Tabelas do Template a Integrar
1. `chat_messages` → Já existe `chatMessages` (precisa adaptar campos)
2. `dados_cliente` → Integrar com `contacts` ou criar tabela complementar
3. `documents` → **Nova tabela** para RAG (vector embeddings)
4. `chats` → Integrar com `conversations` ou adicionar campos

## ✅ Resposta à Sua Pergunta

**"O correto seria ter um conjunto de tabelas base para cada agente separado correto?"**

**NÃO!** O modelo atual está correto:

### ✅ Modelo Recomendado (Atual)
- **1 banco único** com todas as tabelas
- **Isolamento por `tenantId`** em cada tabela
- **Vantagens**:
  - Mais eficiente (menos overhead)
  - Mais fácil de gerenciar
  - Backup único
  - Escalável horizontalmente
  - Padrão da indústria para SaaS

### ❌ Modelo NÃO Recomendado
- **Múltiplos bancos** (um por tenant)
- **Desvantagens**:
  - Overhead de conexões
  - Backup complexo
  - Migrações complicadas
  - Mais custoso

## 🔧 Como Funciona o Isolamento

### 1. Todas as Queries Filtram por `tenantId`
```sql
-- ✅ CORRETO: Sempre filtrar por tenantId
SELECT * FROM chat_messages WHERE tenant_id = 10;

-- ❌ ERRADO: Sem filtro (vaza dados de outros tenants)
SELECT * FROM chat_messages;
```

### 2. N8N Workflow Recebe `tenantId`
- O workflow N8N recebe o `tenantId` como variável
- Todas as queries SQL no N8N devem incluir `WHERE tenant_id = {{ $json.tenantId }}`

### 3. Credenciais na Tabela `tenants`
- `dbHost`, `dbName`, `dbUser`, `dbPassword` armazenam as credenciais
- Atualmente apontam para o mesmo banco compartilhado
- O N8N usa essas credenciais + `tenantId` para fazer queries isoladas

## 📊 Estrutura de Tabelas Proposta

### Tabelas Existentes (Manter)
- ✅ `contacts` - Contatos dos clientes (com `tenantId`)
- ✅ `conversations` - Conversas (com `tenantId`)
- ✅ `chatMessages` - Mensagens (com `tenantId`)

### Novas Tabelas a Criar

#### 1. `clientData` (substitui `dados_cliente`)
- Campos: `tenantId`, `phone`, `name`, `aiService` (atendimento_ia)
- Relaciona com `contacts`

#### 2. `documents` (RAG - Vector Embeddings)
- Campos: `tenantId`, `content`, `metadata` (JSONB), `embedding` (vector)
- Função: `match_documents()` para busca vetorial

#### 3. Campos Adicionais em `conversations`
- `etapa_followup` (numeric) - Etapa do follow-up
- Manter compatibilidade com template

## 🚀 Próximos Passos

1. ✅ Criar schema atualizado no Drizzle
2. ✅ Criar script SQL de migração
3. ✅ Adicionar extensão `pgvector` para embeddings
4. ✅ Atualizar `tenant-provisioning.ts` se necessário
5. ✅ Documentar como o N8N deve usar `tenantId`

