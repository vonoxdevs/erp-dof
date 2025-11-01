-- Criar tabela para relatórios gerados
CREATE TABLE IF NOT EXISTS public.generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  report_type VARCHAR NOT NULL CHECK (report_type IN ('monthly', 'custom', 'annual')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  file_url TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_generated_reports_company ON public.generated_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_period ON public.generated_reports(period_start, period_end);

-- Habilitar RLS
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;

-- Policy para visualização (usuários podem ver relatórios da sua empresa)
CREATE POLICY "Users can view company reports"
  ON public.generated_reports
  FOR SELECT
  USING (company_id = get_user_company_id());

-- Policy para inserção (sistema pode criar relatórios)
CREATE POLICY "System can create reports"
  ON public.generated_reports
  FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

-- Trigger para atualizar updated_at
CREATE TRIGGER set_updated_at_generated_reports
  BEFORE UPDATE ON public.generated_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Criar bucket de storage para relatórios financeiros
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'financial-reports',
  'financial-reports',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Policy para visualização de arquivos (usuários podem ver relatórios da sua empresa)
CREATE POLICY "Users can view company report files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'financial-reports' 
    AND auth.uid() IN (
      SELECT up.id 
      FROM public.user_profiles up
      WHERE up.company_id::text = (storage.foldername(name))[1]
    )
  );

-- Policy para upload de arquivos (sistema pode criar relatórios)
CREATE POLICY "System can upload report files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'financial-reports'
    AND auth.uid() IN (
      SELECT up.id 
      FROM public.user_profiles up
      WHERE up.company_id::text = (storage.foldername(name))[1]
    )
  );

-- Policy para deletar arquivos (usuários podem deletar relatórios da sua empresa)
CREATE POLICY "Users can delete company report files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'financial-reports'
    AND auth.uid() IN (
      SELECT up.id 
      FROM public.user_profiles up
      WHERE up.company_id::text = (storage.foldername(name))[1]
    )
  );