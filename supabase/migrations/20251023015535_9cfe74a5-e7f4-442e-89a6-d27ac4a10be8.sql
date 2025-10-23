-- Desabilitar RLS temporariamente e dropar tudo na ordem correta
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role) CASCADE;
DROP FUNCTION IF EXISTS public.has_any_role(uuid, app_role[]) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_company_id(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Dropar tabelas na ordem correta
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.contacts CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.bank_accounts CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;

-- Dropar views
DROP VIEW IF EXISTS public.dashboard_stats CASCADE;

-- Dropar enums
DROP TYPE IF EXISTS public.app_role CASCADE;

-- ====================
-- CRIAR ESTRUTURA DO ZERO
-- ====================

-- Criar enum para roles
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'manager', 'user');

-- Tabela de empresas
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  cnpj VARCHAR NOT NULL UNIQUE,
  email VARCHAR,
  phone VARCHAR,
  address JSONB DEFAULT '{}'::jsonb,
  responsible JSONB DEFAULT '{}'::jsonb,
  settings JSONB DEFAULT '{"currency": "BRL", "timezone": "America/Sao_Paulo"}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de perfis de usuários
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  full_name VARCHAR NOT NULL,
  avatar_url TEXT,
  role VARCHAR DEFAULT 'user',
  permissions JSONB DEFAULT '{}'::jsonb,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de roles (separada para segurança)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Tabela de contas bancárias
CREATE TABLE public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  holder_name VARCHAR NOT NULL,
  holder_document VARCHAR NOT NULL,
  bank_name VARCHAR NOT NULL,
  bank_code VARCHAR NOT NULL,
  agency_number VARCHAR NOT NULL,
  account_number VARCHAR NOT NULL,
  account_digit VARCHAR,
  account_type VARCHAR DEFAULT 'checking',
  current_balance NUMERIC DEFAULT 0,
  available_balance NUMERIC DEFAULT 0,
  blocked_balance NUMERIC DEFAULT 0,
  overdraft_limit NUMERIC DEFAULT 0,
  allow_negative_balance BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  auto_sync BOOLEAN DEFAULT false,
  sync_frequency INTEGER DEFAULT 60,
  last_sync TIMESTAMPTZ,
  api_credentials JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de categorias
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name VARCHAR NOT NULL,
  description TEXT,
  type VARCHAR NOT NULL CHECK (type IN ('income', 'expense')),
  icon VARCHAR DEFAULT 'folder',
  color VARCHAR DEFAULT '#3B82F6',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de contatos
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  document VARCHAR NOT NULL,
  document_type VARCHAR NOT NULL CHECK (document_type IN ('cpf', 'cnpj')),
  type VARCHAR NOT NULL CHECK (type IN ('customer', 'supplier', 'both')),
  email VARCHAR,
  phone VARCHAR,
  address JSONB,
  bank_details JSONB,
  credit_limit NUMERIC DEFAULT 0,
  payment_terms INTEGER DEFAULT 30,
  discount_percentage NUMERIC DEFAULT 0,
  notes TEXT,
  tags TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de transações
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  description VARCHAR NOT NULL,
  type VARCHAR NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  due_date DATE NOT NULL,
  payment_date DATE,
  payment_method VARCHAR,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  reference_number VARCHAR,
  notes TEXT,
  tags TEXT[],
  attachments JSONB DEFAULT '[]'::jsonb,
  is_recurring BOOLEAN DEFAULT false,
  recurring_contract_id UUID,
  recurrence_config JSONB,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ====================
-- FUNÇÕES DE SEGURANÇA
-- ====================

-- Função para verificar role específica
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

-- Função para verificar múltiplas roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
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
      AND role = ANY(_roles)
  )
$$;

-- Função para obter company_id do usuário (evita recursão)
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.user_profiles
  WHERE id = _user_id
  LIMIT 1
$$;

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ====================
-- TRIGGERS
-- ====================

-- Triggers para updated_at
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para criar perfil automaticamente no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_company_id UUID;
  user_full_name TEXT;
  temp_cnpj TEXT;
