-- Remove duplicate trigger that causes balance doubling
-- Keep only one trigger for updating bank account balances

DROP TRIGGER IF EXISTS update_bank_balance_on_transaction ON transactions;

-- Verify remaining trigger is properly configured
-- The trigger_update_bank_balances should be the only one remaining