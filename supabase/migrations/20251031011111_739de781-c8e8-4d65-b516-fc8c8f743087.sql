-- =============================================================================
-- Migration: Habilitar RLS em security_audit_metadata
-- Parte 1: Criar função has_role (se não existir)
-- Parte 2: Aplicar políticas RLS
-- =============================================================================

-- 1. Criar função has_role para verificar roles de usuários
-- Esta função é SECURITY DEFINER para evitar recursão em RLS policies
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 2. Habilitar Row Level Security na tabela de auditoria
ALTER TABLE public.security_audit_metadata ENABLE ROW LEVEL SECURITY;

-- 3. Política SELECT: Apenas admins podem ver auditorias
CREATE POLICY "Admins can view security audit logs"
ON public.security_audit_metadata
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4. Política INSERT: Sistema e admins podem inserir auditorias
CREATE POLICY "System can insert security audit logs"
ON public.security_audit_metadata
FOR INSERT
TO authenticated
WITH CHECK (
  -- Permite inserção se usuário é admin
  -- OU se auth.uid() é NULL (chamadas do service role/migrations)
  public.has_role(auth.uid(), 'admin')
  OR auth.uid() IS NULL
);

-- 5. Adicionar comentários para documentação
COMMENT ON FUNCTION public.has_role(uuid, app_role)
IS 'Verifica se um usuário possui uma role específica. Função SECURITY DEFINER para evitar recursão em RLS.';

COMMENT ON POLICY "Admins can view security audit logs" 
ON public.security_audit_metadata 
IS 'Restringe visualização de logs de auditoria apenas para usuários com role admin';

COMMENT ON POLICY "System can insert security audit logs" 
ON public.security_audit_metadata 
IS 'Permite que o sistema (migrations) e admins insiram registros de auditoria';