# 🔧 Solução: pgvector no EasyPanel

## ❌ Problema

```
ERROR: extension "vector" is not available
Could not open extension control file "/usr/share/postgresql/17/extension/vector.control"
```

O PostgreSQL do EasyPanel não tem a extensão `vector` instalada.

---

## ✅ Solução Rápida (Recomendada)

**Use o script sem pgvector:**

```sql
-- Execute este script (não requer pgvector)
\i SQL_INTEGRAR_TABELAS_TEMPLATE_SEM_VECTOR.sql
```

**Funcionalidades:**
- ✅ Cria todas as tabelas (`clientData`, `documents`)
- ✅ Adiciona campos de compatibilidade
- ✅ Funciona imediatamente
- ⚠️ Embeddings armazenados como `TEXT` (array JSON)
- ⚠️ Busca vetorial deve ser feita na aplicação

---

## 🚀 Solução Completa (Melhor Performance)

**Instale pgvector no PostgreSQL:**

1. **Acesse o terminal do PostgreSQL no EasyPanel**
2. **Execute o script de instalação:**

```bash
# Instalar dependências
apt-get update
apt-get install -y build-essential postgresql-server-dev-17 git

# Compilar e instalar pgvector
cd /tmp
git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git
cd pgvector
make
make install
```

3. **Criar extensão no banco:**

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

4. **Execute o script completo:**

```sql
\i SQL_INTEGRAR_TABELAS_TEMPLATE.sql
```

**Vantagens:**
- ✅ Busca vetorial nativa no SQL
- ✅ Melhor performance
- ✅ Função `match_documents()` completa
- ✅ Índices HNSW otimizados

---

## 📋 Comparação

| Recurso | Sem pgvector | Com pgvector |
|---------|-------------|-------------|
| Criação de tabelas | ✅ | ✅ |
| Armazenar embeddings | ✅ (TEXT) | ✅ (vector) |
| Busca vetorial SQL | ❌ | ✅ |
| Busca vetorial App | ✅ | ✅ |
| Performance | ⚠️ Média | ✅ Excelente |
| Instalação | ✅ Imediata | ⚠️ Requer setup |

---

## 🎯 Recomendação

**Para começar rápido:** Use `SQL_INTEGRAR_TABELAS_TEMPLATE_SEM_VECTOR.sql`

**Para produção:** Instale pgvector e use `SQL_INTEGRAR_TABELAS_TEMPLATE.sql`

---

## 📚 Documentação Completa

- `INSTALAR_PGVECTOR_EASYPANEL.md` - Guia detalhado de instalação
- `SQL_INTEGRAR_TABELAS_TEMPLATE_SEM_VECTOR.sql` - Script sem pgvector
- `SQL_INTEGRAR_TABELAS_TEMPLATE.sql` - Script completo (requer pgvector)

