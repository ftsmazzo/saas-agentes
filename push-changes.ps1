# Script para fazer push das alterações
cd "C:\Users\Frederico Mazzo\saas-agentes"

Write-Host "=== Adicionando arquivos ===" -ForegroundColor Yellow
& "C:\Program Files\Git\bin\git.exe" add server/n8n-integration.ts
& "C:\Program Files\Git\bin\git.exe" add server/routers.ts
& "C:\Program Files\Git\bin\git.exe" add CORRECAO_N8N_2.1.4.md
& "C:\Program Files\Git\bin\git.exe" add CORRECOES_REALIZADAS.md
& "C:\Program Files\Git\bin\git.exe" add setup-stripe-webhook.mjs
& "C:\Program Files\Git\bin\git.exe" add server/_core/llm.ts
& "C:\Program Files\Git\bin\git.exe" add server/storage.ts
& "C:\Program Files\Git\bin\git.exe" add server/_core/map.ts
& "C:\Program Files\Git\bin\git.exe" add server/_core/dataApi.ts
& "C:\Program Files\Git\bin\git.exe" add server/_core/notification.ts

Write-Host "`n=== Status ===" -ForegroundColor Yellow
& "C:\Program Files\Git\bin\git.exe" status --short

Write-Host "`n=== Fazendo commit ===" -ForegroundColor Yellow
& "C:\Program Files\Git\bin\git.exe" commit -m "fix: Corrigir N8N 2.1.4 - published e path webhook correto

- Mudar de active para published no N8N 2.1.4+
- Corrigir path do webhook (remover duplicação /webhook/webhook)
- Adicionar verificação de publicação antes de ativar agente
- Limpar referências remanescentes do Manus"

Write-Host "`n=== Fazendo push ===" -ForegroundColor Yellow
$branch = & "C:\Program Files\Git\bin\git.exe" rev-parse --abbrev-ref HEAD
Write-Host "Branch atual: $branch" -ForegroundColor Cyan
& "C:\Program Files\Git\bin\git.exe" push origin $branch

Write-Host "`n=== Concluído! ===" -ForegroundColor Green

