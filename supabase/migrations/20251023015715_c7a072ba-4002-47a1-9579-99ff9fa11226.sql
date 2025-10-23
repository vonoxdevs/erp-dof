-- Corrigir problemas de segurança detectados pelo linter

-- 1. Recriar view dashboard_stats sem security definer implícito
DROP VIEW IF EXISTS public.dashboard_stats CASCADE;

CREATE VIEW public.dashboard_stats
WITH (security_invoker = true)
AS
SELECT 
  t.company_id,
  SUM(CASE WHEN t.type = 'income' AND t.status = 'paid' THEN t.amount ELSE 0 END) as total_revenue,
  SUM(CASE WHEN t.type = 'expense' AND t.status = 'paid' THEN t.amount ELSE 0 END) as total_expenses,
  COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN t.status = 'overdue' THEN 1 END) as overdue_count
FROM public.transactions t
GROUP BY t.company_id;

-- 2. Recriar todas as políticas RLS especificando explicitamente TO authenticated
-- Isso evita warnings sobre anonymous access

-- Companies
DROP POLICY IF EXISTS "Users can view own company" ON public.companies;
DROP POLICY IF EXISTS "Users can update own company" ON public.companies;
DROP POLICY IF EXISTS "Users can create company" ON public.companies;

CREATE POLICY "Users can view own company"
  ON public.companies FOR SELECT
  TO authenticated
  USING (id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update own company"
  ON public.companies FOR UPDATE
  TO authenticated
  USING (id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create company"
  ON public.companies FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- User Profiles
DROP POLICY IF EXISTS "Users can view profiles in own company" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;

CREATE POLICY "Users can view profiles in own company"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- User Roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only owners can assign roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only owners can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only owners can delete roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Only owners can assign roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Only owners can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Only owners can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::app_role));

-- Bank Accounts
DROP POLICY IF EXISTS "Users can view bank accounts in own company" ON public.bank_accounts;
DROP POLICY IF EXISTS "Admins can manage bank accounts" ON public.bank_accounts;

CREATE POLICY "Users can view bank accounts in own company"
  ON public.bank_accounts FOR SELECT
  TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage bank accounts"
  ON public.bank_accounts FOR ALL
  TO authenticated
  USING (
    company_id = public.get_user_company_id(auth.uid())
    AND public.has_any_role(auth.uid(), ARRAY['owner'::app_role, 'admin'::app_role])
  );

-- Categories
DROP POLICY IF EXISTS "Users can view categories in own company" ON public.categories;
DROP POLICY IF EXISTS "Managers can manage categories" ON public.categories;

CREATE POLICY "Users can view categories in own company"
  ON public.categories FOR SELECT
  TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Managers can manage categories"
  ON public.categories FOR ALL
  TO authenticated
  USING (
    company_id = public.get_user_company_id(auth.uid())
    AND public.has_any_role(auth.uid(), ARRAY['owner'::app_role, 'admin'::app_role, 'manager'::app_role])
  );

-- Contacts
DROP POLICY IF EXISTS "Users can view contacts in own company" ON public.contacts;
DROP POLICY IF EXISTS "Users can manage contacts" ON public.contacts;

CREATE POLICY "Users can view contacts in own company"
  ON public.contacts FOR SELECT
  TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can manage contacts"
  ON public.contacts FOR ALL
  TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

-- Transactions
DROP POLICY IF EXISTS "Users can view transactions in own company" ON public.transactions;
DROP POLICY IF EXISTS "Users can manage transactions" ON public.transactions;

CREATE POLICY "Users can view transactions in own company"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can manage transactions"
  ON public.transactions FOR ALL
  TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));