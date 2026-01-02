# ✅ SOLUÇÃO PRAGMÁTICA - Funciona Agora

## 🎯 MUDANÇA DE ESTRATÉGIA

**Ao invés de tentar capturar tokens perfeitos (que não funciona), vamos:**

1. ✅ **Registrar uso baseado em estimativas** (tamanho da mensagem)
2. ✅ **Criar dashboard básico** para ver o que temos
3. ✅ **Sistema funcional** mesmo sem tokens perfeitos

---

## 🔧 SOLUÇÃO 1: Estimativa Baseada em Tamanho

**Código que ESTIMA tokens baseado no tamanho do texto:**

```javascript
// ESTIMATIVA DE TOKENS BASEADA EM TAMANHO
const inputData = $input.item.json;

const tenantId = inputData.tenantId || null;

if (!tenantId) {
  return { json: { ...inputData, _credits: { tenantId: null, allUsageData: [] } } };
}

// Função para estimar tokens (aproximado: 1 token ≈ 4 caracteres)
function estimateTokens(text) {
  if (!text || typeof text !== 'string') return 0;
  return Math.ceil(text.length / 4);
}

const allUsageData = [];

// 1. Tentar pegar usage real (se vier)
const usage = inputData.usage || inputData._usage || null;

if (usage && usage.total_tokens) {
  // Usar dados reais se disponíveis
  allUsageData.push({
    operation: 'chat',
    model: inputData.model || 'gpt-4o-mini',
    tokensInput: usage.prompt_tokens || 0,
    tokensOutput: usage.completion_tokens || 0,
    totalTokens: usage.total_tokens || 0,
    isEstimated: false
  });
} else {
  // 2. Estimar baseado no texto da resposta
  const responseText = inputData.output || 
                       inputData.text || 
                       inputData.response ||
                       '';
  
  if (responseText) {
    const estimatedOutput = estimateTokens(responseText);
    const estimatedInput = Math.ceil(estimatedOutput * 0.3); // Input geralmente menor
    
    allUsageData.push({
      operation: 'chat',
      model: inputData.model || 'gpt-4o-mini',
      tokensInput: estimatedInput,
      tokensOutput: estimatedOutput,
      totalTokens: estimatedInput + estimatedOutput,
      isEstimated: true,
      metadata: {
        note: 'Estimativa baseada em tamanho do texto'
      }
    });
  }
}

return {
  json: {
    ...inputData,
    _credits: {
      tenantId: tenantId,
      allUsageData: allUsageData,
      timestamp: new Date().toISOString()
    }
  }
};
```

---

## 🔧 SOLUÇÃO 2: Registrar Uso Simples (Só Contagem)

**Se nem estimativa funcionar, pelo menos registrar que houve uso:**

```javascript
// REGISTRAR USO SIMPLES - Só contagem
const inputData = $input.item.json;

const tenantId = inputData.tenantId || null;

if (!tenantId) {
  return { json: { ...inputData } };
}

// Registrar uso mínimo (1 crédito por uso)
const allUsageData = [{
  operation: 'chat',
  model: inputData.model || 'gpt-4o-mini',
  tokensInput: 100, // Valor fixo mínimo
  tokensOutput: 50, // Valor fixo mínimo
  totalTokens: 150, // Valor fixo mínimo
  isEstimated: true,
  metadata: {
    note: 'Uso registrado sem dados de tokens - valor estimado mínimo'
  }
}];

return {
  json: {
    ...inputData,
    _credits: {
      tenantId: tenantId,
      allUsageData: allUsageData,
      timestamp: new Date().toISOString()
    }
  }
};
```

---

## 🔧 SOLUÇÃO 3: Criar Dashboard Básico Agora

**Vamos criar um dashboard simples para ver o que temos:**

### Backend: Rota para Ver Créditos

Já existe em `server/routers.ts`:
- `trpc.metrics.getMyUsage` - Para cliente ver créditos
- `trpc.metrics.getTenantUsage` - Para admin ver USD

### Frontend: Página de Créditos

**Criar página básica para ver:**

1. **Saldo atual de créditos**
2. **Histórico de uso** (mesmo que seja estimado)
3. **Gráfico simples** de consumo

**Isso já ajuda a ver o que está funcionando!**

---

## 🔧 SOLUÇÃO 4: Sistema Híbrido

**Combinar o que funciona:**

1. ✅ **Registrar uso** (mesmo que estimado)
2. ✅ **Dashboard básico** para visualizar
3. ✅ **Melhorar depois** quando N8N funcionar

**Pelo menos o sistema funciona e você vê dados!**

---

## 🧪 TESTE AGORA

1. **Use o código de estimativa** acima
2. **Configure Set node** com tenantId
3. **Teste** e veja se registra algo
4. **Verifique no banco** se salvou

---

## 📋 PRÓXIMOS PASSOS

1. ✅ **Testar código de estimativa**
2. ✅ **Ver se registra no banco**
3. ✅ **Criar dashboard básico** para visualizar
4. ✅ **Melhorar depois** quando conseguir tokens reais

---

## 💡 IMPORTANTE

**Mesmo com estimativas, você tem:**
- ✅ Sistema funcionando
- ✅ Dados sendo registrados
- ✅ Dashboard para visualizar
- ✅ Base para melhorar depois

**Melhor ter algo funcionando do que nada!**

---

## ✅ RESUMO

**Mudança de estratégia:**
- ❌ Não tentar capturar tokens perfeitos (não funciona)
- ✅ Usar estimativas baseadas em tamanho
- ✅ Registrar uso mínimo se necessário
- ✅ Criar dashboard para visualizar
- ✅ Melhorar depois quando possível

**Teste o código de estimativa e me diga se registrou algo no banco!**

