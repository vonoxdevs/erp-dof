-- Corrigir search_path da função validate_credit_card_fields
CREATE OR REPLACE FUNCTION validate_credit_card_fields()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validar campos de cartão de crédito
  IF NEW.account_type = 'credit_card' THEN
    -- Credit limit deve ser positivo
    IF NEW.credit_limit IS NULL OR NEW.credit_limit <= 0 THEN
      RAISE EXCEPTION 'Cartão de crédito deve ter um limite positivo';
    END IF;
    
    -- Validar dias (1-31)
    IF NEW.closing_day IS NOT NULL AND (NEW.closing_day < 1 OR NEW.closing_day > 31) THEN
      RAISE EXCEPTION 'Dia de fechamento deve estar entre 1 e 31';
    END IF;
    
    IF NEW.due_day IS NOT NULL AND (NEW.due_day < 1 OR NEW.due_day > 31) THEN
      RAISE EXCEPTION 'Dia de vencimento deve estar entre 1 e 31';
    END IF;
    
    -- Inicializar available_credit se não foi definido
    IF NEW.available_credit IS NULL THEN
      NEW.available_credit := NEW.credit_limit;
    END IF;
  ELSE
    -- Se não for cartão de crédito, limpar campos específicos
    NEW.credit_limit := 0;
    NEW.closing_day := NULL;
    NEW.due_day := NULL;
    NEW.available_credit := 0;
  END IF;
  
  RETURN NEW;
END;
$$;