-- Corrigir função de recálculo de saldo para analisar todo histórico corretamente
CREATE OR REPLACE FUNCTION public.recalculate_bank_account_balance(account_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  account_initial_balance NUMERIC;
  total_revenue NUMERIC := 0;
  total_expenses NUMERIC := 0;
  total_transfers_in NUMERIC := 0;
  total_transfers_out NUMERIC := 0;
  new_balance NUMERIC;
  revenue_count INTEGER;
  expense_count INTEGER;
  transfer_in_count INTEGER;
  transfer_out_count INTEGER;
BEGIN
  -- Buscar o saldo inicial
  SELECT initial_balance INTO account_initial_balance
  FROM bank_accounts
  WHERE id = account_id;
  
  -- Log para debug
  RAISE NOTICE 'Recalculando saldo da conta %. Saldo inicial: %', account_id, account_initial_balance;
  
  -- Calcular total de receitas pagas RECEBIDAS nesta conta
  -- Receitas entram na conta através do account_to_id ou bank_account_id
  SELECT 
    COALESCE(SUM(amount), 0),
    COUNT(*)
  INTO total_revenue, revenue_count
  FROM transactions
  WHERE type = 'revenue'
    AND status = 'paid'
    AND deleted_at IS NULL
    AND (account_to_id = account_id OR (account_to_id IS NULL AND bank_account_id = account_id));
  
  RAISE NOTICE 'Receitas: % transações, total: R$ %', revenue_count, total_revenue;
  
  -- Calcular total de despesas pagas SAINDO desta conta
  -- Despesas saem da conta através do account_from_id ou bank_account_id
  SELECT 
    COALESCE(SUM(amount), 0),
    COUNT(*)
  INTO total_expenses, expense_count
  FROM transactions
  WHERE type = 'expense'
    AND status = 'paid'
    AND deleted_at IS NULL
    AND (account_from_id = account_id OR (account_from_id IS NULL AND bank_account_id = account_id));
  
  RAISE NOTICE 'Despesas: % transações, total: R$ %', expense_count, total_expenses;
  
  -- Calcular transferências RECEBIDAS nesta conta
  SELECT 
    COALESCE(SUM(amount), 0),
    COUNT(*)
  INTO total_transfers_in, transfer_in_count
  FROM transactions
  WHERE type = 'transfer'
    AND status = 'paid'
    AND deleted_at IS NULL
    AND account_to_id = account_id;
  
  RAISE NOTICE 'Transferências recebidas: % transações, total: R$ %', transfer_in_count, total_transfers_in;
  
  -- Calcular transferências ENVIADAS desta conta
  SELECT 
    COALESCE(SUM(amount), 0),
    COUNT(*)
  INTO total_transfers_out, transfer_out_count
  FROM transactions
  WHERE type = 'transfer'
    AND status = 'paid'
    AND deleted_at IS NULL
    AND account_from_id = account_id;
  
  RAISE NOTICE 'Transferências enviadas: % transações, total: R$ %', transfer_out_count, total_transfers_out;
  
  -- Calcular novo saldo
  -- Saldo = Inicial + Receitas - Despesas + Transferências Recebidas - Transferências Enviadas
  new_balance := account_initial_balance + total_revenue - total_expenses + total_transfers_in - total_transfers_out;
  
  RAISE NOTICE 'Novo saldo calculado: R$ %', new_balance;
  
  -- Atualizar o saldo da conta
  UPDATE bank_accounts
  SET current_balance = new_balance,
      available_balance = new_balance,
      updated_at = NOW()
  WHERE id = account_id;
  
  RAISE NOTICE 'Saldo atualizado com sucesso';
END;
$function$;