BEGIN
  -- Extrair nome completo dos metadados
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    'Usuário'
  );

  -- Gerar CNPJ temporário único
  temp_cnpj := 'PENDING-' || SUBSTRING(NEW.id::TEXT, 1, 8);

  -- Criar empresa
  INSERT INTO public.companies (name, cnpj, email, responsible)
  VALUES (
    user_full_name || ' Company',
    temp_cnpj,
    NEW.email,
    jsonb_build_object('name', user_full_name, 'email', NEW.email)
  )
  RETURNING id INTO new_company_id;

  -- Criar perfil
  INSERT INTO public.user_profiles (id, company_id, full_name)
  VALUES (NEW.id, new_company_id, user_full_name);

  -- Atribuir role de owner
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'owner');

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erro ao criar perfil: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Trigger para novo usuário
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ====================
-- POLÍTICAS RLS
-- ====================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Políticas para companies
CREATE POLICY "Users can view own company"
  ON public.companies FOR SELECT
  USING (id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update own company"
  ON public.companies FOR UPDATE
  USING (id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create company"
  ON public.companies FOR INSERT
  WITH CHECK (true);

-- Políticas para user_profiles
CREATE POLICY "Users can view profiles in own company"
  ON public.user_profiles FOR SELECT
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Políticas para user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Only owners can assign roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Only owners can update roles"
  ON public.user_roles FOR UPDATE
  USING (public.has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Only owners can delete roles"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'owner'::app_role));

-- Políticas para bank_accounts
CREATE POLICY "Users can view bank accounts in own company"
  ON public.bank_accounts FOR SELECT
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage bank accounts"
  ON public.bank_accounts FOR ALL
  USING (
    company_id = public.get_user_company_id(auth.uid())
    AND public.has_any_role(auth.uid(), ARRAY['owner'::app_role, 'admin'::app_role])
  );

-- Políticas para categories
CREATE POLICY "Users can view categories in own company"
  ON public.categories FOR SELECT
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Managers can manage categories"
  ON public.categories FOR ALL
  USING (
    company_id = public.get_user_company_id(auth.uid())
    AND public.has_any_role(auth.uid(), ARRAY['owner'::app_role, 'admin'::app_role, 'manager'::app_role])
  );

-- Políticas para contacts
CREATE POLICY "Users can view contacts in own company"
  ON public.contacts FOR SELECT
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can manage contacts"
  ON public.contacts FOR ALL
  USING (company_id = public.get_user_company_id(auth.uid()));

-- Políticas para transactions
CREATE POLICY "Users can view transactions in own company"
  ON public.transactions FOR SELECT
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can manage transactions"
  ON public.transactions FOR ALL
  USING (company_id = public.get_user_company_id(auth.uid()));

-- ====================
-- VIEW PARA DASHBOARD
-- ====================

CREATE OR REPLACE VIEW public.dashboard_stats AS
SELECT 
  t.company_id,
  SUM(CASE WHEN t.type = 'income' AND t.status = 'paid' THEN t.amount ELSE 0 END) as total_revenue,
  SUM(CASE WHEN t.type = 'expense' AND t.status = 'paid' THEN t.amount ELSE 0 END) as total_expenses,
  COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN t.status = 'overdue' THEN 1 END) as overdue_count
FROM public.transactions t
GROUP BY t.company_id;

-- Comentários para documentação
COMMENT ON TABLE public.companies IS 'Empresas cadastradas no sistema';
COMMENT ON TABLE public.user_profiles IS 'Perfis de usuários vinculados a empresas';
COMMENT ON TABLE public.user_roles IS 'Roles de usuários para controle de permissões';
COMMENT ON TABLE public.bank_accounts IS 'Contas bancárias das empresas';
COMMENT ON TABLE public.categories IS 'Categorias para classificação de transações';
COMMENT ON TABLE public.contacts IS 'Contatos (clientes e fornecedores)';
COMMENT ON TABLE public.transactions IS 'Transações financeiras (receitas e despesas)';