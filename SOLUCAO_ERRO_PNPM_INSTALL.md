# 🔧 Solução: Erro de Permissão ao Instalar Pacotes no Container

## ❌ Problema

Ao tentar executar `pnpm install` dentro do container de produção, você recebe:

```
EACCES: permission denied, open '/app/_tmp_...'
```

## 🔍 Causa

O container de produção roda como usuário `nodejs` (não-root) por segurança, e esse usuário não tem permissão para criar arquivos temporários no diretório `/app`.

## ✅ Solução: Rebuild da Imagem Docker

**NÃO é necessário rodar `pnpm install` dentro do container!** O Dockerfile já instala todas as dependências durante o build.

### Passo 1: Fazer Rebuild no EasyPanel

1. No EasyPanel, vá para seu projeto
2. Clique em **"Rebuild"** ou **"Redeploy"**
3. Isso vai:
   - Fazer pull do código atualizado do Git
   - Instalar todas as dependências (incluindo `form-data`)
   - Fazer build da aplicação
   - Criar nova imagem Docker

### Passo 2: Verificar se Funcionou

Após o rebuild, o pacote `form-data` estará instalado e o envio de mídia deve funcionar.

---

## 🔄 Alternativa: Instalar Manualmente (Apenas para Teste)

Se você **realmente** precisar instalar manualmente (não recomendado):

### Opção A: Como Root Temporariamente

```bash
# Entrar no container como root
docker exec -u root -it <container_id> sh

# Instalar o pacote
pnpm install form-data

# Voltar para usuário normal
exit
```

### Opção B: Atualizar Dockerfile (Recomendado)

Se você precisa adicionar novos pacotes frequentemente, adicione ao `package.json` e faça rebuild:

1. Adicione o pacote ao `package.json` (já feito ✅)
2. Commit e push para o Git
3. Faça rebuild no EasyPanel

---

## 📝 Nota Importante

O Dockerfile usa **multi-stage build**:
- **Stage 1 (builder)**: Instala dependências e faz build
- **Stage 2 (runner)**: Copia apenas arquivos necessários (incluindo `node_modules`)

Por isso, **sempre faça rebuild** quando adicionar novos pacotes ao `package.json`.

---

## ✅ Checklist

- [x] `form-data` adicionado ao `package.json`
- [ ] Rebuild da imagem Docker no EasyPanel
- [ ] Testar envio de mídia após rebuild

---

## 🚀 Próximos Passos

Após o rebuild:
1. Teste o envio de uma foto na interface de mensagens
2. Verifique os logs se houver algum erro
3. Se funcionar, está tudo certo! ✅

