# Debug do Build no Docker

## Como obter logs completos do erro

Quando o build falhar no EasyPanel, você precisa ver os logs completos, não apenas a mensagem final.

### No EasyPanel:
1. Vá para o projeto `saas-agentes`
2. Clique em "Logs" ou "Build Logs"
3. Role até encontrar a seção `[builder 9/9] RUN pnpm build`
4. Copie TODOS os logs dessa seção, especialmente:
   - A linha que mostra o comando executado
   - Todas as mensagens de erro
   - Stack traces completos

### Problemas comuns e soluções:

#### 1. Erro: "Could not resolve entry module 'index.html'"
**Causa:** Vite não encontra o index.html
**Solução:** Já corrigido - `root: clientDir` está configurado

#### 2. Erro: "Rollup failed to resolve import '@/lib/trpc'"
**Causa:** Aliases não estão sendo resolvidos
**Solução:** Verificar se `vite.config.ts` está na raiz e os aliases estão corretos

#### 3. Erro: "Cannot find module"
**Causa:** Dependências não instaladas ou caminhos incorretos
**Solução:** Verificar se `pnpm install` foi executado antes do build

#### 4. Erro no esbuild
**Causa:** Problema ao compilar o servidor
**Solução:** Verificar se `server/_core/index.ts` existe e está correto

## Teste local do build

Para testar o build localmente (simulando o Docker):

```bash
# No PowerShell
$env:NODE_ENV="production"
pnpm install --frozen-lockfile
pnpm build
```

Se funcionar localmente mas falhar no Docker, o problema pode ser:
- Variáveis de ambiente não configuradas
- Diferenças entre Windows e Linux
- Cache do Docker

## Verificar estrutura de arquivos

Certifique-se de que estes arquivos existem:
- `client/index.html` ✓
- `client/src/main.tsx` ✓
- `client/src/lib/trpc.ts` ✓
- `vite.config.ts` (na raiz) ✓
- `server/_core/index.ts` ✓

## Próximos passos

1. **Cole os logs completos do erro** para que eu possa identificar o problema específico
2. Teste o build localmente se possível
3. Verifique se todos os arquivos necessários estão no repositório

