-- =====================================================
-- LSFIN v2.0 - CORREÇÕES CRÍTICAS FASE 1
-- =====================================================

-- 1. CORRIGIR TIPO USER_ROLE_TYPE E RECRIAR USER_ROLES
-- Remover a tabela e tipo antigos se existirem
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TYPE IF EXISTS user_role_type CASCADE;
DROP TYPE IF EXISTS app_role CASCADE;

-- Criar ENUM para roles
CREATE TYPE app_role AS ENUM (
  'admin',      -- Acesso total
  'manager',    -- Acesso leitura/escrita (sem delete)
  'analyst',    -- Apenas leitura e relatórios
  'accountant'  -- Acesso financeiro específico
);

-- Criar tabela user_roles
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL DEFAULT 'analyst',
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_roles_pkey PRIMARY KEY (id),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT user_roles_unique_user_role UNIQUE (user_id, role)
);

-- Ativar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para user_roles
CREATE POLICY "Users can view their own roles" 
  ON public.user_roles FOR SELECT 
  USING (user_id = auth.uid());

-- Inserir role admin para usuários existentes
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. ADICIONAR CAMPOS FALTANTES
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS ai_classification jsonb DEFAULT NULL;

ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS next_generation_date date;

-- 3. ADICIONAR SOFT DELETE
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL;

ALTER TABLE public.bank_accounts 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL;

ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL;

ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL;

ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL;

ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL;

-- 4. CRIAR TABELA DE NOTIFICAÇÕES
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid NOT NULL,
  type character varying NOT NULL,
  title character varying NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  read_at timestamp with time zone,
  action_url character varying,
  priority character varying DEFAULT 'normal' 
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT notifications_company_id_fkey FOREIGN KEY (company_id) 
    REFERENCES public.companies(id) ON DELETE CASCADE
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" 
  ON public.notifications FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" 
  ON public.notifications FOR UPDATE 
  USING (user_id = auth.uid());

-- 5. CRIAR TABELA DE IMPORTAÇÕES
CREATE TABLE IF NOT EXISTS public.imports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  bank_account_id uuid NOT NULL,
  file_name character varying NOT NULL,
  file_type character varying NOT NULL,
  file_size integer,
  file_url text,
  status character varying DEFAULT 'processing' 
    CHECK (status IN ('processing', 'completed', 'failed', 'cancelled')),
  total_records integer DEFAULT 0,
  processed_records integer DEFAULT 0,
  imported_records integer DEFAULT 0,
  failed_records integer DEFAULT 0,
  errors jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  
  CONSTRAINT imports_pkey PRIMARY KEY (id),
  CONSTRAINT imports_company_id_fkey FOREIGN KEY (company_id) 
    REFERENCES public.companies(id) ON DELETE CASCADE,
  CONSTRAINT imports_bank_account_id_fkey FOREIGN KEY (bank_account_id) 
    REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  CONSTRAINT imports_created_by_fkey FOREIGN KEY (created_by) 
    REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company imports" 
  ON public.imports FOR SELECT 
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can create imports" 
  ON public.imports FOR INSERT 
  WITH CHECK (company_id = get_user_company_id());

-- 6. CRIAR TABELA DE LOGS DE AUDITORIA
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  user_id uuid NOT NULL,
  entity_type character varying NOT NULL,
  entity_id uuid NOT NULL,
  action character varying NOT NULL 
    CHECK (action IN ('create', 'update', 'delete', 'view', 'export')),
  old_data jsonb,
  new_data jsonb,
  changes jsonb,
  ip_address character varying,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_company_id_fkey FOREIGN KEY (company_id) 
    REFERENCES public.companies(id) ON DELETE CASCADE,
  CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company audit logs" 
  ON public.audit_logs FOR SELECT 
  USING (company_id = get_user_company_id());