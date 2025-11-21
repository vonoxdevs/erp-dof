-- Corrigir funções sem search_path definido
CREATE OR REPLACE FUNCTION public.validate_transaction_accounts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Despesa deve ter conta de origem
  IF NEW.type = 'expense' AND NEW.account_from_id IS NULL THEN
    RAISE EXCEPTION 'Despesas devem ter uma conta de origem definida';
  END IF;
  
  -- Receita deve ter conta de destino
  IF NEW.type = 'revenue' AND NEW.account_to_id IS NULL THEN
    RAISE EXCEPTION 'Receitas devem ter uma conta de destino definida';
  END IF;
  
  -- Transferência deve ter ambas as contas e serem diferentes
  IF NEW.type = 'transfer' THEN
    IF NEW.account_from_id IS NULL OR NEW.account_to_id IS NULL THEN
      RAISE EXCEPTION 'Transferências devem ter conta de origem e destino definidas';
    END IF;
    
    IF NEW.account_from_id = NEW.account_to_id THEN
      RAISE EXCEPTION 'Conta de origem e destino devem ser diferentes em transferências';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;