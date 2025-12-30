# 🔧 Como Instalar pgvector no PostgreSQL do EasyPanel

## 📋 Problema

O EasyPanel tem PostgreSQL e PgVector como serviços separados, mas o PostgreSQL não tem a extensão `vector` instalada.

## ✅ Soluções

### Opção 1: Instalar pgvector no PostgreSQL do EasyPanel (Recomendado)

#### Passo 1: Acessar o Container PostgreSQL
1. No EasyPanel, vá para o serviço PostgreSQL
2. Clique em "Terminal" ou "Console"
3. Ou use SSH se tiver acesso

#### Passo 2: Instalar Dependências
```bash
# Atualizar pacotes
apt-get update

# Instalar dependências do pgvector
apt-get install -y build-essential postgresql-server-dev-17 git

# Clonar e compilar pgvector
cd /tmp
git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git
cd pgvector
make
make install
```

#### Passo 3: Criar Extensão no Banco
```sql
-- Conectar ao PostgreSQL
psql -U seu_usuario -d seu_banco

-- Criar extensão
CREATE EXTENSION IF NOT EXISTS vector;
```

#### Passo 4: Verificar Instalação
```sql
-- Verificar se a extensão foi criada
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Deve retornar uma linha com a extensão
```

---

### Opção 2: Usar Versão sem pgvector (Alternativa)

Se não conseguir instalar pgvector, use o script alternativo:

```sql
-- Execute este script ao invés do original
\i SQL_INTEGRAR_TABELAS_TEMPLATE_SEM_VECTOR.sql
```

**Diferenças:**
- Embeddings armazenados como `TEXT` (array JSON) ao invés de `vector(1536)`
- Busca vetorial deve ser feita na aplicação (Node.js/Python)
- Função `match_documents_simple()` apenas filtra por metadata

**Exemplo de uso:**
```javascript
// No Node.js/Python, calcular similaridade de cosseno
const similarity = cosineSimilarity(queryEmbedding, documentEmbedding);
```

---

### Opção 3: Usar Serviço PgVector Separado (Se Disponível)

Se o EasyPanel oferece um serviço PgVector separado:

1. **Verificar se o serviço PgVector tem conexão com PostgreSQL**
   - Pode ser que seja apenas um serviço de exemplo
   - Verifique a documentação do EasyPanel

2. **Se for um serviço separado, você precisaria:**
   - Conectar ao PgVector para busca vetorial
   - Manter documentos no PostgreSQL principal
   - Fazer queries cruzadas (mais complexo)

**Não recomendado** - melhor instalar pgvector no PostgreSQL principal.

---

## 🚀 Recomendação

**Use a Opção 1** (instalar pgvector no PostgreSQL):
- ✅ Melhor performance
- ✅ Busca vetorial nativa no SQL
- ✅ Função `match_documents()` completa
- ✅ Índices HNSW otimizados

**Se não conseguir**, use a **Opção 2** (versão sem vector):
- ✅ Funciona imediatamente
- ✅ Sem dependências extras
- ⚠️ Busca vetorial na aplicação (mais lento)

---

## 📝 Script de Instalação Automática

Crie um arquivo `install-pgvector.sh`:

```bash
#!/bin/bash
set -e

echo "📦 Instalando dependências..."
apt-get update
apt-get install -y build-essential postgresql-server-dev-17 git

echo "🔨 Compilando pgvector..."
cd /tmp
rm -rf pgvector
git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git
cd pgvector
make
make install

echo "✅ pgvector instalado com sucesso!"
echo "📝 Execute no PostgreSQL: CREATE EXTENSION vector;"
```

Execute no container PostgreSQL:
```bash
chmod +x install-pgvector.sh
./install-pgvector.sh
```

---

## 🔍 Verificação

Após instalar, execute:

```sql
-- Verificar extensão
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Testar criação de tabela com vector
CREATE TABLE test_vector (id SERIAL, embedding vector(1536));
INSERT INTO test_vector (embedding) VALUES ('[0.1,0.2,0.3]'::vector(1536));
SELECT * FROM test_vector;
DROP TABLE test_vector;

-- Se tudo funcionar, execute o script completo
\i SQL_INTEGRAR_TABELAS_TEMPLATE.sql
```

---

## ⚠️ Troubleshooting

### Erro: "postgresql-server-dev-17 not found"
```bash
# Verificar versão do PostgreSQL
psql --version

# Instalar dev correspondente (ex: postgresql-server-dev-16)
apt-get install -y postgresql-server-dev-$(psql --version | grep -oP '\d+' | head -1)
```

### Erro: "make: command not found"
```bash
apt-get install -y build-essential
```

### Erro: "permission denied"
```bash
# Executar como root ou com sudo
sudo -i
# ou
su -
```

---

## 📚 Referências

- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [pgvector Installation](https://github.com/pgvector/pgvector#installation)
- [EasyPanel Documentation](https://easypanel.io/docs)

