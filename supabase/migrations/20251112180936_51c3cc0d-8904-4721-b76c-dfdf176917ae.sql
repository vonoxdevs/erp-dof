-- ============================================
-- FASE 3: Storage Bucket para Anexos de Contratos
-- ============================================

-- Criar bucket para anexos de contratos (privado)
INSERT INTO storage.buckets (id, name, public)
VALUES ('contract-attachments', 'contract-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas RLS para o bucket contract-attachments
-- Usuários podem fazer upload de arquivos da sua empresa
CREATE POLICY "Users can upload contract attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'contract-attachments' 
  AND (storage.foldername(name))[1] = (
    SELECT company_id::text 
    FROM user_profiles 
    WHERE id = auth.uid()
  )
);

-- Usuários podem visualizar/baixar arquivos da sua empresa
CREATE POLICY "Users can view company contract attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'contract-attachments'
  AND (storage.foldername(name))[1] = (
    SELECT company_id::text 
    FROM user_profiles 
    WHERE id = auth.uid()
  )
);

-- Usuários podem deletar arquivos da sua empresa
CREATE POLICY "Users can delete company contract attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'contract-attachments'
  AND (storage.foldername(name))[1] = (
    SELECT company_id::text 
    FROM user_profiles 
    WHERE id = auth.uid()
  )
);