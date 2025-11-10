-- Migration 2: Criar função e políticas para super_admin

-- Função para verificar se é super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
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
      AND role = 'super_admin'
  )
$$;

-- Atualizar RLS da tabela companies para super_admin ver tudo
DROP POLICY IF EXISTS "super_admin_access_all_companies" ON public.companies;
CREATE POLICY "super_admin_access_all_companies"
ON public.companies
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Atualizar RLS da tabela user_profiles para super_admin ver tudo
DROP POLICY IF EXISTS "super_admin_access_all_profiles" ON public.user_profiles;
CREATE POLICY "super_admin_access_all_profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Atualizar RLS da tabela user_roles para super_admin ver e gerenciar tudo
DROP POLICY IF EXISTS "super_admin_manage_all_roles" ON public.user_roles;
CREATE POLICY "super_admin_manage_all_roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Super admin pode ver todas as transações
DROP POLICY IF EXISTS "super_admin_access_all_transactions" ON public.transactions;
CREATE POLICY "super_admin_access_all_transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- Super admin pode ver todas as contas bancárias
DROP POLICY IF EXISTS "super_admin_access_all_bank_accounts" ON public.bank_accounts;
CREATE POLICY "super_admin_access_all_bank_accounts"
ON public.bank_accounts
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- Super admin pode ver todas as categorias
DROP POLICY IF EXISTS "super_admin_access_all_categories" ON public.categories;
CREATE POLICY "super_admin_access_all_categories"
ON public.categories
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- Super admin pode ver todos os contratos
DROP POLICY IF EXISTS "super_admin_access_all_contracts" ON public.contracts;
CREATE POLICY "super_admin_access_all_contracts"
ON public.contracts
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- Super admin pode ver todos os contatos
DROP POLICY IF EXISTS "super_admin_access_all_contacts" ON public.contacts;
CREATE POLICY "super_admin_access_all_contacts"
ON public.contacts
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- Inserir o super_admin para desenvolvedor@lucenaesantos.com.br
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::app_role
FROM auth.users
WHERE email = 'desenvolvedor@lucenaesantos.com.br'
ON CONFLICT (user_id, role) DO NOTHING;