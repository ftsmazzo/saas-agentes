# 📊 Documentação: Lógica Exata de Cálculo de Créditos

## 🎯 Visão Geral

O sistema converte o **custo real em USD** (calculado pela OpenAI) em **créditos internos**, aplicando uma **margem de lucro de 200%** (3x o custo).

---

## 📐 Fórmula Completa

### **Passo 1: Calcular Custo Real em USD**

O custo é calculado baseado no **modelo OpenAI** e **tipo de operação**:

#### **Para Áudio (Whisper):**
```
custoUSD = (duração_em_minutos) × (preço_por_minuto)
```

#### **Para Texto (Chat, Image, PDF, Format):**
```
custoUSD = (tokens_input / 1.000.000) × (preço_input_por_1M) + (tokens_output / 1.000.000) × (preço_output_por_1M)
```

**Exemplo:**
- Modelo: `gpt-4o-mini`
- Tokens Input: 1.000
- Tokens Output: 500
- Preço Input: $0.15 por 1M tokens
- Preço Output: $0.60 por 1M tokens

```
custoUSD = (1.000 / 1.000.000) × 0.15 + (500 / 1.000.000) × 0.60
custoUSD = 0.001 × 0.15 + 0.0005 × 0.60
custoUSD = 0.00015 + 0.0003
custoUSD = $0.00045
```

---

### **Passo 2: Converter Custo USD para Créditos Internos**

Aplicando a **margem de 200%** (multiplicador de 3x):

```
créditos = Math.ceil((custoUSD / valor_do_crédito) × markup)
```

**Parâmetros Configuráveis:**
- `creditValueUSD`: Valor base de 1 crédito em USD (padrão: **$0.002**)
- `markupMultiplier`: Multiplicador de margem (padrão: **3.0** = 200% de margem)
- `minCreditsPerTransaction`: Mínimo de créditos por transação (padrão: **1**)

**Exemplo:**
- Custo USD: $0.00045
- Valor do Crédito: $0.002
- Markup: 3.0

```
créditos = Math.ceil((0.00045 / 0.002) × 3.0)
créditos = Math.ceil(0.225 × 3.0)
créditos = Math.ceil(0.675)
créditos = 1 crédito (garantido pelo mínimo)
```

**Exemplo com custo maior:**
- Custo USD: $0.01
- Valor do Crédito: $0.002
- Markup: 3.0

```
créditos = Math.ceil((0.01 / 0.002) × 3.0)
créditos = Math.ceil(5 × 3.0)
créditos = Math.ceil(15)
créditos = 15 créditos
```

---

## 💰 Margem de Lucro

### **Como funciona a margem de 200%?**

A margem de **200%** significa que você cobra **3x o custo real**:

- **Custo Real**: $0.01 USD
- **Margem (200%)**: $0.02 USD
- **Preço Final**: $0.03 USD (3x o custo)

**Fórmula:**
```
Preço Final = Custo Real × (1 + Margem%)
Preço Final = $0.01 × (1 + 200%)
Preço Final = $0.01 × 3
Preço Final = $0.03
```

**No código:**
```typescript
markup = 3.0  // 200% de margem = 3x o custo
créditos = (custoUSD / creditValueUSD) × markup
```

---

## 📋 Exemplo Completo

### **Cenário: Cliente usa GPT-4o-mini para responder uma mensagem**

1. **Uso Real:**
   - Tokens Input: 500
   - Tokens Output: 300
   - Modelo: `gpt-4o-mini`

2. **Cálculo de Custo USD:**
   - Preço Input: $0.15 por 1M tokens
   - Preço Output: $0.60 por 1M tokens
   ```
   custoUSD = (500 / 1.000.000) × 0.15 + (300 / 1.000.000) × 0.60
   custoUSD = 0.000075 + 0.00018
   custoUSD = $0.000255
   ```

3. **Conversão para Créditos:**
   - Valor do Crédito: $0.002
   - Markup: 3.0
   ```
   créditos = Math.ceil((0.000255 / 0.002) × 3.0)
   créditos = Math.ceil(0.1275 × 3.0)
   créditos = Math.ceil(0.3825)
   créditos = 1 crédito (mínimo garantido)
   ```

4. **Resultado:**
   - **Custo Real**: $0.000255 USD
   - **Créditos Cobrados**: 1 crédito
   - **Valor Cobrado ao Cliente**: 1 × $0.002 = $0.002 USD
   - **Margem de Lucro**: $0.002 - $0.000255 = **$0.001745 USD** (684% de margem neste caso devido ao mínimo)

---

## ⚙️ Configuração

Os parâmetros podem ser ajustados na tabela `creditConfig`:

```sql
-- Ver configuração atual
SELECT * FROM "creditConfig";

-- Atualizar valor do crédito
UPDATE "creditConfig" SET value = '0.002' WHERE key = 'creditValueUSD';

-- Atualizar margem (200% = 3.0)
UPDATE "creditConfig" SET value = '3.0' WHERE key = 'markupMultiplier';

-- Atualizar mínimo de créditos
UPDATE "creditConfig" SET value = '1' WHERE key = 'minCreditsPerTransaction';
```

---

## 📊 Resumo

| Item | Valor |
|------|-------|
| **Valor Base do Crédito** | $0.002 USD |
| **Margem de Lucro** | 200% (3x o custo) |
| **Mínimo por Transação** | 1 crédito |
| **Fórmula** | `Math.ceil((custoUSD / 0.002) × 3.0)` |

---

## 🔍 Verificação

Para verificar o cálculo em tempo real, consulte os logs do servidor:

```
[CreditSystem] 💰 Custo calculado: $0.000255 USD
[CreditSystem] 💳 Créditos calculados: 1
[CreditSystem] 📊 Margem aplicada: 3.0x (200%)
```

