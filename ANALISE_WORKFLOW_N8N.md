# 📊 Análise do Workflow N8N - Agente SaaS

## 🔍 Análise do Workflow Atual

### ✅ O que o workflow faz bem:
1. **Transcrição de áudio**: Já transcreve áudio recebido usando OpenAI Whisper
2. **Processamento de imagens**: Analisa imagens com GPT-4 Vision
3. **Processamento de PDFs**: Extrai texto de PDFs
4. **Sistema de memória**: Usa PostgreSQL para histórico de conversas
5. **Sistema de fila**: Usa Redis para enfileirar mensagens
6. **Agente supervisor**: Usa LangChain com tools (AgenteSQL, AgenteTerritorio, Vector, etc.)
7. **Split de mensagens**: Divide respostas longas em múltiplas mensagens
8. **Pausa/Reativação de IA**: Permite atendimento humano

### ❌ Problemas Identificados:

#### 1. **Hardcoded - Prompt do Sistema**
- **Linha 1501-1504**: Prompt está fixo para "CaduIA" e Vigilância SocioAssistencial
- **Solução**: Tornar configurável via variável de ambiente ou API

#### 2. **Hardcoded - Banco de Dados**
- **Linha 116-130**: Usa Supabase (não MySQL como o projeto)
- **Linha 991-1004**: Usa PostgreSQL para histórico (pode manter, mas precisa ser configurável)
- **Solução**: Adaptar para usar MySQL do tenant ou tornar configurável

#### 3. **Hardcoded - Credenciais**
- **Linha 48-50**: Credenciais OpenAI hardcoded
- **Linha 125-129**: Credenciais Supabase hardcoded
- **Linha 283-286**: Credenciais Redis hardcoded
- **Solução**: Usar variáveis de ambiente ou credenciais do tenant

#### 4. **Falta Resposta em Áudio**
- **Linha 517-534**: Só transcreve áudio recebido (OpenAI Whisper)
- **Não tem**: Geração de áudio com ElevenLabs quando recebe áudio
- **Solução**: Adicionar nó ElevenLabs após gerar resposta de texto

#### 5. **Não Multi-Tenant**
- **Linha 112**: Busca telefone sem filtro de tenant
- **Linha 140**: Insere chat sem tenant_id
- **Solução**: Adicionar tenant_id em todas as queries

#### 6. **Não Integrado com Configurações**
- Não usa `agentConfigs` do banco
- Não aplica `systemPrompt`, `tone`, `welcomeMessage` do tenant
- **Solução**: Buscar configurações via API e injetar no workflow

#### 7. **URLs Hardcoded**
- **Linha 1617**: URL Chatwoot hardcoded
- **Linha 2299**: URL Vector hardcoded
- **Solução**: Tornar configurável via variáveis de ambiente

---

## 🎯 Plano de Ação

### FASE 1: Tornar Workflow Configurável (Prioridade ALTA)

#### 1.1 Variáveis de Ambiente Necessárias
```env
# Configurações do Agente (injetadas no workflow)
AGENT_SYSTEM_PROMPT={{ systemPrompt do agentConfigs }}
AGENT_TONE={{ tone do agentConfigs }}
AGENT_WELCOME_MESSAGE={{ welcomeMessage do agentConfigs }}
AGENT_COMPANY_INFO={{ companyInfo do agentConfigs }}

# URLs e Credenciais
CHATWOOT_URL={{ url do Chatwoot do tenant }}
EVOLUTION_API_URL={{ url da Evolution API }}
EVOLUTION_API_KEY={{ key da Evolution API }}
ELEVENLABS_API_KEY={{ key do ElevenLabs }}

# Banco de Dados
DB_HOST={{ dbHost do tenant }}
DB_PORT={{ dbPort do tenant }}
DB_NAME={{ dbName do tenant }}
DB_USER={{ dbUser do tenant }}
DB_PASSWORD={{ dbPassword do tenant }}

# Redis
REDIS_HOST={{ redis host }}
REDIS_PORT={{ redis port }}
REDIS_PASSWORD={{ redis password }}
```

#### 1.2 Modificações no Workflow

**A. Substituir Prompt Hardcoded (Linha 1501)**
```json
{
  "text": "={{ $env.AGENT_SYSTEM_PROMPT || 'Você é um assistente virtual prestativo e profissional.' }}"
}
```

**B. Adicionar Tom de Voz ao Prompt**
```json
{
  "text": "={{ $env.AGENT_SYSTEM_PROMPT }}\n\nTom de voz: {{ $env.AGENT_TONE || 'professional' }}"
}
```

**C. Substituir Credenciais Hardcoded**
- Usar credenciais dinâmicas baseadas em variáveis de ambiente
- N8N permite usar `$env.VAR_NAME` para variáveis de ambiente

---

### FASE 2: Adicionar Resposta em Áudio com ElevenLabs

#### 2.1 Fluxo Proposto

