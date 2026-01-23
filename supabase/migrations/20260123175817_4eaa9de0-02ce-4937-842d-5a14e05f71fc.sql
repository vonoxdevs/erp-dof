-- Remover o período de teste de todas as empresas ativas
UPDATE public.companies
SET 
  is_trial = false,
  subscription_status = 'active',
  updated_at = NOW()
WHERE is_active = true
  AND is_trial = true;