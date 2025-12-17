# Correção do Deploy - EasyPanel

## Problema 1: Caminho do arquivo de inicialização

**Corrigido!** O Dockerfile estava tentando executar `dist/server/_core/index.js` mas o build gera `dist/index.js`.

## Problema 2: VITE_APP_URL sem protocolo

No EasyPanel, a variável `VITE_APP_URL` está configurada como:
```
VITE_APP_URL=saas.fabricadosdados.com.br
```

**Deve ser:**
```
VITE_APP_URL=https://saas.fabricadosdados.com.br
```

### Como corrigir no EasyPanel:

1. Acesse o projeto no EasyPanel
2. Vá em **Environment Variables**
3. Encontre `VITE_APP_URL`
4. Altere de `saas.fabricadosdados.com.br` para `https://saas.fabricadosdados.com.br`
5. Salve e faça o redeploy

## Variável N8N_CREATE_WEBHOOK_WORKFLOW_URL

Esta variável não é usada no código atual, então não afeta o build. Mas se quiser manter para uso futuro, certifique-se de que está com o nome correto:

```
N8N_CREATE_WEBHOOK_WORKFLOW_URL=https://saas-agentes-n8n.90qhxz.easypanel.host/webhook/webhook-chatwoot
```

## Após corrigir:

1. Faça commit e push das correções
2. No EasyPanel, clique em **Redeploy**
3. Aguarde o build completar
4. Verifique os logs se ainda houver erro

