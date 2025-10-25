-- ============================================
-- FASE 1: CORREÇÃO DO LOOP INFINITO DE RLS
-- ============================================

-- 1. Remover políticas RLS problemáticas que causam recursão
DROP POLICY IF EXISTS "users_read_own_company" ON companies;
DROP POLICY IF EXISTS "users_update_own_company" ON companies;
DROP POLICY IF EXISTS "company_bank_accounts" ON bank_accounts;
DROP POLICY IF EXISTS "company_categories" ON categories;
DROP POLICY IF EXISTS "company_contacts" ON contacts;
DROP POLICY IF EXISTS "company_transactions" ON transactions;
DROP POLICY IF EXISTS "company_contracts" ON contracts;
DROP POLICY IF EXISTS "company_bank_api_credentials" ON bank_api_credentials;

-- 2. Criar função Security Definer SEM recursão
-- Esta função acessa user_profiles diretamente, sem passar pelas políticas RLS de companies
CREATE OR REPLACE FUNCTION public.auth_user_company_id()
RETURNS UUID AS $$
  SELECT company_id 
  FROM public.user_profiles 
  WHERE id = auth.uid()
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 3. Recriar políticas RLS CORRETAS sem recursão

-- Companies: usar a nova função que NÃO causa loop
CREATE POLICY "users_access_own_company" ON companies
  FOR ALL 
  USING (id = public.auth_user_company_id());

-- Bank Accounts
CREATE POLICY "company_bank_accounts" ON bank_accounts
  FOR ALL 
  USING (company_id = public.auth_user_company_id())
  WITH CHECK (company_id = public.auth_user_company_id());

-- Categories
CREATE POLICY "company_categories" ON categories
  FOR ALL 
  USING (company_id = public.auth_user_company_id())
  WITH CHECK (company_id = public.auth_user_company_id());

-- Contacts
CREATE POLICY "company_contacts" ON contacts
  FOR ALL 
  USING (company_id = public.auth_user_company_id())
  WITH CHECK (company_id = public.auth_user_company_id());

-- Transactions
CREATE POLICY "company_transactions" ON transactions
  FOR ALL 
  USING (company_id = public.auth_user_company_id())
  WITH CHECK (company_id = public.auth_user_company_id());

-- Contracts
CREATE POLICY "company_contracts" ON contracts
  FOR ALL 
  USING (company_id = public.auth_user_company_id())
  WITH CHECK (company_id = public.auth_user_company_id());

-- Bank API Credentials (apenas admin/owner)
CREATE POLICY "company_bank_api_credentials" ON bank_api_credentials
  FOR ALL 
  USING (
    company_id = public.auth_user_company_id() AND 
    public.has_any_role(auth.uid(), ARRAY['owner'::app_role, 'admin'::app_role])
  )
  WITH CHECK (
    company_id = public.auth_user_company_id() AND 
    public.has_any_role(auth.uid(), ARRAY['owner'::app_role, 'admin'::app_role])
  );

-- 4. Remover coluna 'role' duplicada de user_profiles
-- (a role correta está em user_roles table)
ALTER TABLE user_profiles DROP COLUMN IF EXISTS role;

-- 5. Adicionar índices de performance para queries de autenticação
CREATE INDEX IF NOT EXISTS idx_user_profiles_auth_lookup 
  ON user_profiles(id, company_id) 
  WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_roles_lookup 
  ON user_roles(user_id, role);

CREATE INDEX IF NOT EXISTS idx_companies_active 
  ON companies(id) 
  WHERE is_active = true;

-- 6. Adicionar validações JSONB para garantir estrutura de dados
ALTER TABLE companies 
  DROP CONSTRAINT IF EXISTS valid_address_structure;

ALTER TABLE companies 
  ADD CONSTRAINT valid_address_structure 
  CHECK (
    jsonb_typeof(address) = 'object' AND
    address ? 'cep' AND 
    address ? 'city' AND
    address ? 'state'
  );

ALTER TABLE companies 
  DROP CONSTRAINT IF EXISTS valid_responsible_structure;

ALTER TABLE companies 
  ADD CONSTRAINT valid_responsible_structure 
  CHECK (
    jsonb_typeof(responsible) = 'object' AND
    responsible ? 'name' AND 
    responsible ? 'cpf' AND
    responsible ? 'email'
  );

-- 7. Adicionar trigger para updated_at automático
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_updated_at ON companies;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON user_profiles;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 8. Remover função antiga após migração
DROP FUNCTION IF EXISTS public.get_user_company_id();

-- ============================================
-- RESULTADO: Loop infinito CORRIGIDO!
-- ============================================
-- A função auth_user_company_id() usa SECURITY DEFINER
-- para acessar user_profiles SEM passar pelas políticas
-- RLS de companies, eliminando a recursão.