```
Mensagem Recebida (áudio)
  ↓
Transcrever Áudio (OpenAI Whisper) ✅ JÁ EXISTE
  ↓
Processar com IA (Supervisor) ✅ JÁ EXISTE
  ↓
Gerar Resposta em Texto ✅ JÁ EXISTE
  ↓
[NOVO] Verificar se mensagem original era áudio
  ↓
[NOVO] Se sim → Gerar áudio com ElevenLabs
  ↓
[NOVO] Enviar áudio via Evolution API
  ↓
Se não → Enviar texto normalmente ✅ JÁ EXISTE
```

#### 2.2 Nós a Adicionar

1. **Verificar Tipo de Mensagem Original**
   - Switch node após "Supervisor"
   - Verificar se `$('Info2').item.json.mensagem_audio_ou_imagem === 'audio'`

2. **Nó ElevenLabs Text-to-Speech**
   - HTTP Request para API ElevenLabs
   - URL: `https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`
   - Método: POST
   - Headers:
     ```json
     {
       "xi-api-key": "{{ $env.ELEVENLABS_API_KEY }}",
       "Content-Type": "application/json"
     }
     ```
   - Body:
     ```json
     {
       "text": "{{ $json.output }}",
       "model_id": "eleven_multilingual_v2",
       "voice_settings": {
         "stability": 0.5,
         "similarity_boost": 0.75
       }
     }
     ```

3. **Enviar Áudio via Evolution API**
   - HTTP Request para Evolution API
   - Endpoint: `/message/sendMedia/{instanceName}`
   - Enviar áudio gerado como base64 ou URL

#### 2.3 Configurações Necessárias

- **Voice ID do ElevenLabs**: Pode ser configurável por tenant (campo `elevenLabsVoiceId` em `agentConfigs`)
- **Model**: Usar `eleven_multilingual_v2` (suporta português)
- **Voice Settings**: Configurável (stability, similarity_boost)

---

### FASE 3: Integração com Sistema de Configuração

#### 3.1 Modificar `cloneWorkflowForTenant`

```typescript
export async function cloneWorkflowForTenant(
  tenantId: number,
  tenantName: string,
  evolutionInstanceName: string
): Promise<WorkflowInfo> {
  // 1. Buscar configurações do agente
  const agentConfig = await db.getAgentConfig(tenantId);
  
  // 2. Buscar dados do tenant
  const tenant = await db.getTenant(tenantId);
  
  // 3. Clonar workflow
  const template = await n8nApi.get(`/workflows/${templateId}`);
  
  // 4. Modificar nós com configurações
  const modifiedWorkflow = {
    ...template,
    nodes: template.nodes.map((node: any) => {
      // A. Substituir prompt do sistema
      if (node.name === 'Supervisor' && node.parameters?.text) {
        node.parameters.text = agentConfig.systemPrompt || node.parameters.text;
      }
      
      // B. Substituir credenciais de banco
      if (node.type === 'n8n-nodes-base.mysql') {
        node.credentials = {
          mysql: {
            host: tenant.dbHost,
            port: tenant.dbPort,
            database: tenant.dbName,
            user: tenant.dbUser,
            password: tenant.dbPassword,
          }
        };
      }
      
      // C. Substituir URLs hardcoded
      if (node.name === 'Info2') {
        // Substituir url_chatwoot
        node.parameters.assignments.assignments = 
          node.parameters.assignments.assignments.map((assignment: any) => {
            if (assignment.name === 'url_chatwoot') {
              assignment.value = `${process.env.CHATWOOT_URL}/api/v1`;
            }
            return assignment;
          });
      }
      
      // D. Adicionar variáveis de ambiente
      // N8N permite definir variáveis de ambiente por workflow
      // Podemos usar workflow settings para isso
      
      return node;
    }),
    settings: {
      ...template.settings,
      // Variáveis de ambiente do workflow
      executionVariables: {
        AGENT_SYSTEM_PROMPT: agentConfig.systemPrompt,
        AGENT_TONE: agentConfig.tone || 'professional',
        AGENT_WELCOME_MESSAGE: agentConfig.welcomeMessage,
        AGENT_COMPANY_INFO: agentConfig.companyInfo,
        ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
        ELEVENLABS_VOICE_ID: agentConfig.elevenLabsVoiceId || 'default',
        CHATWOOT_URL: process.env.CHATWOOT_URL,
        EVOLUTION_API_URL: process.env.EVOLUTION_API_URL,
        EVOLUTION_API_KEY: tenant.evolutionApiKey,
      }
    }
  };
  
  // 5. Criar workflow
  const createResponse = await n8nApi.post("/workflows", modifiedWorkflow);
  
  return {
    workflowId: createResponse.data.id,
    webhookUrl: `${process.env.N8N_API_URL}/webhook/tenant_${tenantId}`
  };
}
```

#### 3.2 Adicionar Campos ao Schema `agentConfigs`

