-- Função para recalcular o saldo de uma conta bancária baseado no saldo inicial + transações
CREATE OR REPLACE FUNCTION recalculate_bank_account_balance(account_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  account_initial_balance NUMERIC;
  total_revenue NUMERIC := 0;
  total_expenses NUMERIC := 0;
  total_transfers_in NUMERIC := 0;
  total_transfers_out NUMERIC := 0;
  new_balance NUMERIC;
BEGIN
  -- Buscar o saldo inicial
  SELECT initial_balance INTO account_initial_balance
  FROM bank_accounts
  WHERE id = account_id;
  
  -- Calcular total de receitas pagas para esta conta
  SELECT COALESCE(SUM(amount), 0) INTO total_revenue
  FROM transactions
  WHERE account_to_id = account_id
    AND type = 'revenue'
    AND status = 'paid'
    AND deleted_at IS NULL;
  
  -- Calcular total de despesas pagas desta conta
  SELECT COALESCE(SUM(amount), 0) INTO total_expenses
  FROM transactions
  WHERE account_from_id = account_id
    AND type = 'expense'
    AND status = 'paid'
    AND deleted_at IS NULL;
  
  -- Calcular transferências recebidas
  SELECT COALESCE(SUM(amount), 0) INTO total_transfers_in
  FROM transactions
  WHERE account_to_id = account_id
    AND type = 'transfer'
    AND status = 'paid'
    AND deleted_at IS NULL;
  
  -- Calcular transferências enviadas
  SELECT COALESCE(SUM(amount), 0) INTO total_transfers_out
  FROM transactions
  WHERE account_from_id = account_id
    AND type = 'transfer'
    AND status = 'paid'
    AND deleted_at IS NULL;
  
  -- Calcular novo saldo
  new_balance := account_initial_balance + total_revenue - total_expenses + total_transfers_in - total_transfers_out;
  
  -- Atualizar o saldo da conta
  UPDATE bank_accounts
  SET current_balance = new_balance,
      available_balance = new_balance,
      updated_at = NOW()
  WHERE id = account_id;
END;
$$;

-- Trigger para recalcular saldo quando initial_balance é atualizado
CREATE OR REPLACE FUNCTION trigger_recalculate_on_initial_balance_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se o initial_balance mudou, recalcular o saldo
  IF OLD.initial_balance IS DISTINCT FROM NEW.initial_balance THEN
    PERFORM recalculate_bank_account_balance(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS recalculate_balance_on_initial_change ON bank_accounts;
CREATE TRIGGER recalculate_balance_on_initial_change
AFTER UPDATE ON bank_accounts
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_on_initial_balance_change();