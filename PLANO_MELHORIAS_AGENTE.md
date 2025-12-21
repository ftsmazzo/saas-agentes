# Plano de Melhorias - Sistema de Agente

## Objetivos

1. **Unificar páginas de configuração** (AgentSettings e AgentConfig)
2. **Limitar criação de apenas 1 agente** por tenant
3. **Criar sistema de Tools/Agentes Especialistas** configuráveis
4. **Adicionar configuração de agendamento**
5. **Adicionar visualização de RAG** (documentos)
6. **Adicionar visualização de agenda**
7. **Adicionar visualização de conversas do Chatwoot**

## Estrutura de Tools/Agentes Especialistas

Baseado no workflow N8N, os tools disponíveis são:

1. **AgenteSQL** - Consultas a banco de dados
2. **AgenteTerritorio** - Identificação de CRAS/território
3. **Vector (RAG)** - Consulta a documentos e base de conhecimento
4. **BuscaEndereco** - Consulta ViaCEP
5. **Agendamento** - Sistema de agendamentos (a configurar)

## Schema Proposto

### agentConfigs (expandido)
- Campos existentes mantidos
- `toolsConfig` (JSON) - Configuração de tools ativos
- `schedulingConfig` (JSON) - Configuração de agendamento
- `ragConfig` (JSON) - Configuração de RAG

### Novas tabelas (se necessário)
- `agentTools` - Tools disponíveis e configurações
- `schedulingData` - Dados de agendamento
- `ragDocuments` - Documentos do RAG

## Interface Proposta

### Página Unificada: `/client/settings` ou `/client/agent-config`

**Seções:**
1. **Configuração Básica**
   - Prompt do sistema
   - Mensagem de boas-vindas
   - Informações da empresa

2. **Tools/Agentes Especialistas**
   - Toggle para cada tool
   - Configurações específicas de cada tool
   - Agendamento: campos de configuração (horários, disponibilidade, etc.)

3. **RAG (Base de Conhecimento)**
   - Visualização de documentos
   - Upload de documentos
   - Status do RAG

4. **Agenda**
   - Visualização de agendamentos
   - Calendário

5. **Conversas Chatwoot**
   - Lista de conversas
   - Status das conversas

## Limitação de Agente

- Apenas 1 agente por tenant
- Se já existir agente, mostrar página de edição ao invés de criação
- Botão "Criar Agente" só aparece se não houver agente

