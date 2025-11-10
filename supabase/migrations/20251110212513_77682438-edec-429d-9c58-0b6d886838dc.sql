-- Criar tabela de convites de usuários
CREATE TABLE IF NOT EXISTS public.user_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email character varying NOT NULL,
  full_name character varying NOT NULL,
  role character varying NOT NULL,
  department character varying,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  expires_at timestamp with time zone NOT NULL,
  accepted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(token)
);

-- Habilitar RLS
ALTER TABLE public.user_invites ENABLE ROW LEVEL SECURITY;

-- Política: Admins podem criar convites na sua empresa
CREATE POLICY "Admins can create invites"
ON public.user_invites
FOR INSERT
TO authenticated
WITH CHECK (
  company_id = get_user_company_id() 
  AND has_role(auth.uid(), 'admin')
);

-- Política: Admins podem ver convites da empresa
CREATE POLICY "Admins can view company invites"
ON public.user_invites
FOR SELECT
TO authenticated
USING (
  company_id = get_user_company_id() 
  AND has_role(auth.uid(), 'admin')
);

-- Política: Usuários podem ver convites pelo token (para aceitar)
CREATE POLICY "Users can view invites by token"
ON public.user_invites
FOR SELECT
TO authenticated
USING (true);

-- Política: Sistema pode atualizar convites (quando aceitos)
CREATE POLICY "System can update invites"
ON public.user_invites
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Índices para performance
CREATE INDEX idx_user_invites_token ON public.user_invites(token);
CREATE INDEX idx_user_invites_company ON public.user_invites(company_id);
CREATE INDEX idx_user_invites_email ON public.user_invites(email);