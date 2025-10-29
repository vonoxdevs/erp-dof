-- Criar bucket de storage para logos de empresas
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Criar policy para permitir visualização pública das logos
CREATE POLICY "Public can view company logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

-- Criar policy para permitir upload de logos pela própria empresa
CREATE POLICY "Companies can upload their own logo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'company-logos' 
  AND (storage.foldername(name))[1] = (
    SELECT company_id::text 
    FROM public.user_profiles 
    WHERE id = auth.uid()
  )
);

-- Criar policy para permitir atualização de logos pela própria empresa
CREATE POLICY "Companies can update their own logo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'company-logos' 
  AND (storage.foldername(name))[1] = (
    SELECT company_id::text 
    FROM public.user_profiles 
    WHERE id = auth.uid()
  )
);

-- Criar policy para permitir deleção de logos pela própria empresa
CREATE POLICY "Companies can delete their own logo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'company-logos' 
  AND (storage.foldername(name))[1] = (
    SELECT company_id::text 
    FROM public.user_profiles 
    WHERE id = auth.uid()
  )
);