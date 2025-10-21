-- ============================================
-- LSFIN v2.0 - CORPORATE ERP DATABASE SCHEMA
-- Phase 1: Foundation Tables
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: companies
-- ============================================
CREATE TABLE companies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  cnpj VARCHAR(18) UNIQUE NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  address JSONB DEFAULT '{}',
  responsible JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{"currency":"BRL","timezone":"America/Sao_Paulo"}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- ============================================
-- TABLE: user_profiles
-- ============================================
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  company_id UUID REFERENCES companies(id) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('owner','admin','manager','user')),
  permissions JSONB DEFAULT '{}',
  avatar_url TEXT,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: bank_accounts
-- ============================================
CREATE TABLE bank_accounts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) NOT NULL,
  bank_code VARCHAR(3) NOT NULL,
  bank_name VARCHAR(100) NOT NULL,
  agency_number VARCHAR(10) NOT NULL,
  account_number VARCHAR(20) NOT NULL,
  account_digit VARCHAR(2),
  account_type VARCHAR(20) DEFAULT 'checking' CHECK (account_type IN ('checking','savings','investment')),
  holder_name VARCHAR(255) NOT NULL,
  holder_document VARCHAR(18) NOT NULL,
  current_balance DECIMAL(15,2) DEFAULT 0,
  available_balance DECIMAL(15,2) DEFAULT 0,
  blocked_balance DECIMAL(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  allow_negative_balance BOOLEAN DEFAULT false,
  overdraft_limit DECIMAL(15,2) DEFAULT 0,
  api_credentials JSONB,
  last_sync TIMESTAMPTZ,
  auto_sync BOOLEAN DEFAULT false,
  sync_frequency INTEGER DEFAULT 60,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, bank_code, agency_number, account_number)
);

-- ============================================
-- TABLE: categories
-- ============================================
CREATE TABLE categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) CHECK (type IN ('revenue', 'expense', 'transfer')) NOT NULL,
  parent_id UUID REFERENCES categories(id),
  color VARCHAR(7) DEFAULT '#3B82F6',
  icon VARCHAR(50) DEFAULT 'folder',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT no_self_reference CHECK (id != parent_id)
);

-- ============================================
-- TABLE: contacts
-- ============================================
CREATE TABLE contacts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) NOT NULL,
  name VARCHAR(255) NOT NULL,
  document VARCHAR(18) NOT NULL,
  document_type VARCHAR(10) CHECK (document_type IN ('cpf','cnpj')) NOT NULL,
  type VARCHAR(20) CHECK (type IN ('client', 'supplier', 'both')) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  address JSONB,
  credit_limit DECIMAL(15,2) DEFAULT 0,
  payment_terms INTEGER DEFAULT 30,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  bank_details JSONB,
  tags TEXT[],
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, document)
);

-- ============================================
-- TABLE: transactions
-- ============================================
CREATE TABLE transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) NOT NULL,
  type VARCHAR(20) CHECK (type IN ('revenue', 'expense', 'transfer')) NOT NULL,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  description VARCHAR(500) NOT NULL,
  due_date DATE NOT NULL,
  payment_date DATE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')) NOT NULL,
  category_id UUID REFERENCES categories(id),
  bank_account_id UUID REFERENCES bank_accounts(id),
  contact_id UUID REFERENCES contacts(id),
  recurring_contract_id UUID,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_config JSONB,
  payment_method VARCHAR(50),
  reference_number VARCHAR(100),
  attachments JSONB DEFAULT '[]',
  tags TEXT[],
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES for Performance
-- ============================================
CREATE INDEX idx_user_profiles_company ON user_profiles(company_id);
CREATE INDEX idx_bank_accounts_company ON bank_accounts(company_id);
CREATE INDEX idx_categories_company ON categories(company_id);
CREATE INDEX idx_contacts_company ON contacts(company_id);
CREATE INDEX idx_transactions_company ON transactions(company_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_due_date ON transactions(due_date);
CREATE INDEX idx_transactions_type ON transactions(type);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Companies: Users can only see their own company
CREATE POLICY "Users can view own company"
  ON companies FOR SELECT
  USING (id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  ));

-- User Profiles: Users can view profiles in their company
CREATE POLICY "Users can view profiles in own company"
  ON user_profiles FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid());

-- Bank Accounts: Users can view accounts in their company
CREATE POLICY "Users can view bank accounts in own company"
  ON bank_accounts FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can manage bank accounts"
  ON bank_accounts FOR ALL
  USING (company_id IN (
    SELECT company_id FROM user_profiles 
    WHERE id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- Categories: Users can view categories in their company
CREATE POLICY "Users can view categories in own company"
  ON categories FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Managers can manage categories"
  ON categories FOR ALL
  USING (company_id IN (
    SELECT company_id FROM user_profiles 
    WHERE id = auth.uid() AND role IN ('owner', 'admin', 'manager')
  ));

-- Contacts: Users can view contacts in their company
CREATE POLICY "Users can view contacts in own company"
  ON contacts FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can manage contacts"
  ON contacts FOR ALL
  USING (company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  ));

-- Transactions: Users can view transactions in their company
CREATE POLICY "Users can view transactions in own company"
  ON transactions FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can manage transactions"
  ON transactions FOR ALL
  USING (company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  ));

-- ============================================
-- TRIGGERS for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();