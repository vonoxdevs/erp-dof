-- Adicionar campos de controle de teste grátis nas empresas
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '3 days'),
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'trial';

-- Adicionar campo para identificar se o usuário é o owner original (criador da empresa no teste grátis)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS is_trial_owner BOOLEAN DEFAULT false;

-- Função para verificar se a empresa está ativa (não expirou o trial)
CREATE OR REPLACE FUNCTION public.is_company_active(company_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      -- Se não está em trial, está ativa
      WHEN c.is_trial = false THEN true
      -- Se está em trial e ainda não expirou, está ativa
      WHEN c.is_trial = true AND c.trial_end_date > now() THEN true
      -- Se expirou o trial, está inativa
      ELSE false
    END
  FROM companies c
  WHERE c.id = company_uuid;
$$;

-- Função para verificar se o usuário tem acesso à empresa (considera trial e se é owner)
CREATE OR REPLACE FUNCTION public.user_has_company_access(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      -- Se a empresa não está em trial, tem acesso
      WHEN c.is_trial = false THEN true
      -- Se está em trial e não expirou, tem acesso
      WHEN c.is_trial = true AND c.trial_end_date > now() THEN true
      -- Se o trial expirou mas o usuário NÃO é o trial owner (foi convidado pelo master), tem acesso
      WHEN c.is_trial = true AND c.trial_end_date <= now() AND up.is_trial_owner = false THEN true
      -- Caso contrário, não tem acesso (trial expirou e é o trial owner)
      ELSE false
    END
  FROM user_profiles up
  JOIN companies c ON c.id = up.company_id
  WHERE up.id = user_uuid;
$$;

-- Atualizar RLS nas principais tabelas para considerar o status do trial
-- Política para transactions
DROP POLICY IF EXISTS company_transactions ON transactions;
CREATE POLICY company_transactions ON transactions
FOR ALL
USING (
  company_id = auth_user_company_id() 
  AND user_has_company_access(auth.uid())
)
WITH CHECK (
  company_id = auth_user_company_id() 
  AND user_has_company_access(auth.uid())
);

-- Política para bank_accounts
DROP POLICY IF EXISTS company_bank_accounts ON bank_accounts;
CREATE POLICY company_bank_accounts ON bank_accounts
FOR ALL
USING (
  company_id = auth_user_company_id() 
  AND user_has_company_access(auth.uid())
)
WITH CHECK (
  company_id = auth_user_company_id() 
  AND user_has_company_access(auth.uid())
);

-- Política para contacts
DROP POLICY IF EXISTS company_contacts ON contacts;
CREATE POLICY company_contacts ON contacts
FOR ALL
USING (
  company_id = auth_user_company_id() 
  AND user_has_company_access(auth.uid())
)
WITH CHECK (
  company_id = auth_user_company_id() 
  AND user_has_company_access(auth.uid())
);

-- Política para contracts
DROP POLICY IF EXISTS company_contracts ON contracts;
CREATE POLICY company_contracts ON contracts
FOR ALL
USING (
  company_id = auth_user_company_id() 
  AND user_has_company_access(auth.uid())
)
WITH CHECK (
  company_id = auth_user_company_id() 
  AND user_has_company_access(auth.uid())
);

-- Política para categories
DROP POLICY IF EXISTS company_categories ON categories;
CREATE POLICY company_categories ON categories
FOR ALL
USING (
  company_id = auth_user_company_id() 
  AND user_has_company_access(auth.uid())
)
WITH CHECK (
  company_id = auth_user_company_id() 
  AND user_has_company_access(auth.uid())
);

-- Comentários para documentação
COMMENT ON COLUMN companies.is_trial IS 'Indica se a empresa está em período de teste grátis';
COMMENT ON COLUMN companies.trial_start_date IS 'Data de início do teste grátis';
COMMENT ON COLUMN companies.trial_end_date IS 'Data de término do teste grátis (3 dias após o início)';
COMMENT ON COLUMN companies.subscription_status IS 'Status da assinatura: trial, active, expired, cancelled';
COMMENT ON COLUMN user_profiles.is_trial_owner IS 'Indica se o usuário é o criador original da empresa no teste grátis (será bloqueado após expiração)';