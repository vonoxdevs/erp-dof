-- ============================================
-- FASE 3: Contratos e Contatos - Novos Campos
-- ============================================

-- 3.1: Adicionar campo service_description em contracts
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS service_description TEXT;

-- 3.2: Adicionar campo para armazenar anexos (URLs dos arquivos)
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

-- 3.3: Remover obrigatoriedade de categoria_receita_id
ALTER TABLE contracts
ALTER COLUMN categoria_receita_id DROP NOT NULL;

-- 3.4: Adicionar campos de gestor em contacts
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS manager_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS manager_position VARCHAR(100),
ADD COLUMN IF NOT EXISTS manager_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS manager_email VARCHAR(100);

-- 3.5: Garantir que address é jsonb (pode já existir mas vamos garantir)
-- Se já for jsonb, não faz nada, se não for, converte
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' 
        AND column_name = 'address' 
        AND data_type != 'jsonb'
    ) THEN
        ALTER TABLE contacts ALTER COLUMN address TYPE jsonb USING address::jsonb;
    END IF;
END $$;

-- Comentários para documentação
COMMENT ON COLUMN contracts.service_description IS 'Descrição detalhada do tipo de serviço contratado';
COMMENT ON COLUMN contracts.attachments IS 'Array de objetos com informações dos arquivos anexados (nome, url, tamanho, etc)';
COMMENT ON COLUMN contacts.manager_name IS 'Nome do gestor/responsável pelo contato';
COMMENT ON COLUMN contacts.manager_position IS 'Cargo do gestor/responsável';
COMMENT ON COLUMN contacts.manager_phone IS 'Telefone do gestor/responsável';
COMMENT ON COLUMN contacts.manager_email IS 'E-mail do gestor/responsável';