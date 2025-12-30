// ============================================
// CÓDIGO CORRIGIDO PARA CODE NODE
// Node: "Criar Prompt Dinâmico"
// ============================================

// Buscar dados dos nodes anteriores
// IMPORTANTE: Use apenas nodes que existem e estão conectados
const agentConfig = $('Buscar Configurações Agente').first().json;
const editFields2 = $('Edit Fields2').first().json;

// Extrair tenantId
const tenantId = editFields2?.tenantId || null;

// Extrair configurações do agente (com fallback)
const systemPrompt = agentConfig?.systemPrompt || agentConfig?.["systemPrompt"] || 
  `Você é um assistente virtual inteligente e prestativo.
Seu objetivo é ajudar os clientes de forma cordial, profissional e eficiente.`;

// Extrair companyInfo (pode ser string JSON ou objeto)
let companyInfo = agentConfig?.companyInfo || agentConfig?.["companyInfo"] || "{}";
let companyData = {};

// Tentar parsear companyInfo se for string
try {
  if (typeof companyInfo === 'string') {
    companyData = JSON.parse(companyInfo);
  } else {
    companyData = companyInfo;
  }
} catch (e) {
  // Se falhar, usar objeto vazio
  companyData = {};
}

// Extrair nome da empresa (de várias fontes possíveis)
const companyName = companyData?.name || companyData?.nome || "a empresa";

// Construir prompt dinâmico
let dynamicPrompt = systemPrompt;

// Adicionar informações da empresa se disponíveis
if (companyData && Object.keys(companyData).length > 0) {
  dynamicPrompt += `\n\n## Informações da Empresa\n`;
  
  if (companyData.name || companyData.nome) {
    dynamicPrompt += `- **Nome:** ${companyData.name || companyData.nome}\n`;
  }
  
  if (companyData.setor) {
    dynamicPrompt += `- **Setor:** ${companyData.setor}\n`;
  }
  
  if (companyData.descricao || companyData.description) {
    dynamicPrompt += `- **Descrição:** ${companyData.descricao || companyData.description}\n`;
  }
  
  if (companyData.address || companyData.endereco) {
    dynamicPrompt += `- **Endereço:** ${companyData.address || companyData.endereco}\n`;
  }
  
  if (companyData.phone || companyData.telefone) {
    dynamicPrompt += `- **Telefone:** ${companyData.phone || companyData.telefone}\n`;
  }
}

// Adicionar instruções sobre tools se configurado
const toolsConfig = agentConfig?.toolsConfig || agentConfig?.["toolsConfig"];
if (toolsConfig) {
  try {
    const tools = typeof toolsConfig === 'string' ? JSON.parse(toolsConfig) : toolsConfig;
    if (tools.enabledTools && Array.isArray(tools.enabledTools) && tools.enabledTools.length > 0) {
      dynamicPrompt += `\n\n## Ferramentas Disponíveis\n`;
      dynamicPrompt += `Você tem acesso às seguintes ferramentas:\n`;
      tools.enabledTools.forEach(tool => {
        const toolName = tool.name || tool;
        const toolDesc = tool.description || '';
        dynamicPrompt += `- **${toolName}:** ${toolDesc}\n`;
      });
    }
  } catch (e) {
    // Ignorar erro de parsing de tools
  }
}

// Retornar o prompt dinâmico
return [{
  json: {
    dynamicSystemPrompt: dynamicPrompt,
    tenantId: tenantId,
    companyName: companyName,
    hasConfig: !!agentConfig?.systemPrompt,
    originalSystemPrompt: systemPrompt
  }
}];

