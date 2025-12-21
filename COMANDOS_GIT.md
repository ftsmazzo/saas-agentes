# 📤 Comandos para Atualizar GitHub

Execute estes comandos para enviar as alterações:

```bash
git add .
git commit -m "feat: Remover Manus, migrar para PostgreSQL, adicionar tabelas N8N"
git push origin deploy-production
```

**Ou se preferir fazer em etapas:**

```bash
# Ver o que mudou
git status

# Adicionar arquivos
git add package.json tsconfig.json SQL_TABELAS_WORKFLOW_N8N.sql AJUSTES_EASYPANEL.md

# Commit
git commit -m "feat: Remover Manus, migrar para PostgreSQL, adicionar tabelas N8N"

# Push
git push origin deploy-production
```

Após o push, o EasyPanel fará rebuild automático.

