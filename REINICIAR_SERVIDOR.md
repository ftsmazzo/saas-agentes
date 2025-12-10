# 🔄 Comando para Reiniciar Servidor

## PowerShell (Windows)

```powershell
Set-Location C:\Users\gesta\Desktop\saas
$env:NODE_ENV="development"; pnpm exec tsx watch server/_core/index.ts
```

## O que foi corrigido:

✅ N8N só roda se Evolution foi criado  
✅ Validações de variáveis de ambiente melhoradas  
✅ Email mostra token no console se falhar  
✅ Correção na criação de tenant (remove campos undefined)

---

**Execute o comando acima para reiniciar!** 🚀

