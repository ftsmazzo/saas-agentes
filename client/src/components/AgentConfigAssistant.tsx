import { useState, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Bot, Send, Loader2, Sparkles, X, CheckCircle2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface Message {
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
}

interface AssistantState {
  step: 'greeting' | 'name' | 'preparation' | 'purpose' | 'audience' | 'audience-level' | 'context-where' | 'context-how' | 'personality' | 'personality-options' | 'autonomy' | 'limits' | 'knowledge' | 'knowledge-fallback' | 'tools' | 'success-criteria' | 'confirmation' | 'review' | 'complete';
  userName: string;
  answers: {
    // Finalidade
    purpose: string[];
    purposePriority: string;
    // Público
    audience: string[];
    audienceLevel: 'technical' | 'mixed' | 'lay' | '';
    // Contexto
    contextWhere: string[];
    contextHow: 'short' | 'long' | 'both' | '';
    // Personalidade
    personality: string[];
    personalityOptions: {
      useEmojis: boolean;
      proactiveQuestions: boolean;
      suggestNextSteps: boolean;
      onlyRespond: boolean;
    };
    // Autonomia
    autonomy: 'guide' | 'suggest' | 'execute' | '';
    limits: string;
    // Conhecimento
    knowledge: string[];
    knowledgeFallback: 'dont-know' | 'ask-more' | 'forward-human' | '';
    // Ferramentas
    tools: string[];
    // Resultado esperado
    successCriteria: string[];
    // Dados da empresa (para o prompt final)
    businessName: string;
    businessType: string;
    street: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    serviceArea: 'city' | 'state' | 'country' | '';
    phone: string;
    businessHours: string;
    paymentMethods: string[];
    additionalInfo: string;
  };
}

// Opções para cada etapa
const PURPOSE_OPTIONS = [
  'Vender produtos',
  'Vender serviços',
  'Atender clientes (suporte)',
  'Fornecer informações',
  'Executar tarefas internas',
  'Agendar / organizar / lembrar',
  'Analisar dados',
  'Atuar como assistente pessoal / secretária',
  'Outro',
];

const AUDIENCE_OPTIONS = [
  'Clientes finais',
  'Leads',
  'Fornecedores',
  'Funcionários / equipe interna',
  'Gestores',
  'Público técnico',
  'Público leigo',
  'Outro',
];

const CONTEXT_WHERE_OPTIONS = [
  'Site',
  'WhatsApp',
  'Instagram / DM',
  'Sistema interno',
  'Aplicativo',
  'Outro',
];

const PERSONALITY_OPTIONS = [
  'Formal',
  'Profissional',
  'Técnico',
  'Amigável',
  'Persuasivo',
  'Objetivo',
  'Consultivo',
  'Didático',
  'Empático',
  'Direto (sem rodeios)',
];

const KNOWLEDGE_OPTIONS = [
  'Conhecimento geral',
  'Documentos específicos',
  'Base de dados',
  'Integração com sistemas',
  'Combinação dos anteriores',
];

const TOOLS_OPTIONS = [
  'Banco de dados',
  'API',
  'CRM',
  'Agenda',
  'Sistema interno',
  'Nenhuma por enquanto',
];

const SUCCESS_CRITERIA_OPTIONS = [
  'Resolve dúvidas rapidamente',
  'Gera vendas',
  'Reduz atendimento humano',
  'Organiza tarefas',
  'Evita erros',
  'Outro',
];

const PAYMENT_METHODS = [
  'Dinheiro',
  'Cartão de Crédito',
  'Cartão de Débito',
  'PIX',
  'Boleto',
  'Transferência Bancária',
  'Cheque',
  'Cartão de Vale Alimentação',
  'Cartão de Vale Refeição',
];

// Função para buscar CEP via ViaCEP
async function fetchCEP(cep: string): Promise<{
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
} | null> {
  const cleanCEP = cep.replace(/\D/g, '');
  if (cleanCEP.length !== 8) return null;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
    const data = await response.json();
    if (data.erro) return { erro: true };
    return data;
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    return null;
  }
}

