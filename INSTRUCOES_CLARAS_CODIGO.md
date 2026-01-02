# ✅ Instruções Claras - O Que Adicionar no Código Existente

## 🎯 O QUE VOCÊ JÁ TEM

Você já tem um código que calcula tokens. Só precisa **ADICIONAR UMA LINHA** no final para converter para string JSON.

---

## 🔧 O QUE ADICIONAR

**No seu código existente, procure por esta parte (no final, antes do `return`):**

```javascript
// ... (seu código de cálculo existente) ...

return {
  json: {
    ...inputData,
    _credits: {
      tenantId: tenantId,
      allUsageData: allUsageData,  // ← VOCÊ JÁ TEM ISSO
      timestamp: new Date().toISOString()
    }
  }
};
```

---

## ✅ ADICIONE ESTA LINHA ANTES DO RETURN

**Adicione esta linha ANTES do `return`:**

```javascript
// ... (seu código existente) ...

// ADICIONAR ESTA LINHA AQUI ↓
const allUsageDataJson = JSON.stringify(allUsageData);

return {
  json: {
    ...inputData,
    _credits: {
      tenantId: tenantId,
      allUsageData: allUsageData,
      allUsageDataJson: allUsageDataJson,  // ← ADICIONAR ESTE CAMPO
      timestamp: new Date().toISOString()
    }
  }
};
```

---

## 📋 EXEMPLO COMPLETO (Seu Código + Adição)

**Seu código atual provavelmente está assim:**

```javascript
const inputData = $input.item.json;
const tenantId = inputData.tenantId || null;

// ... (seu código de cálculo) ...

const allUsageData = [];
// ... (seu código que preenche allUsageData) ...

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

**Mude para:**

```javascript
const inputData = $input.item.json;
const tenantId = inputData.tenantId || null;

// ... (seu código de cálculo) ...

const allUsageData = [];
// ... (seu código que preenche allUsageData) ...

// ← ADICIONAR ESTA LINHA AQUI
const allUsageDataJson = JSON.stringify(allUsageData);

return {
  json: {
    ...inputData,
    _credits: {
      tenantId: tenantId,
      allUsageData: allUsageData,
      allUsageDataJson: allUsageDataJson,  // ← ADICIONAR ESTE CAMPO
      timestamp: new Date().toISOString()
    }
  }
};
```

---

## 🔧 HTTP REQUEST - Mudar Só o Campo `data`

**No HTTP Request, mude apenas o campo `data`:**

**ANTES (estava assim):**
```json
{
  "eventType": "usage_tracking_batch",
  "data": "={{ $json._credits.allUsageData }}",
  "timestamp": "={{ $json._credits.timestamp }}"
}
```

**DEPOIS (mude para):**
```json
{
  "eventType": "usage_tracking_batch",
  "data": "={{ $json._credits.allUsageDataJson }}",
  "timestamp": "={{ $json._credits.timestamp }}"
}
```

**Só mudou:** `allUsageData` → `allUsageDataJson`

---

## ✅ RESUMO

**O que fazer:**

1. ✅ **No Code node:** Adicione `const allUsageDataJson = JSON.stringify(allUsageData);` antes do return
2. ✅ **No Code node:** Adicione `allUsageDataJson: allUsageDataJson` no objeto `_credits`
3. ✅ **No HTTP Request:** Mude `allUsageData` para `allUsageDataJson` no campo `data`

**Só isso! Não precisa mudar o resto do código de cálculo.**

---

## 🧪 TESTE

1. **Adicione a linha** no Code
2. **Mude o HTTP Request** para usar `allUsageDataJson`
3. **Execute** e veja se não aparece mais `[object Object]`

**Me envie seu código atual se quiser que eu mostre exatamente onde adicionar!**

