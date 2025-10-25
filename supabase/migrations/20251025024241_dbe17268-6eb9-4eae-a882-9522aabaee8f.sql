-- =====================================================
-- LSFIN ERP v2.0 - RECONSTRUÇÃO COMPLETA DO BANCO
-- Apaga tudo e recria com RLS correto (SEM LOOP!)
-- =====================================================

-- 1. APAGAR TUDO (ordem reversa para respeitar FKs)
DROP POLICY IF EXISTS "company_data" ON transactions;
DROP POLICY IF EXISTS "company_data" ON contacts;
DROP POLICY IF EXISTS "company_data" ON categories;
DROP POLICY IF EXISTS "company_data" ON bank_accounts;
DROP POLICY IF EXISTS "users_update_own_company" ON companies;
DROP POLICY IF EXISTS "users_insert_company" ON companies;
DROP POLICY IF EXISTS "users_read_own_company" ON companies;
DROP POLICY IF EXISTS "users_insert_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "users_read_own_profile" ON user_profiles;

DROP VIEW IF EXISTS dashboard_stats CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS bank_accounts CASCADE;
DROP TABLE IF EXISTS bank_api_credentials CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

DROP FUNCTION IF EXISTS get_user_company_id(uuid);
DROP FUNCTION IF EXISTS get_user_company_id();
DROP FUNCTION IF EXISTS create_default_categories(uuid);
DROP FUNCTION IF EXISTS has_role(uuid, app_role);
DROP FUNCTION IF EXISTS has_any_role(uuid, app_role[]);
DROP FUNCTION IF EXISTS get_dashboard_stats(uuid);
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

DROP TYPE IF EXISTS app_role CASCADE;

-- 2. CRIAR TIPO ENUM
CREATE TYPE app_role AS ENUM ('owner', 'admin', 'manager', 'user');

-- 3. CRIAR TABELAS NA ORDEM CORRETA

-- COMPANIES: Empresas (pode ser criada por qualquer usuário)
CREATE TABLE companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  legal_name VARCHAR(255) NOT NULL,
  cnpj VARCHAR(18) UNIQUE NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  address JSONB DEFAULT '{}'::jsonb,
  responsible JSONB DEFAULT '{}'::jsonb,
  settings JSONB DEFAULT '{"currency":"BRL","timezone":"America/Sao_Paulo"}'::jsonb,
  logo_url TEXT,
  industry VARCHAR(100),
  size VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- USER_PROFILES: Perfis de usuários
-- CRÍTICO: company_id é NULLABLE para permitir onboarding
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE, -- NULLABLE!
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  permissions JSONB DEFAULT '{}'::jsonb,
  avatar_url TEXT,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- USER_ROLES: Papéis de usuários (owner, admin, manager, user)
CREATE TABLE user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- BANK_ACCOUNTS: Contas bancárias
CREATE TABLE bank_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  bank_code VARCHAR(3) NOT NULL,
  bank_name VARCHAR(100) NOT NULL,
  account_type VARCHAR(20) DEFAULT 'checking',
  account_number VARCHAR(20) NOT NULL,
  account_digit VARCHAR(10),
  agency_number VARCHAR(10) NOT NULL,
  holder_name VARCHAR(255) NOT NULL,
  holder_document VARCHAR(18) NOT NULL,
  current_balance NUMERIC(15,2) DEFAULT 0,
  available_balance NUMERIC(15,2) DEFAULT 0,
  blocked_balance NUMERIC(15,2) DEFAULT 0,
  initial_balance NUMERIC(15,2) DEFAULT 0,
  overdraft_limit NUMERIC(15,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'BRL',
  allow_negative_balance BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  auto_sync BOOLEAN DEFAULT false,
  sync_frequency INTEGER DEFAULT 60,
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CATEGORIES: Categorias financeiras
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) CHECK (type IN ('income', 'expense')) NOT NULL,
  parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  description TEXT,
  icon VARCHAR(50) DEFAULT 'folder',
  color VARCHAR(7) DEFAULT '#3B82F6',
  sort_order INTEGER DEFAULT 0,
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CONTACTS: Clientes e fornecedores
CREATE TABLE contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  document VARCHAR(18) NOT NULL,
  document_type VARCHAR(10) CHECK (document_type IN ('cpf','cnpj')) NOT NULL,
  type VARCHAR(20) CHECK (type IN ('client', 'supplier', 'both')) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  address JSONB DEFAULT '{}'::jsonb,
  bank_details JSONB,
  credit_limit NUMERIC(15,2) DEFAULT 0,
  payment_terms INTEGER DEFAULT 30,
  discount_percentage NUMERIC(5,2) DEFAULT 0,
  tags TEXT[],
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TRANSACTIONS: Transações financeiras
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(20) CHECK (type IN ('income', 'expense', 'transfer')) NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
  transfer_to_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
  description VARCHAR(255) NOT NULL,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  due_date DATE NOT NULL,
  payment_date DATE,
  paid_date DATE,
  status VARCHAR(20) CHECK (status IN ('pending','paid','overdue','cancelled')) DEFAULT 'pending',
  payment_method VARCHAR(50),
  reference_number VARCHAR(100),
  notes TEXT,
  tags TEXT[],
  attachments JSONB DEFAULT '[]'::jsonb,
  is_recurring BOOLEAN DEFAULT false,
  recurring_contract_id UUID,
  recurrence_config JSONB,
  contract_id UUID,
  installment_number INTEGER,
  total_installments INTEGER,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CONTRACTS: Contratos recorrentes