export default function AgentConfigAssistant({ 
  onComplete,
  existingConfig 
}: { 
  onComplete: () => void;
  existingConfig?: any;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [state, setState] = useState<AssistantState>({
    step: 'greeting',
    userName: '',
    answers: {
      purpose: [],
      purposePriority: '',
      audience: [],
      audienceLevel: '',
      contextWhere: [],
      contextHow: '',
      personality: [],
      personalityOptions: {
        useEmojis: false,
        proactiveQuestions: false,
        suggestNextSteps: false,
        onlyRespond: false,
      },
      autonomy: '',
      limits: '',
      knowledge: [],
      knowledgeFallback: '',
      tools: [],
      successCriteria: [],
      businessName: '',
      businessType: '',
      street: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: '',
      serviceArea: '',
      phone: '',
      businessHours: '',
      paymentMethods: [],
      additionalInfo: '',
    },
  });
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingCEP, setIsLoadingCEP] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const generatePromptMutation = trpc.clientPanel.generateSystemPrompt.useMutation({
    onSuccess: (data) => {
      addMessage('assistant', `✅ Perfeito, ${state.userName}! Seu agente foi configurado com sucesso!`);
      setState((prev) => ({ ...prev, step: 'complete' }));
      toast.success('Agente configurado! Agora você pode conectar o WhatsApp e ativar o agente.');
      setTimeout(() => {
        onComplete();
      }, 2000);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
      setIsProcessing(false);
      addMessage('assistant', `Ops, ${state.userName}, ocorreu um erro: ${error.message}. Tente novamente.`);
    },
  });

  // Carregar configuração existente
  useEffect(() => {
    if (existingConfig?.companyInfo) {
      try {
        const companyInfo = JSON.parse(existingConfig.companyInfo);
        setState((prev) => ({
          ...prev,
          answers: {
            ...prev.answers,
            businessName: companyInfo.name || '',
            businessType: companyInfo.type || '',
            street: companyInfo.street || '',
            neighborhood: companyInfo.neighborhood || '',
            city: companyInfo.city || '',
            state: companyInfo.state || '',
            zipCode: companyInfo.zipCode || '',
            serviceArea: companyInfo.serviceArea || '',
            phone: companyInfo.phone || '',
            businessHours: companyInfo.businessHours || '',
            paymentMethods: companyInfo.paymentMethods || [],
            additionalInfo: companyInfo.additionalInfo || '',
          },
        }));
      } catch (e) {
        console.error('Erro ao carregar config existente:', e);
      }
    }
  }, [existingConfig]);

  // Inicializar mensagem de boas-vindas
  useEffect(() => {
    if (messages.length === 0) {
      if (existingConfig?.systemPrompt) {
        // Se já tem config, começar de forma mais natural para edição
        addMessage('assistant', `👋 Olá! Eu sou o **Criador**, seu assistente para construir agentes de IA!`);
        addMessage('assistant', `Vejo que você já tem um agente configurado. Vou te ajudar a atualizar as configurações.`);
        addMessage('assistant', 'Antes de começarmos, qual é o seu nome?');
        setState(prev => ({ ...prev, step: 'name' }));
      } else {
        addMessage('assistant', '👋 Olá! Eu sou o **Criador**, seu assistente para construir agentes de IA!');
        addMessage('assistant', 'Vou fazer algumas perguntas objetivas para criar um Agente de IA totalmente ajustado à sua necessidade.');
        addMessage('assistant', 'Ao final, entregarei um template completo de agente, pronto para uso.');
        addMessage('assistant', 'Se algo não fizer sentido, responda com o que souber — eu ajusto depois. 😊');
        addMessage('assistant', 'Antes de começarmos, qual é o seu nome?');
        setState(prev => ({ ...prev, step: 'name' }));
      }
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (role: 'assistant' | 'user', content: string) => {
    setMessages((prev) => [...prev, { role, content, timestamp: new Date() }]);
  };

  const formatPhone = (phone: string): string => {
    const numbers = phone.replace(/\D/g, '');
    if (numbers.startsWith('55')) {
      return numbers;
    }
    if (numbers.length >= 10 && numbers.length <= 11) {
      return `55${numbers}`;
    }
    return numbers;
  };

  const handleGenerate = () => {
    if (!state.answers.businessName) {
      toast.error('Por favor, preencha pelo menos o nome da empresa');
      return;
    }

    setIsProcessing(true);
    
    // Mapear personalidade para o formato esperado pelo backend
    const personalityMap: Record<string, string> = {
      'Formal': 'formal',
      'Profissional': 'professional',
      'Técnico': 'professional',
      'Amigável': 'friendly',
      'Persuasivo': 'energetic',
      'Objetivo': 'professional',
      'Consultivo': 'consultative',
      'Didático': 'consultative',
      'Empático': 'empathetic',
      'Direto (sem rodeios)': 'professional',
    };
    
    const selectedPersonality = state.answers.personality[0] || 'Profissional';
    const mappedPersonality = personalityMap[selectedPersonality] || 'professional';

    generatePromptMutation.mutate({
      businessName: state.answers.businessName,
      businessType: state.answers.businessType || undefined,
      street: state.answers.street || undefined,
      neighborhood: state.answers.neighborhood || undefined,
      city: state.answers.city || undefined,
      state: state.answers.state || undefined,
      zipCode: state.answers.zipCode || undefined,
      serviceArea: state.answers.serviceArea || undefined,
      phone: state.answers.phone || undefined,
      businessHours: state.answers.businessHours || undefined,
      paymentMethods: state.answers.paymentMethods.length > 0 ? state.answers.paymentMethods : undefined,
      personality: mappedPersonality as any,
      additionalInfo: state.answers.additionalInfo || undefined,
    });
  };

  // Buscar CEP quando o usuário informar
  const handleCEPInput = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, '');
    if (cleanCEP.length === 8) {
      setIsLoadingCEP(true);
      const cepData = await fetchCEP(cleanCEP);
      setIsLoadingCEP(false);

      if (cepData && !cepData.erro) {
        setState((prev) => ({
          ...prev,
          answers: {
            ...prev.answers,
            street: cepData.logradouro || prev.answers.street,
            neighborhood: cepData.bairro || prev.answers.neighborhood,
            city: cepData.localidade || prev.answers.city,
            state: cepData.uf || prev.answers.state,
            zipCode: cleanCEP,
          },
        }));
        addMessage('assistant', `✅ CEP encontrado! Preenchi automaticamente:`);
        addMessage('assistant', `📍 ${cepData.logradouro || ''}, ${cepData.bairro || ''}, ${cepData.localidade || ''} - ${cepData.uf || ''}`);
        addMessage('assistant', 'Se precisar ajustar algo, é só me avisar!');
        return true;
      } else {
        addMessage('assistant', '❌ CEP não encontrado. Por favor, verifique o CEP ou informe o endereço manualmente.');
        return false;
      }
    }
    return false;
  };

  const handleUserMessage = async (message: string) => {
    if (!message.trim()) return;

    addMessage('user', message);
    const trimmedMessage = message.trim().toLowerCase();
    setUserInput('');

    switch (state.step) {
      case 'name':
        if (trimmedMessage.length < 2) {
          addMessage('assistant', 'Por favor, me diga seu nome:');
          return;
        }
        const userName = message.trim();
        setState((prev) => ({ ...prev, userName, step: 'preparation' }));
        addMessage('assistant', `Prazer em conhecê-lo, ${userName}! 😊`);
        addMessage('assistant', 'Agora vamos começar! Vou fazer algumas perguntas objetivas para criar seu agente.');
        addMessage('assistant', 'Está pronto para começar? (digite "sim" ou "ok")');
        break;

      case 'preparation':
        if (trimmedMessage.includes('sim') || trimmedMessage.includes('s') || trimmedMessage === 'ok' || trimmedMessage.includes('pronto')) {
          setState((prev) => ({ ...prev, step: 'purpose' }));
          addMessage('assistant', '🎯 **ETAPA 1 — FINALIDADE DO AGENTE**');
          addMessage('assistant', 'Qual é o principal objetivo desse agente?');
          addMessage('assistant', 'Você pode escolher uma ou mais opções (digite os números separados por vírgula):');
          addMessage('assistant', PURPOSE_OPTIONS.map((opt, idx) => `${idx + 1}. ${opt}`).join('\n'));
        } else {
          addMessage('assistant', 'Sem pressa! Quando estiver pronto, digite "sim" ou "ok". 😊');
        }
        break;

      case 'purpose':
        const purposeIndices = trimmedMessage.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= PURPOSE_OPTIONS.length);
        if (purposeIndices.length > 0) {
          const selectedPurposes = purposeIndices.map(idx => PURPOSE_OPTIONS[idx - 1]);
          setState((prev) => ({
            ...prev,
            answers: { ...prev.answers, purpose: selectedPurposes },
            step: selectedPurposes.length > 1 ? 'purpose' : 'audience',
          }));

          if (selectedPurposes.length > 1) {
            addMessage('assistant', `Ótimo! Você escolheu: ${selectedPurposes.join(', ')}`);
            addMessage('assistant', 'Se tivesse que escolher apenas uma função principal, qual seria?');
            addMessage('assistant', 'Digite o número da opção prioritária:');
          } else {
            setState((prev) => ({
              ...prev,
              answers: { ...prev.answers, purposePriority: selectedPurposes[0] },
              step: 'audience',
            }));
            addMessage('assistant', `Perfeito! Função principal: ${selectedPurposes[0]}. ✅`);
            addMessage('assistant', '');
            addMessage('assistant', '👥 **ETAPA 2 — PÚBLICO-ALVO**');
            addMessage('assistant', 'Com quem esse agente vai conversar na maior parte do tempo?');
            addMessage('assistant', 'Você pode escolher várias opções (digite os números separados por vírgula):');
            addMessage('assistant', AUDIENCE_OPTIONS.map((opt, idx) => `${idx + 1}. ${opt}`).join('\n'));
          }
        } else {
          addMessage('assistant', 'Por favor, escolha pelo menos uma opção. Digite os números separados por vírgula:');
        }
        break;

      case 'audience':
        const audienceIndices = trimmedMessage.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= AUDIENCE_OPTIONS.length);
        if (audienceIndices.length > 0) {
          const selectedAudience = audienceIndices.map(idx => AUDIENCE_OPTIONS[idx - 1]);
          setState((prev) => ({
            ...prev,
            answers: { ...prev.answers, audience: selectedAudience },
            step: 'audience-level',
          }));
          addMessage('assistant', `Ótimo! Público-alvo: ${selectedAudience.join(', ')}. ✅`);
          addMessage('assistant', 'Esse público é mais:');
          addMessage('assistant', '1. Técnico\n2. Misto\n3. Totalmente leigo');
          addMessage('assistant', 'Digite o número:');
        } else {
          addMessage('assistant', 'Por favor, escolha pelo menos uma opção. Digite os números separados por vírgula:');
        }
        break;

      case 'audience-level':
        const levelMap: Record<string, 'technical' | 'mixed' | 'lay'> = {
          '1': 'technical',
          '2': 'mixed',
          '3': 'lay',
        };
        const selectedLevel = levelMap[trimmedMessage];
        if (selectedLevel) {
          setState((prev) => ({
            ...prev,
            answers: { ...prev.answers, audienceLevel: selectedLevel },
            step: 'context-where',
          }));
          addMessage('assistant', `Perfeito! Nível: ${selectedLevel === 'technical' ? 'Técnico' : selectedLevel === 'mixed' ? 'Misto' : 'Totalmente leigo'}. ✅`);
          addMessage('assistant', '');
          addMessage('assistant', '🌐 **ETAPA 3 — CONTEXTO DE USO**');
          addMessage('assistant', 'Onde esse agente será usado?');
          addMessage('assistant', 'Você pode escolher várias opções (digite os números separados por vírgula):');
          addMessage('assistant', CONTEXT_WHERE_OPTIONS.map((opt, idx) => `${idx + 1}. ${opt}`).join('\n'));
        } else {
          addMessage('assistant', 'Por favor, digite 1, 2 ou 3:');
        }
        break;

      case 'context-where':
        const contextIndices = trimmedMessage.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= CONTEXT_WHERE_OPTIONS.length);
        if (contextIndices.length > 0) {
          const selectedContext = contextIndices.map(idx => CONTEXT_WHERE_OPTIONS[idx - 1]);
          setState((prev) => ({
            ...prev,
            answers: { ...prev.answers, contextWhere: selectedContext },
            step: 'context-how',
          }));
          addMessage('assistant', `Ótimo! Onde será usado: ${selectedContext.join(', ')}. ✅`);
          addMessage('assistant', 'Ele responde:');
          addMessage('assistant', '1. Mensagens curtas e diretas\n2. Conversas longas\n3. Ambos');
          addMessage('assistant', 'Digite o número:');
        } else {
          addMessage('assistant', 'Por favor, escolha pelo menos uma opção. Digite os números separados por vírgula:');
        }
        break;

      case 'context-how':
        const howMap: Record<string, 'short' | 'long' | 'both'> = {
          '1': 'short',
          '2': 'long',
          '3': 'both',
        };
        const selectedHow = howMap[trimmedMessage];
        if (selectedHow) {
          setState((prev) => ({
            ...prev,
            answers: { ...prev.answers, contextHow: selectedHow },
            step: 'personality',
          }));
          addMessage('assistant', `Perfeito! Tipo de resposta: ${selectedHow === 'short' ? 'Curtas e diretas' : selectedHow === 'long' ? 'Conversas longas' : 'Ambos'}. ✅`);
          addMessage('assistant', '');
          addMessage('assistant', '💬 **ETAPA 4 — PERSONALIDADE E TOM**');
          addMessage('assistant', 'Como você quer que esse agente se comunique?');
          addMessage('assistant', 'Escolha até 3 opções (digite os números separados por vírgula):');
          addMessage('assistant', PERSONALITY_OPTIONS.map((opt, idx) => `${idx + 1}. ${opt}`).join('\n'));
        } else {
          addMessage('assistant', 'Por favor, digite 1, 2 ou 3:');
        }
        break;

      case 'personality':
        const personalityIndices = trimmedMessage.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= PERSONALITY_OPTIONS.length);
        if (personalityIndices.length > 0 && personalityIndices.length <= 3) {
          const selectedPersonality = personalityIndices.map(idx => PERSONALITY_OPTIONS[idx - 1]);
          setState((prev) => ({
            ...prev,
            answers: { ...prev.answers, personality: selectedPersonality },
            step: 'personality-options',
          }));
          addMessage('assistant', `Ótimo! Personalidade: ${selectedPersonality.join(', ')}. ✅`);
          addMessage('assistant', 'Agora sobre o comportamento:');
          addMessage('assistant', 'Ele pode:');
          addMessage('assistant', '1. Usar emojis\n2. Fazer perguntas proativas\n3. Sugerir próximos passos\n4. Apenas responder o que foi perguntado');
          addMessage('assistant', 'Você pode escolher várias opções (digite os números separados por vírgula):');
        } else {
          addMessage('assistant', 'Por favor, escolha de 1 a 3 opções. Digite os números separados por vírgula:');
        }
        break;

      case 'personality-options':
        const optionIndices = trimmedMessage.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 4);
        if (optionIndices.length > 0) {
          const newOptions = {
            useEmojis: optionIndices.includes(1),
            proactiveQuestions: optionIndices.includes(2),
            suggestNextSteps: optionIndices.includes(3),
            onlyRespond: optionIndices.includes(4),
          };
          setState((prev) => ({
            ...prev,
            answers: { ...prev.answers, personalityOptions: newOptions },
            step: 'autonomy',
          }));
          addMessage('assistant', 'Perfeito! ✅');
          addMessage('assistant', '');
          addMessage('assistant', '🚨 **ETAPA 5 — AUTONOMIA E LIMITES**');
          addMessage('assistant', 'O agente pode tomar decisões ou apenas orientar?');
          addMessage('assistant', '1. Apenas orientar\n2. Sugerir ações\n3. Executar ações automaticamente');
          addMessage('assistant', 'Digite o número:');
        } else {
          addMessage('assistant', 'Por favor, escolha pelo menos uma opção. Digite os números separados por vírgula:');
        }
        break;

      case 'autonomy':
        const autonomyMap: Record<string, 'guide' | 'suggest' | 'execute'> = {
          '1': 'guide',
          '2': 'suggest',
          '3': 'execute',
        };
        const selectedAutonomy = autonomyMap[trimmedMessage];
        if (selectedAutonomy) {
          setState((prev) => ({
            ...prev,
            answers: { ...prev.answers, autonomy: selectedAutonomy },
            step: 'limits',
          }));
          addMessage('assistant', `Perfeito! Autonomia: ${selectedAutonomy === 'guide' ? 'Apenas orientar' : selectedAutonomy === 'suggest' ? 'Sugerir ações' : 'Executar automaticamente'}. ✅`);
          addMessage('assistant', 'Existe algo que ele NÃO pode fazer de forma alguma?');
          addMessage('assistant', 'Exemplos: "Não pode dar aconselhamento jurídico", "Não pode prometer preços", "Não pode inventar informações"');
          addMessage('assistant', '(Se não tiver restrições, digite "nenhuma" ou "não")');
        } else {
          addMessage('assistant', 'Por favor, digite 1, 2 ou 3:');
        }
        break;

      case 'limits':
        setState((prev) => ({
          ...prev,
          answers: { ...prev.answers, limits: message.trim() },
          step: 'knowledge',
        }));
        addMessage('assistant', 'Perfeito! ✅');
        addMessage('assistant', '');
        addMessage('assistant', '📚 **ETAPA 6 — CONHECIMENTO E FONTE DAS RESPOSTAS**');
        addMessage('assistant', 'O agente deve responder com base em:');
        addMessage('assistant', 'Você pode escolher várias opções (digite os números separados por vírgula):');
        addMessage('assistant', KNOWLEDGE_OPTIONS.map((opt, idx) => `${idx + 1}. ${opt}`).join('\n'));
        break;

      case 'knowledge':
        const knowledgeIndices = trimmedMessage.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= KNOWLEDGE_OPTIONS.length);
        if (knowledgeIndices.length > 0) {
          const selectedKnowledge = knowledgeIndices.map(idx => KNOWLEDGE_OPTIONS[idx - 1]);
          setState((prev) => ({
            ...prev,
            answers: { ...prev.answers, knowledge: selectedKnowledge },
            step: 'knowledge-fallback',
          }));
          addMessage('assistant', `Ótimo! Base de conhecimento: ${selectedKnowledge.join(', ')}. ✅`);
          addMessage('assistant', 'Se ele não souber algo, deve:');
          addMessage('assistant', '1. Dizer que não sabe\n2. Pedir mais informações\n3. Encaminhar para humano');
          addMessage('assistant', 'Digite o número:');
        } else {
          addMessage('assistant', 'Por favor, escolha pelo menos uma opção. Digite os números separados por vírgula:');
        }
        break;

      case 'knowledge-fallback':
        const fallbackMap: Record<string, 'dont-know' | 'ask-more' | 'forward-human'> = {
          '1': 'dont-know',
          '2': 'ask-more',
          '3': 'forward-human',
        };
        const selectedFallback = fallbackMap[trimmedMessage];
        if (selectedFallback) {
          setState((prev) => ({
            ...prev,
            answers: { ...prev.answers, knowledgeFallback: selectedFallback },
            step: 'tools',
          }));
          addMessage('assistant', `Perfeito! Fallback: ${selectedFallback === 'dont-know' ? 'Dizer que não sabe' : selectedFallback === 'ask-more' ? 'Pedir mais informações' : 'Encaminhar para humano'}. ✅`);
          addMessage('assistant', '');
          addMessage('assistant', '🔧 **ETAPA 7 — FERRAMENTAS**');
          addMessage('assistant', 'Esse agente terá acesso a ferramentas?');
          addMessage('assistant', 'Você pode escolher várias opções (digite os números separados por vírgula):');
          addMessage('assistant', TOOLS_OPTIONS.map((opt, idx) => `${idx + 1}. ${opt}`).join('\n'));
        } else {
          addMessage('assistant', 'Por favor, digite 1, 2 ou 3:');
        }
        break;

      case 'tools':
        const toolsIndices = trimmedMessage.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= TOOLS_OPTIONS.length);
        const selectedTools = toolsIndices.map(idx => TOOLS_OPTIONS[idx - 1]);
        setState((prev) => ({
          ...prev,
          answers: { ...prev.answers, tools: selectedTools },
          step: 'success-criteria',
        }));
        addMessage('assistant', `Ótimo! Ferramentas: ${selectedTools.length > 0 ? selectedTools.join(', ') : 'Nenhuma por enquanto'}. ✅`);
        addMessage('assistant', '');
        addMessage('assistant', '🎯 **ETAPA 8 — RESULTADO ESPERADO**');
        addMessage('assistant', 'Como você saberá que esse agente está funcionando bem?');
        addMessage('assistant', 'Você pode escolher várias opções (digite os números separados por vírgula):');
        addMessage('assistant', SUCCESS_CRITERIA_OPTIONS.map((opt, idx) => `${idx + 1}. ${opt}`).join('\n'));
        break;

      case 'success-criteria':
        const criteriaIndices = trimmedMessage.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= SUCCESS_CRITERIA_OPTIONS.length);
        if (criteriaIndices.length > 0) {
          const selectedCriteria = criteriaIndices.map(idx => SUCCESS_CRITERIA_OPTIONS[idx - 1]);
          setState((prev) => ({
            ...prev,
            answers: { ...prev.answers, successCriteria: selectedCriteria },
            step: 'business-name',
          }));
          addMessage('assistant', `Perfeito! Critérios de sucesso: ${selectedCriteria.join(', ')}. ✅`);
          addMessage('assistant', '');
          addMessage('assistant', '📋 Agora preciso de algumas informações sobre sua empresa:');
          addMessage('assistant', 'Qual o nome da sua empresa ou negócio?');
        } else {
          addMessage('assistant', 'Por favor, escolha pelo menos uma opção. Digite os números separados por vírgula:');
        }
        break;

      case 'business-name':
        if (trimmedMessage.length < 2) {
          addMessage('assistant', 'Por favor, me diga o nome da sua empresa:');
          return;
        }
        setState((prev) => ({
          ...prev,
          answers: { ...prev.answers, businessName: message.trim() },
          step: 'business-type',
        }));
        addMessage('assistant', `Perfeito! ${message.trim()}. ✅`);
        addMessage('assistant', 'Qual o ramo de atividade? (ex: imobiliária, e-commerce, clínica médica, restaurante)');
        break;

      case 'business-type':
        setState((prev) => ({
          ...prev,
          answers: { ...prev.answers, businessType: message.trim() },
          step: 'address-zip',
        }));
        addMessage('assistant', `Ótimo! ${message.trim()}. ✅`);
        addMessage('assistant', 'Agora sobre o endereço. Qual o CEP da sua empresa?');
        addMessage('assistant', '💡 Vou buscar automaticamente o endereço completo pelo CEP!');
        break;

      case 'address-zip':
        const zipCode = message.trim().replace(/\D/g, '');
        if (zipCode.length === 8) {
          const cepFound = await handleCEPInput(zipCode);
          if (cepFound) {
            setState((prev) => ({
              ...prev,
              answers: { ...prev.answers, zipCode },
              step: 'service-area',
            }));
            addMessage('assistant', 'Perfeito! Agora me conta: sua empresa atende apenas na sua cidade, em todo o estado ou em todo o Brasil?');
            addMessage('assistant', 'Digite: "cidade", "estado" ou "brasil"');
          } else {
            addMessage('assistant', 'Por favor, informe o CEP novamente ou me diga o endereço completo manualmente:');
          }
        } else {
          addMessage('assistant', 'CEP inválido. Por favor, informe um CEP válido (8 dígitos):');
        }
        break;

      case 'service-area':
        let serviceArea: 'city' | 'state' | 'country' | '' = '';
        if (trimmedMessage.includes('cidade') || trimmedMessage.includes('local')) {
          serviceArea = 'city';
        } else if (trimmedMessage.includes('estado') || trimmedMessage.includes('estadual')) {
          serviceArea = 'state';
        } else if (trimmedMessage.includes('brasil') || trimmedMessage.includes('nacional') || trimmedMessage.includes('todo')) {
          serviceArea = 'country';
        }
        
        if (serviceArea) {
          setState((prev) => ({
            ...prev,
            answers: { ...prev.answers, serviceArea },
            step: 'phone',
          }));
          const areaText = serviceArea === 'city' ? 'sua cidade' : serviceArea === 'state' ? 'todo o estado' : 'todo o Brasil';
          addMessage('assistant', `Ótimo! Atendimento em ${areaText}. ✅`);
          addMessage('assistant', 'Agora preciso do telefone de contato. Por favor, informe com DDD.');
          addMessage('assistant', 'Exemplo: (11) 98765-4321 ou 11987654321');
          addMessage('assistant', '💡 Dica: Vou formatar automaticamente com código do país (55) se necessário.');
        } else {
          addMessage('assistant', 'Por favor, digite "cidade", "estado" ou "brasil":');
        }
        break;

      case 'phone':
        const formattedPhone = formatPhone(message.trim());
        setState((prev) => ({
          ...prev,
          answers: { ...prev.answers, phone: formattedPhone },
          step: 'business-hours',
        }));
        addMessage('assistant', `Telefone registrado: ${formattedPhone}. ✅`);
        addMessage('assistant', 'Qual o horário de funcionamento?');
        addMessage('assistant', 'Exemplo: "Segunda a sexta, das 9h às 18h" ou "Todos os dias, das 8h às 20h"');
        break;

      case 'business-hours':
        setState((prev) => ({
          ...prev,
          answers: { ...prev.answers, businessHours: message.trim() },
          step: 'payment-methods',
        }));
        addMessage('assistant', 'Perfeito! ✅');
        addMessage('assistant', 'Quais formas de pagamento sua empresa aceita?');
        addMessage('assistant', 'Você pode escolher várias opções (digite os números separados por vírgula):');
        addMessage('assistant', PAYMENT_METHODS.map((method, idx) => `${idx + 1}. ${method}`).join('\n'));
        break;

      case 'payment-methods':
        const paymentIndices = trimmedMessage.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= PAYMENT_METHODS.length);
        if (paymentIndices.length > 0) {
          const selectedPayments = paymentIndices.map(idx => PAYMENT_METHODS[idx - 1]);
          setState((prev) => ({
            ...prev,
            answers: { ...prev.answers, paymentMethods: selectedPayments },
            step: 'confirmation',
          }));
          addMessage('assistant', `Ótimo! Formas de pagamento: ${selectedPayments.join(', ')}. ✅`);
          addMessage('assistant', '');
          showConfirmation();
        } else {
          addMessage('assistant', 'Por favor, escolha pelo menos uma forma de pagamento. Digite os números separados por vírgula:');
        }
        break;

      case 'confirmation':
        if (trimmedMessage.includes('sim') || trimmedMessage.includes('s') || trimmedMessage === 'ok') {
          setState((prev) => ({ ...prev, step: 'review' }));
          showReview();
        } else if (trimmedMessage.includes('não') || trimmedMessage.includes('nao') || trimmedMessage.includes('n')) {
          addMessage('assistant', 'Sem problemas! O que você gostaria de alterar?');
          addMessage('assistant', 'Você pode me dizer qual informação quer mudar e eu te ajudo a ajustar.');
          // Manter no review para permitir edição
          setState((prev) => ({ ...prev, step: 'review' }));
        } else {
          addMessage('assistant', 'Por favor, digite "sim" para confirmar ou "não" para alterar algo:');
        }
        break;

      case 'review':
        if (trimmedMessage.includes('sim') || trimmedMessage.includes('s') || trimmedMessage === 'ok') {
          // Gerar automaticamente quando confirmar
          if (state.answers.businessName) {
            handleGenerate();
          } else {
            addMessage('assistant', 'Por favor, preencha pelo menos o nome da empresa antes de gerar.');
            setState((prev) => ({ ...prev, step: 'business-name' }));
            addMessage('assistant', 'Qual o nome da sua empresa ou negócio?');
          }
        } else if (trimmedMessage.includes('não') || trimmedMessage.includes('nao') || trimmedMessage.includes('n')) {
          addMessage('assistant', 'Sem problemas! O que você gostaria de alterar?');
          addMessage('assistant', 'Você pode me dizer qual informação quer mudar e eu te ajudo a ajustar.');
        } else {
          addMessage('assistant', 'Por favor, digite "sim" para gerar ou "não" para alterar algo:');
        }
        break;
    }
  };

  const showConfirmation = () => {
    addMessage('assistant', '🧩 **CONFIRMAÇÃO INTELIGENTE**');
    addMessage('assistant', 'Vou confirmar se entendi corretamente antes de criar o agente:');
    addMessage('assistant', '');
    
    if (state.answers.purposePriority || state.answers.purpose.length > 0) {
      addMessage('assistant', `✔️ Função principal: ${state.answers.purposePriority || state.answers.purpose[0]}`);
    }
    if (state.answers.audience.length > 0) {
      addMessage('assistant', `✔️ Público: ${state.answers.audience.join(', ')}`);
    }
    if (state.answers.personality.length > 0) {
      addMessage('assistant', `✔️ Tom: ${state.answers.personality.join(', ')}`);
    }
    if (state.answers.limits) {
      addMessage('assistant', `✔️ Limites: ${state.answers.limits}`);
    }
    if (state.answers.contextWhere.length > 0) {
      addMessage('assistant', `✔️ Canal: ${state.answers.contextWhere.join(', ')}`);
    }
    if (state.answers.businessName) {
      addMessage('assistant', `✔️ Empresa: ${state.answers.businessName}`);
    }
    
    addMessage('assistant', '');
    addMessage('assistant', 'Posso gerar o agente agora? (digite "sim" para confirmar)');
  };

  const showReview = () => {
    addMessage('assistant', '📋 **REVISÃO FINAL**');
    addMessage('assistant', 'Vamos revisar todas as informações coletadas:');
    addMessage('assistant', '');
    
    // Mostrar todas as respostas coletadas
    if (state.answers.businessName) {
      addMessage('assistant', `**Empresa:** ${state.answers.businessName}`);
    }
    if (state.answers.businessType) {
      addMessage('assistant', `**Ramo:** ${state.answers.businessType}`);
    }
    if (state.answers.street || state.answers.city) {
      const addressParts = [];
      if (state.answers.street) addressParts.push(state.answers.street);
      if (state.answers.neighborhood) addressParts.push(state.answers.neighborhood);
      if (state.answers.city) addressParts.push(state.answers.city);
      if (state.answers.state) addressParts.push(state.answers.state);
      if (state.answers.zipCode) addressParts.push(`CEP: ${state.answers.zipCode}`);
      if (addressParts.length > 0) {
        addMessage('assistant', `**Endereço:** ${addressParts.join(', ')}`);
      }
    }
    if (state.answers.serviceArea) {
      const areaText = state.answers.serviceArea === 'city' ? 'Apenas na cidade' : state.answers.serviceArea === 'state' ? 'Todo o estado' : 'Todo o Brasil';
      addMessage('assistant', `**Área de atendimento:** ${areaText}`);
    }
    if (state.answers.phone) {
      addMessage('assistant', `**Telefone:** ${state.answers.phone}`);
    }
    if (state.answers.businessHours) {
      addMessage('assistant', `**Horário:** ${state.answers.businessHours}`);
    }
    if (state.answers.paymentMethods.length > 0) {
      addMessage('assistant', `**Formas de pagamento:** ${state.answers.paymentMethods.join(', ')}`);
    }
    
    addMessage('assistant', '');
    addMessage('assistant', '✅ Está tudo certo? Digite "sim" para gerar o prompt do sistema agora! 🚀');
    addMessage('assistant', 'Ou digite "não" se quiser alterar algo.');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Criador - Assistente de Configuração
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Chat Messages */}
        <div className="h-96 overflow-y-auto border rounded-lg p-4 mb-4 space-y-4 bg-muted/30">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background border'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex gap-2 justify-start">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
              </div>
              <div className="bg-background border rounded-lg p-3">
                <p className="text-sm">Gerando configurações com IA...</p>
              </div>
            </div>
          )}
          {isLoadingCEP && (
            <div className="flex gap-2 justify-start">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="h-4 w-4 text-primary animate-pulse" />
              </div>
              <div className="bg-background border rounded-lg p-3">
                <p className="text-sm">Buscando endereço pelo CEP...</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input - sempre disponível, exceto quando completo */}
        {state.step !== 'complete' && (
          <div className="flex gap-2">
            <Input
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (userInput.trim() && !isProcessing && !isLoadingCEP) {
                    handleUserMessage(userInput);
                  }
                }
              }}
              placeholder={state.step === 'review' ? 'Digite "sim" para gerar ou "não" para alterar algo...' : 'Digite sua resposta...'}
              disabled={isProcessing || isLoadingCEP}
            />
            <Button
              onClick={() => {
                if (userInput.trim() && !isProcessing && !isLoadingCEP) {
                  handleUserMessage(userInput);
                }
              }}
              disabled={isProcessing || isLoadingCEP || !userInput.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Generate Button - aparece após confirmação na revisão */}
        {state.step === 'review' && state.answers.businessName && (
          <div className="space-y-2 mt-2">
            <Button
              onClick={handleGenerate}
              disabled={isProcessing}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {existingConfig?.systemPrompt ? 'Atualizar Configurações' : 'Gerar e Salvar Configurações'}
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