```typescript
// drizzle/schema.ts
export const agentConfigs = mysqlTable("agentConfigs", {
  // ... campos existentes
  
  // Novos campos para áudio
  enableAudioResponse: boolean("enableAudioResponse").default(false),
  elevenLabsVoiceId: varchar("elevenLabsVoiceId", { length: 100 }),
  elevenLabsVoiceSettings: text("elevenLabsVoiceSettings"), // JSON
  
  // Novos campos para personalização
  tone: varchar("tone", { length: 50 }).default("professional"), // 'professional', 'friendly', 'formal', 'casual'
  responseSpeed: varchar("responseSpeed", { length: 50 }).default("normal"), // 'fast', 'normal', 'detailed'
  language: varchar("language", { length: 10 }).default("pt-BR"),
  businessHours: text("businessHours"), // JSON
  autoReplyRules: text("autoReplyRules"), // JSON
  knowledgeBase: text("knowledgeBase"),
  blockedWords: text("blockedWords"),
  greetingVariations: text("greetingVariations"), // JSON
});
```

---

### FASE 4: Adaptar Banco de Dados

#### 4.1 Opções

**Opção A: Substituir Supabase por MySQL**
- Modificar nós Supabase para MySQL
- Adaptar queries para sintaxe MySQL
- **Vantagem**: Usa mesmo banco do tenant
- **Desvantagem**: Precisa modificar muitos nós

**Opção B: Manter PostgreSQL para Histórico**
- Criar banco PostgreSQL separado para histórico de conversas
- MySQL para dados do tenant
- **Vantagem**: Não precisa modificar workflow muito
- **Desvantagem**: Dois bancos para gerenciar

**Opção C: Usar MySQL com Tabelas de Histórico**
- Criar tabelas `n8n_chat_histories` no MySQL do tenant
- Adaptar nó PostgreSQL para MySQL
- **Vantagem**: Tudo no mesmo banco
- **Desvantagem**: Precisa adaptar queries

**Recomendação**: Opção C (MySQL com tabelas de histórico)

#### 4.2 Tabelas Necessárias no MySQL

```sql
-- Tabela de histórico de conversas (equivalente ao n8n_chat_histories)
CREATE TABLE n8n_chat_histories (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  session_id VARCHAR(255) NOT NULL,
  message JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tenant_session (tenant_id, session_id)
);

-- Tabela de chats (já existe no workflow, adaptar)
CREATE TABLE chats (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  phone VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  etapa_followup DECIMAL(10,2),
  INDEX idx_tenant_phone (tenant_id, phone)
);

-- Tabela de dados do cliente (adaptar)
CREATE TABLE dados_cliente (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  telefone VARCHAR(20) NOT NULL,
  nomewpp VARCHAR(255),
  atendimento_ia ENUM('active', 'pause', 'reativada') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tenant_telefone (tenant_id, telefone)
);

-- Tabela de mensagens (adaptar)
CREATE TABLE chat_messages (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  phone VARCHAR(20) NOT NULL,
  nomewpp VARCHAR(255),
  bot_message TEXT,
  user_message TEXT,
  message_type ENUM('text', 'audio', 'image', 'file') DEFAULT 'text',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tenant_phone (tenant_id, phone)
);
```

---

## 📋 Checklist de Implementação

### Prioridade ALTA (MVP)
- [ ] Tornar prompt do sistema configurável via variável de ambiente
- [ ] Adicionar suporte a resposta em áudio com ElevenLabs
- [ ] Substituir credenciais hardcoded por variáveis de ambiente
- [ ] Adicionar tenant_id em todas as queries de banco
- [ ] Modificar `cloneWorkflowForTenant` para injetar configurações

### Prioridade MÉDIA
- [ ] Adaptar banco de dados (Supabase → MySQL)
- [ ] Adicionar campos de personalização ao schema `agentConfigs`
- [ ] Criar interface para configurar ElevenLabs (voice ID, settings)
- [ ] Adicionar suporte a tom de voz no prompt

### Prioridade BAIXA
- [ ] Otimizar workflow (remover nós desnecessários)
- [ ] Adicionar logs de execução
- [ ] Criar testes para workflow clonado

---

## 🚀 Próximos Passos

1. **Criar workflow template genérico** (sem hardcode)
2. **Adicionar nó ElevenLabs** para resposta em áudio
3. **Modificar `cloneWorkflowForTenant`** para injetar configurações
4. **Adicionar campos ao schema** `agentConfigs`
5. **Testar workflow clonado** com configurações do tenant

---

## 📝 Notas Técnicas

### N8N Variáveis de Ambiente
- N8N permite usar `$env.VAR_NAME` em expressões
- Variáveis podem ser definidas por workflow via `settings.executionVariables`
- Variáveis globais podem ser definidas no `.env` do N8N

### ElevenLabs API
- Endpoint: `https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`
- Model recomendado: `eleven_multilingual_v2` (suporta português)
- Voice IDs disponíveis: https://api.elevenlabs.io/v1/voices
- Limite: 10.000 caracteres por requisição

### Evolution API - Enviar Áudio
- Endpoint: `/message/sendMedia/{instanceName}`
- Formato: base64 ou URL
- Tipos suportados: audio/ogg, audio/mp3, audio/mpeg

