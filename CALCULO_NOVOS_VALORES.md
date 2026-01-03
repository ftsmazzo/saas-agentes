# 💰 Cálculo dos Novos Valores de Créditos

## 📊 Baseado nas Suas Respostas

### Parâmetros Definidos:
- **Margem de lucro:** 200% (markup 3.0x)
- **Uso típico:** 100 conversas × 12 mensagens = 1.200 mensagens/mês (plano médio)
- **Modelo principal:** GPT-4.1-mini ou GPT-4o-mini (~3-4 créditos por mensagem)
- **Créditos extras:** Sim, com custo mais alto

---

## 🧮 Cálculo dos Créditos por Plano

### Plano Básico (R$ 99,00)
- **Uso estimado:** 50 conversas × 12 mensagens = 600 mensagens/mês
- **Créditos necessários:** 600 × 3.5 = 2.100 créditos
- **Com margem de segurança (30%):** 2.100 × 1.3 = **2.730 créditos**
- **Valor sugerido:** **3.000 créditos** ✅

### Plano Pro (R$ 199,00)
- **Uso estimado:** 100 conversas × 12 mensagens = 1.200 mensagens/mês
- **Créditos necessários:** 1.200 × 3.5 = 4.200 créditos
- **Com margem de segurança (20%):** 4.200 × 1.2 = **5.040 créditos**
- **Valor sugerido:** **5.000 créditos** ✅

### Plano Enterprise (R$ 499,00)
- **Uso estimado:** 300 conversas × 12 mensagens = 3.600 mensagens/mês
- **Créditos necessários:** 3.600 × 3.5 = 12.600 créditos
- **Com margem de segurança (20%):** 12.600 × 1.2 = **15.120 créditos**
- **Valor sugerido:** **15.000 créditos** ✅

---

## 💵 Configuração de Créditos (Markup 200%)

### Atual:
- `creditValueUSD`: $0.002 (1 crédito = $0.002 USD)
- `markupMultiplier`: 1.5 (50% de margem)

### Novo:
- `creditValueUSD`: $0.002 (mantém)
- `markupMultiplier`: **3.0** (200% de margem)

### Exemplo de Cálculo:
**Mensagem com GPT-4.1-mini:**
- Custo real: $0.001 USD
- Créditos: ($0.001 / $0.002) × 3.0 = **2 créditos**

**Mensagem com GPT-4o:**
- Custo real: $0.010 USD
- Créditos: ($0.010 / $0.002) × 3.0 = **15 créditos**

---

## 🎯 Créditos Extras (Compra Adicional)

### Estratégia:
- **Custo mais alto** que créditos do plano
- Incentiva upgrade para plano maior
- Permite continuidade do serviço

### Sugestão de Preço:
- **Créditos do plano:** R$ 0,033 por 1.000 créditos (baseado no Pro)
- **Créditos extras:** R$ 0,050 por 1.000 créditos (**50% mais caro**)

**Pacotes sugeridos:**
- 1.000 créditos extras: R$ 5,00
- 5.000 créditos extras: R$ 22,50 (10% desconto)
- 10.000 créditos extras: R$ 40,00 (20% desconto)

---

## 📋 Resumo Final

| Plano | Preço | Créditos Mensais | Créditos/R$ | Conversas Estimadas* |
|-------|-------|------------------|-------------|---------------------|
| Básico | R$ 99,00 | 3.000 | 30,3 | ~50 conversas |
| Pro | R$ 199,00 | 5.000 | 25,1 | ~100 conversas |
| Enterprise | R$ 499,00 | 15.000 | 30,1 | ~300 conversas |

*Baseado em 12 mensagens por conversa com GPT-4.1-mini

---

## ✅ Próximos Passos

1. ✅ Atualizar `monthlyCredits` nos planos (3k, 5k, 15k)
2. ✅ Atualizar `markupMultiplier` para 3.0 (200% margem)
3. ✅ Implementar compra de créditos extras
4. ✅ Remover `maxWorkflowExecutions` e `maxStorageGB` dos planos (focar só em créditos)

