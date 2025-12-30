-- ============================================
-- INTEGRAÇÃO DE TABELAS DO TEMPLATE
-- Multi-Tenant com Isolamento por tenantId
-- ============================================

-- 1. Criar extensão pgvector (necessária para embeddings)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- 2. TABELA: clientData (substitui dados_cliente)
-- ============================================
CREATE TABLE IF NOT EXISTS "clientData" (
  id SERIAL PRIMARY KEY,
  "tenantId" INTEGER NOT NULL,
  phone TEXT NOT NULL,
  name TEXT,
  "aiService" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Índices para performance
  CONSTRAINT "clientData_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "clientData_tenantId_idx" ON "clientData"("tenantId");
CREATE INDEX IF NOT EXISTS "clientData_phone_idx" ON "clientData"(phone);

-- ============================================
-- 3. TABELA: documents (RAG - Vector Embeddings)
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  "tenantId" INTEGER NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  embedding vector(1536), -- 1536 dimensões para OpenAI embeddings
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Índices para performance
  CONSTRAINT "documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "documents_tenantId_idx" ON documents("tenantId");
-- Índice HNSW para busca vetorial (mais eficiente que IVFFlat)
CREATE INDEX IF NOT EXISTS "documents_embedding_idx" ON documents 
USING hnsw (embedding vector_cosine_ops);

-- ============================================
-- 4. FUNÇÃO: match_documents (Busca Vetorial)
-- ============================================
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(1536),
  match_count int DEFAULT NULL,
  filter jsonb DEFAULT '{}',
  tenant_id_filter int DEFAULT NULL
) RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  FROM documents
  WHERE 
    documents.metadata @> filter
    AND (tenant_id_filter IS NULL OR documents."tenantId" = tenant_id_filter)
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================
-- 5. ADICIONAR CAMPOS À TABELA conversations
-- (Compatibilidade com template 'chats')
-- ============================================
DO $$
BEGIN
  -- Adicionar campo phone se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'phone'
  ) THEN
    ALTER TABLE conversations ADD COLUMN phone TEXT;
  END IF;
  
  -- Adicionar campo etapaFollowup se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'etapaFollowup'
  ) THEN
    ALTER TABLE conversations ADD COLUMN "etapaFollowup" NUMERIC;
  END IF;
  
  -- Adicionar campo updatedAt (texto) se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'updatedAt'
  ) THEN
    ALTER TABLE conversations ADD COLUMN "updatedAt" TEXT;
  END IF;
END $$;

-- ============================================
-- 6. ADICIONAR CAMPOS À TABELA chatMessages
-- (Compatibilidade com template 'chat_messages')
-- ============================================
DO $$
BEGIN
  -- Adicionar campo phone se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chatMessages' AND column_name = 'phone'
  ) THEN
    ALTER TABLE "chatMessages" ADD COLUMN phone TEXT;
  END IF;
  
  -- Adicionar campo nomewpp se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chatMessages' AND column_name = 'nomewpp'
  ) THEN
    ALTER TABLE "chatMessages" ADD COLUMN nomewpp TEXT;
  END IF;
  
  -- Adicionar campo botMessage se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chatMessages' AND column_name = 'botMessage'
  ) THEN
    ALTER TABLE "chatMessages" ADD COLUMN "botMessage" TEXT;
  END IF;
  
  -- Adicionar campo userMessage se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chatMessages' AND column_name = 'userMessage'
  ) THEN
    ALTER TABLE "chatMessages" ADD COLUMN "userMessage" TEXT;
  END IF;
  
  -- Adicionar campo messageType se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chatMessages' AND column_name = 'messageType'
  ) THEN
    ALTER TABLE "chatMessages" ADD COLUMN "messageType" TEXT;
  END IF;
  
  -- Adicionar campo active se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chatMessages' AND column_name = 'active'
  ) THEN
    ALTER TABLE "chatMessages" ADD COLUMN active BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- ============================================
-- 7. COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================
COMMENT ON TABLE "clientData" IS 'Dados específicos de atendimento por cliente (substitui dados_cliente do template)';
COMMENT ON TABLE documents IS 'Documentos para RAG com embeddings vetoriais (1536 dimensões para OpenAI)';
COMMENT ON FUNCTION match_documents IS 'Busca documentos similares usando embeddings vetoriais. Filtra por tenantId para isolamento multi-tenant';

-- ============================================
-- 8. VERIFICAÇÃO FINAL
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Tabelas do template integradas com sucesso!';
  RAISE NOTICE '📋 Tabelas criadas:';
  RAISE NOTICE '   - clientData (substitui dados_cliente)';
  RAISE NOTICE '   - documents (RAG com vector embeddings)';
  RAISE NOTICE '📋 Campos adicionados:';
  RAISE NOTICE '   - conversations: phone, etapaFollowup, updatedAt';
  RAISE NOTICE '   - chatMessages: phone, nomewpp, botMessage, userMessage, messageType, active';
  RAISE NOTICE '🔍 Função criada: match_documents() para busca vetorial';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ IMPORTANTE: Todas as queries devem filtrar por tenantId!';
  RAISE NOTICE '   Exemplo: SELECT * FROM documents WHERE "tenantId" = 10;';
END $$;

