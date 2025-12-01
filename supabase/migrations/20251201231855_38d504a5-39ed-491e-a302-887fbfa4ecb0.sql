
-- Criar função de validação para garantir que transações pagas tenham data de pagamento
CREATE OR REPLACE FUNCTION validate_paid_transaction_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Se o status for 'paid', deve ter payment_date ou paid_date
  IF NEW.status = 'paid' AND NEW.payment_date IS NULL AND NEW.paid_date IS NULL THEN
    RAISE EXCEPTION 'Transações com status "paid" devem ter uma data de pagamento (payment_date ou paid_date)';
  END IF;
  
  -- Se mudou para paid e não tem data, definir automaticamente como hoje
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    IF NEW.payment_date IS NULL AND NEW.paid_date IS NULL THEN
      NEW.payment_date := CURRENT_DATE;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Criar trigger para validar antes de inserir ou atualizar
DROP TRIGGER IF EXISTS validate_paid_transaction_date_trigger ON transactions;
CREATE TRIGGER validate_paid_transaction_date_trigger
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION validate_paid_transaction_date();
