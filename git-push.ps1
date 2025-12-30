# Script para fazer push e salvar resultado
$ErrorActionPreference = "Continue"
$outputFile = "git-push-result.txt"

cd "C:\Users\Frederico Mazzo\saas-agentes"

Write-Host "=== Iniciando push ===" | Tee-Object -FilePath $outputFile

Write-Host "`n1. Adicionando arquivos..." | Tee-Object -FilePath $outputFile -Append
git add server/n8n-integration.ts 2>&1 | Tee-Object -FilePath $outputFile -Append
git add server/routers.ts 2>&1 | Tee-Object -FilePath $outputFile -Append
git add CORRECAO_N8N_2.1.4.md 2>&1 | Tee-Object -FilePath $outputFile -Append
git add CORRECOES_REALIZADAS.md 2>&1 | Tee-Object -FilePath $outputFile -Append
git add setup-stripe-webhook.mjs 2>&1 | Tee-Object -FilePath $outputFile -Append
git add server/_core/llm.ts 2>&1 | Tee-Object -FilePath $outputFile -Append
git add server/storage.ts 2>&1 | Tee-Object -FilePath $outputFile -Append
git add server/_core/map.ts 2>&1 | Tee-Object -FilePath $outputFile -Append
git add server/_core/dataApi.ts 2>&1 | Tee-Object -FilePath $outputFile -Append
git add server/_core/notification.ts 2>&1 | Tee-Object -FilePath $outputFile -Append

Write-Host "`n2. Status antes do commit:" | Tee-Object -FilePath $outputFile -Append
git status --short 2>&1 | Tee-Object -FilePath $outputFile -Append

Write-Host "`n3. Fazendo commit..." | Tee-Object -FilePath $outputFile -Append
git commit -m "fix: Corrigir N8N 2.1.4 - published e webhook path correto" 2>&1 | Tee-Object -FilePath $outputFile -Append

Write-Host "`n4. Último commit:" | Tee-Object -FilePath $outputFile -Append
git log --oneline -1 2>&1 | Tee-Object -FilePath $outputFile -Append

Write-Host "`n5. Fazendo push..." | Tee-Object -FilePath $outputFile -Append
git push origin deploy-production 2>&1 | Tee-Object -FilePath $outputFile -Append

Write-Host "`n=== Concluído! Verifique git-push-result.txt ===" | Tee-Object -FilePath $outputFile -Append

