-- ============================================
-- INTEGRAÇÃO DE TABELAS DO TEMPLATE
-- Multi-Tenant com Isolamento por tenantId
-- VERSÃO SEM PGVECTOR (para PostgreSQL sem extensão vector)
-- ============================================

-- NOTA: Esta versão usa TEXT para armazenar embeddings
-- Para usar busca vetorial completa, instale pgvector e use SQL_INTEGRAR_TABELAS_TEMPLATE.sql

-- ============================================
-- 1. TABELA: clientData (substitui dados_cliente)
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
-- 2. TABELA: documents (RAG - Embeddings em TEXT)
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  "tenantId" INTEGER NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  embedding TEXT, -- Armazenado como TEXT (array JSON) ao invés de vector
  -- Formato: '[0.1, 0.2, ...]' (array JSON de 1536 números)
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Índices para performance
  CONSTRAINT "documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "documents_tenantId_idx" ON documents("tenantId");
CREATE INDEX IF NOT EXISTS "documents_metadata_idx" ON documents USING GIN (metadata);

-- ============================================
-- 3. FUNÇÃO: match_documents (Busca por Similaridade de Cosseno)
-- Versão simplificada sem pgvector (usa cálculo de similaridade em aplicação)
-- ============================================
CREATE OR REPLACE FUNCTION match_documents_simple (
  match_count int DEFAULT NULL,
  filter jsonb DEFAULT '{}',
  tenant_id_filter int DEFAULT NULL
) RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  "tenantId" int
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    documents.metadata,
    documents."tenantId"
  FROM documents
  WHERE 
    documents.metadata @> filter
    AND (tenant_id_filter IS NULL OR documents."tenantId" = tenant_id_filter)
  LIMIT match_count;
END;
$$;

-- NOTA: Para busca vetorial completa, você precisará:
-- 1. Instalar pgvector no PostgreSQL
-- 2. Usar SQL_INTEGRAR_TABELAS_TEMPLATE.sql
-- 3. Ou calcular similaridade na aplicação (Node.js/Python)

-- ============================================
-- 4. ADICIONAR CAMPOS À TABELA conversations
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
-- 5. ADICIONAR CAMPOS À TABELA chatMessages
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
-- 6. COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================
COMMENT ON TABLE "clientData" IS 'Dados específicos de atendimento por cliente (substitui dados_cliente do template)';
COMMENT ON TABLE documents IS 'Documentos para RAG com embeddings armazenados como TEXT (sem pgvector)';
COMMENT ON FUNCTION match_documents_simple IS 'Busca documentos filtrados por metadata. Similaridade vetorial deve ser calculada na aplicação.';

-- ============================================
-- 7. VERIFICAÇÃO FINAL
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Tabelas do template integradas com sucesso (versão sem pgvector)!';
  RAISE NOTICE '📋 Tabelas criadas:';
  RAISE NOTICE '   - clientData (substitui dados_cliente)';
  RAISE NOTICE '   - documents (RAG com embeddings em TEXT)';
  RAISE NOTICE '📋 Campos adicionados:';
  RAISE NOTICE '   - conversations: phone, etapaFollowup, updatedAt';
  RAISE NOTICE '   - chatMessages: phone, nomewpp, botMessage, userMessage, messageType, active';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ IMPORTANTE:';
  RAISE NOTICE '   - Embeddings são armazenados como TEXT (array JSON)';
  RAISE NOTICE '   - Busca vetorial deve ser feita na aplicação (Node.js/Python)';
  RAISE NOTICE '   - Para busca vetorial nativa, instale pgvector e use SQL_INTEGRAR_TABELAS_TEMPLATE.sql';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ Todas as queries devem filtrar por tenantId!';
  RAISE NOTICE '   Exemplo: SELECT * FROM documents WHERE "tenantId" = 10;';
END $$;

