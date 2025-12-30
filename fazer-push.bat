@echo off
cd /d "C:\Users\Frederico Mazzo\saas-agentes"

echo === Configurando Git ===
git config user.name "Frederico Mazzo"
git config user.email "fredmazzo@gmail.com"

echo === Adicionando arquivos ===
git add server/n8n-integration.ts
git add server/routers.ts
git add server/chatwoot-integration.ts
git add server/evolution-integration.ts
git add server/webhooks/stripe.ts
git add drizzle/schema.ts
git add CORRECAO_N8N_2.1.4.md
git add CORRECOES_REALIZADAS.md
git add setup-stripe-webhook.mjs
git add server/_core/llm.ts
git add server/storage.ts
git add server/_core/map.ts
git add server/_core/dataApi.ts
git add server/_core/notification.ts

echo.
echo === Status ===
git status --short

echo.
echo === Fazendo commit ===
git commit -m "fix: adicionar funções de exclusão do Chatwoot e correções do N8N 2.1.4"

echo.
echo === Último commit ===
git log --oneline -1

echo.
echo === Fazendo push ===
git push origin deploy-production

echo.
echo === CONCLUIDO! ===
pause

