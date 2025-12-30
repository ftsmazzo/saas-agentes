-- ============================================
-- Adicionar Constraint UNIQUE em contacts
-- ============================================
-- Esta constraint permite usar ON CONFLICT na query de inserção
-- Garante que não haverá contatos duplicados por tenant

-- Verificar se a constraint já existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'contacts_tenant_phone_unique'
  ) THEN
    ALTER TABLE contacts
    ADD CONSTRAINT contacts_tenant_phone_unique 
    UNIQUE ("tenantId", "phoneNumber");
    
    RAISE NOTICE 'Constraint contacts_tenant_phone_unique criada com sucesso!';
  ELSE
    RAISE NOTICE 'Constraint contacts_tenant_phone_unique já existe.';
  END IF;
END $$;

