-- =====================================================
-- MIGRATION: Proteger initial_balance de modificações
-- =====================================================

-- Criar função que previne modificação de initial_balance após criação
CREATE OR REPLACE FUNCTION public.protect_initial_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Apenas em UPDATE (não em INSERT)
  IF TG_OP = 'UPDATE' THEN
    -- Se tentarem modificar o initial_balance, reverter
    IF OLD.initial_balance IS DISTINCT FROM NEW.initial_balance THEN
      RAISE EXCEPTION 'O saldo inicial (initial_balance) não pode ser modificado após a criação da conta';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para proteger initial_balance
CREATE TRIGGER protect_bank_account_initial_balance
  BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_initial_balance();

-- Adicionar comentários
COMMENT ON FUNCTION public.protect_initial_balance() IS 
'Protege o campo initial_balance de modificações após a criação da conta bancária. 
O saldo inicial é imutável e serve como referência. Apenas o current_balance deve ser atualizado pelas transações.';

COMMENT ON TRIGGER protect_bank_account_initial_balance ON public.bank_accounts IS 
'Previne modificações no campo initial_balance após a criação da conta.';