CREATE TABLE contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) CHECK (type IN ('income', 'expense')) NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
  description TEXT,
  amount NUMERIC(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'BRL',
  frequency VARCHAR(20) CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  payment_method VARCHAR(50),
  auto_generate BOOLEAN DEFAULT true,
  generation_day INTEGER DEFAULT 1,
  last_generated_date DATE,
  total_installments INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BANK_API_CREDENTIALS: Credenciais de API bancária
CREATE TABLE bank_api_credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE CASCADE NOT NULL,
  api_credentials JSONB NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX idx_user_profiles_company_id ON user_profiles(company_id);
CREATE INDEX idx_transactions_company_date ON transactions(company_id, due_date DESC);
CREATE INDEX idx_transactions_status ON transactions(company_id, status);
CREATE INDEX idx_bank_accounts_company ON bank_accounts(company_id, is_active);
CREATE INDEX idx_categories_company_type ON categories(company_id, type, is_active);
CREATE INDEX idx_contacts_company ON contacts(company_id, is_active);
CREATE INDEX idx_user_roles_user ON user_roles(user_id, role);

-- 5. CRIAR FUNÇÕES AUXILIARES

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função SEGURA para obter company_id (SEM causar loop!)
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Função para verificar roles (sem causar recursão)
CREATE OR REPLACE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
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

-- Função para verificar múltiplos roles
CREATE OR REPLACE FUNCTION has_any_role(_user_id UUID, _roles app_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
  )
$$;

-- Função para criar categorias padrão
CREATE OR REPLACE FUNCTION create_default_categories(p_company_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Categorias de Receita
  INSERT INTO categories (company_id, name, type, icon, color) VALUES
    (p_company_id, 'Vendas', 'income', '💰', '#10b981'),
    (p_company_id, 'Serviços', 'income', '🛠️', '#3b82f6'),
    (p_company_id, 'Consultoria', 'income', '📊', '#8b5cf6'),
    (p_company_id, 'Outras Receitas', 'income', '📈', '#06b6d4');

  -- Categorias de Despesa
  INSERT INTO categories (company_id, name, type, icon, color) VALUES
    (p_company_id, 'Salários', 'expense', '👥', '#ef4444'),
    (p_company_id, 'Fornecedores', 'expense', '🏪', '#f97316'),
    (p_company_id, 'Aluguel', 'expense', '🏢', '#eab308'),
    (p_company_id, 'Marketing', 'expense', '📢', '#ec4899'),
    (p_company_id, 'Tecnologia', 'expense', '💻', '#6366f1'),
    (p_company_id, 'Outras Despesas', 'expense', '📉', '#64748b');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter estatísticas do dashboard
CREATE OR REPLACE FUNCTION get_dashboard_stats(user_company_id UUID)
RETURNS TABLE(
  company_id UUID,
  total_revenue NUMERIC,
  total_expenses NUMERIC,
  pending_count BIGINT,
  overdue_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    t.company_id,
    SUM(CASE WHEN t.type = 'income' AND t.status = 'paid' THEN t.amount ELSE 0 END) as total_revenue,
    SUM(CASE WHEN t.type = 'expense' AND t.status = 'paid' THEN t.amount ELSE 0 END) as total_expenses,
    COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN t.status = 'overdue' THEN 1 END) as overdue_count
  FROM public.transactions t
  WHERE t.company_id = user_company_id
  GROUP BY t.company_id;
$$;

-- 6. CRIAR TRIGGERS
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON bank_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. HABILITAR RLS EM TODAS AS TABELAS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_api_credentials ENABLE ROW LEVEL SECURITY;

-- 8. POLÍTICAS RLS CORRETAS (SEM LOOP!)

-- USER_PROFILES: Acesso direto com auth.uid() (SEM LOOP!)
CREATE POLICY "users_read_own_profile" ON user_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "users_update_own_profile" ON user_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_insert_own_profile" ON user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- COMPANIES: Via subquery (sem usar função que causa loop)
CREATE POLICY "users_read_own_company" ON companies
  FOR SELECT TO authenticated
  USING (
    id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid() AND company_id IS NOT NULL)
  );

CREATE POLICY "users_insert_company" ON companies
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "users_update_own_company" ON companies
  FOR UPDATE TO authenticated
  USING (
    id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid() AND company_id IS NOT NULL)
  );

-- USER_ROLES: Usuários veem seus próprios roles
CREATE POLICY "users_read_own_roles" ON user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "owners_manage_roles" ON user_roles
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'owner'))
  WITH CHECK (has_role(auth.uid(), 'owner'));

-- DEMAIS TABELAS: Via função get_user_company_id() (agora é seguro)
CREATE POLICY "company_bank_accounts" ON bank_accounts
  FOR ALL TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "company_categories" ON categories
  FOR ALL TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "company_contacts" ON contacts
  FOR ALL TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "company_transactions" ON transactions
  FOR ALL TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "company_contracts" ON contracts
  FOR ALL TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "company_bank_api_credentials" ON bank_api_credentials
  FOR ALL TO authenticated
  USING (company_id = get_user_company_id() AND has_any_role(auth.uid(), ARRAY['owner'::app_role, 'admin'::app_role]))
  WITH CHECK (company_id = get_user_company_id() AND has_any_role(auth.uid(), ARRAY['owner'::app_role, 'admin'::app_role]));

-- 9. CRIAR VIEW PARA DASHBOARD
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT 
  t.company_id,
  SUM(CASE WHEN t.type = 'income' AND t.status = 'paid' THEN t.amount ELSE 0 END) as total_revenue,
  SUM(CASE WHEN t.type = 'expense' AND t.status = 'paid' THEN t.amount ELSE 0 END) as total_expenses,
  COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN t.status = 'overdue' THEN 1 END) as overdue_count
FROM transactions t
GROUP BY t.company_id;