-- Remove o trigger que protege o saldo inicial
DROP TRIGGER IF EXISTS protect_bank_account_initial_balance ON bank_accounts;

-- Remove a função de proteção do saldo inicial
DROP FUNCTION IF EXISTS protect_initial_balance();