# 📊 Como Funciona o Cálculo de Créditos

## 🔄 Fluxo do Cálculo

### 1. **Cálculo de Custo Real (USD)**
```
Custo USD = (Tokens Input / 1.000.000) × Preço Input por 1M
         + (Tokens Output / 1.000.000) × Preço Output por 1M
```

**Exemplo:**
- Modelo: `gpt-4o`
- Tokens Input: 1.500
- Tokens Output: 2.000
- Preço Input: $2.50 por 1M
- Preço Output: $10.00 por 1M

```
Custo = (1.500 / 1.000.000) × $2.50 + (2.000 / 1.000.000) × $10.00
      = $0.00375 + $0.02000
      = $0.02375 USD
```

### 2. **Conversão para Créditos**
```
Créditos = (Custo USD / Valor do Crédito) × Markup
```

**Configurações atuais:**
- `creditValueUSD`: $0.002 (1 crédito = $0.002 USD)
- `markupMultiplier`: 1.5 (50% de margem)

**Exemplo (continuando):**
```
Créditos = ($0.02375 / $0.002) × 1.5
         = 11.875 × 1.5
         = 17.8125
         = 18 créditos (arredondado para cima)
```

---

## 💡 **Resposta à Sua Pergunta**

**"Podemos controlar isso e mudar a transformação de tokens em Crédito baseado no modelo?"**

**SIM! Você está correto!**

O modelo escolhido pelo usuário **JÁ AFETA** o cálculo:

1. **Modelos mais caros** (ex: GPT-4o) → **Custo USD maior** → **Mais créditos**
2. **Modelos mais baratos** (ex: GPT-4o-mini) → **Custo USD menor** → **Menos créditos**

**O que precisamos fazer:**
- ✅ Usar o **modelo real escolhido** pelo usuário no Code node (não sempre "gpt-4.1-mini")
- ✅ O backend **já calcula** baseado no modelo correto
- ✅ Se quiser ajustar a margem por modelo, podemos adicionar isso

---

## 🎯 **Ajustes Necessários**

1. **Code Node:** Usar o modelo real do usuário (não fixo "gpt-4.1-mini")
2. **Estimativa de Tokens:** Aumentar margem de segurança (de 25% para 35-40%)
3. **Backend:** Já está correto - calcula baseado no modelo

---

## 📝 **Exemplo Prático**

**Cenário 1: Usuário escolhe GPT-4o-mini**
- Tokens: 3.500
- Custo: $0.0021 USD
- Créditos: 2 créditos

**Cenário 2: Usuário escolhe GPT-4o (mesmos tokens)**
- Tokens: 3.500
- Custo: $0.014 USD (6.6x mais caro!)
- Créditos: 11 créditos (5.5x mais créditos!)

**Conclusão:** O modelo escolhido **já afeta** os créditos automaticamente! 🎉

