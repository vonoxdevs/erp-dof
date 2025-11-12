-- Adicionar novos tipos de conta e campos específicos para cartão de crédito
ALTER TABLE bank_accounts 
ADD COLUMN IF NOT EXISTS credit_limit NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS closing_day INTEGER,
ADD COLUMN IF NOT EXISTS due_day INTEGER,
ADD COLUMN IF NOT EXISTS available_credit NUMERIC DEFAULT 0;

COMMENT ON COLUMN bank_accounts.credit_limit IS 'Limite do cartão de crédito (apenas para account_type = credit_card)';
COMMENT ON COLUMN bank_accounts.closing_day IS 'Dia do fechamento da fatura (1-31, apenas para cartão de crédito)';
COMMENT ON COLUMN bank_accounts.due_day IS 'Dia do vencimento da fatura (1-31, apenas para cartão de crédito)';
COMMENT ON COLUMN bank_accounts.available_credit IS 'Crédito disponível no cartão (limite - utilizado)';

-- Atualizar o check constraint de account_type para incluir novos tipos
ALTER TABLE bank_accounts DROP CONSTRAINT IF EXISTS bank_accounts_account_type_check;
ALTER TABLE bank_accounts ADD CONSTRAINT bank_accounts_account_type_check 
CHECK (account_type IN ('checking', 'savings', 'investment', 'credit_card', 'cdb'));

-- Trigger para validar campos específicos de cartão de crédito
CREATE OR REPLACE FUNCTION validate_credit_card_fields()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_credit_card_trigger ON bank_accounts;
CREATE TRIGGER validate_credit_card_trigger
  BEFORE INSERT OR UPDATE ON bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION validate_credit_card_fields();