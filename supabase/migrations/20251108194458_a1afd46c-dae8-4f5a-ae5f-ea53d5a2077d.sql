-- ===================================
-- FASE 1: ADICIONAR COLUNAS DE CONTAS
-- ===================================

-- Adicionar colunas de referência para contas origem e destino
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS account_from_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS account_to_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_transactions_account_from 
  ON transactions(account_from_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_to 
  ON transactions(account_to_id);

-- Migrar dados existentes (bank_account_id → account_from_id para despesas)
UPDATE transactions 
SET account_from_id = bank_account_id 
WHERE type = 'expense' AND bank_account_id IS NOT NULL AND account_from_id IS NULL;

-- Migrar dados existentes (bank_account_id → account_to_id para receitas)
UPDATE transactions 
SET account_to_id = bank_account_id 
WHERE type = 'revenue' AND bank_account_id IS NOT NULL AND account_to_id IS NULL;

-- ===================================
-- FASE 2: TRIGGER DE VALIDAÇÃO
-- ===================================

CREATE OR REPLACE FUNCTION validate_transaction_accounts()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Criar trigger de validação (BEFORE INSERT/UPDATE)
DROP TRIGGER IF EXISTS validate_accounts_trigger ON transactions;
CREATE TRIGGER validate_accounts_trigger
BEFORE INSERT OR UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION validate_transaction_accounts();

-- ===================================
-- FASE 3: TRIGGER DE ATUALIZAÇÃO DE SALDOS
-- ===================================

CREATE OR REPLACE FUNCTION update_bank_account_balances()
RETURNS TRIGGER AS $$
BEGIN
  -- ============= INSERT =============
  IF TG_OP = 'INSERT' AND NEW.status = 'paid' THEN
    -- DESPESA: debita da conta origem
    IF NEW.type = 'expense' AND NEW.account_from_id IS NOT NULL THEN
      UPDATE bank_accounts 
      SET current_balance = current_balance - NEW.amount,
          available_balance = available_balance - NEW.amount,
          updated_at = NOW()
      WHERE id = NEW.account_from_id;
    END IF;
    
    -- RECEITA: credita na conta destino
    IF NEW.type = 'revenue' AND NEW.account_to_id IS NOT NULL THEN
      UPDATE bank_accounts 
      SET current_balance = current_balance + NEW.amount,
          available_balance = available_balance + NEW.amount,
          updated_at = NOW()
      WHERE id = NEW.account_to_id;
    END IF;
    
    -- TRANSFERÊNCIA: debita origem e credita destino
    IF NEW.type = 'transfer' THEN
      UPDATE bank_accounts 
      SET current_balance = current_balance - NEW.amount,
          available_balance = available_balance - NEW.amount,
          updated_at = NOW()
      WHERE id = NEW.account_from_id;
      
      UPDATE bank_accounts 
      SET current_balance = current_balance + NEW.amount,
          available_balance = available_balance + NEW.amount,
          updated_at = NOW()
      WHERE id = NEW.account_to_id;
    END IF;
  END IF;
  
  -- ============= UPDATE =============
  IF TG_OP = 'UPDATE' THEN
    -- Reverter valores antigos se estava pago
    IF OLD.status = 'paid' THEN
      IF OLD.type = 'expense' AND OLD.account_from_id IS NOT NULL THEN
        UPDATE bank_accounts 
        SET current_balance = current_balance + OLD.amount,
            available_balance = available_balance + OLD.amount
        WHERE id = OLD.account_from_id;
      END IF;
      
      IF OLD.type = 'revenue' AND OLD.account_to_id IS NOT NULL THEN
        UPDATE bank_accounts 
        SET current_balance = current_balance - OLD.amount,
            available_balance = available_balance - OLD.amount
        WHERE id = OLD.account_to_id;
      END IF;
      
      IF OLD.type = 'transfer' THEN
        IF OLD.account_from_id IS NOT NULL THEN
          UPDATE bank_accounts 
          SET current_balance = current_balance + OLD.amount,
              available_balance = available_balance + OLD.amount
          WHERE id = OLD.account_from_id;
        END IF;
        IF OLD.account_to_id IS NOT NULL THEN
          UPDATE bank_accounts 
          SET current_balance = current_balance - OLD.amount,
              available_balance = available_balance - OLD.amount
          WHERE id = OLD.account_to_id;
        END IF;
      END IF;
    END IF;
    
    -- Aplicar novos valores se está pago
    IF NEW.status = 'paid' THEN
      IF NEW.type = 'expense' AND NEW.account_from_id IS NOT NULL THEN
        UPDATE bank_accounts 
        SET current_balance = current_balance - NEW.amount,
            available_balance = available_balance - NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.account_from_id;
      END IF;
      
      IF NEW.type = 'revenue' AND NEW.account_to_id IS NOT NULL THEN
        UPDATE bank_accounts 
        SET current_balance = current_balance + NEW.amount,
            available_balance = available_balance + NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.account_to_id;
      END IF;
      
      IF NEW.type = 'transfer' THEN
        IF NEW.account_from_id IS NOT NULL THEN
          UPDATE bank_accounts 
          SET current_balance = current_balance - NEW.amount,
              available_balance = available_balance - NEW.amount,
              updated_at = NOW()
          WHERE id = NEW.account_from_id;
        END IF;
        IF NEW.account_to_id IS NOT NULL THEN
          UPDATE bank_accounts 
          SET current_balance = current_balance + NEW.amount,
              available_balance = available_balance + NEW.amount,
              updated_at = NOW()
          WHERE id = NEW.account_to_id;
        END IF;
      END IF;
    END IF;
  END IF;
  
  -- ============= DELETE =============
  IF TG_OP = 'DELETE' AND OLD.status = 'paid' THEN
    IF OLD.type = 'expense' AND OLD.account_from_id IS NOT NULL THEN
      UPDATE bank_accounts 
      SET current_balance = current_balance + OLD.amount,
          available_balance = available_balance + OLD.amount,
          updated_at = NOW()
      WHERE id = OLD.account_from_id;
    END IF;
    
    IF OLD.type = 'revenue' AND OLD.account_to_id IS NOT NULL THEN
      UPDATE bank_accounts 
      SET current_balance = current_balance - OLD.amount,
          available_balance = available_balance - OLD.amount,
          updated_at = NOW()
      WHERE id = OLD.account_to_id;
    END IF;
    
    IF OLD.type = 'transfer' THEN
      UPDATE bank_accounts 
      SET current_balance = current_balance + OLD.amount,
          available_balance = available_balance + OLD.amount,
          updated_at = NOW()
      WHERE id = OLD.account_from_id;
      
      UPDATE bank_accounts 
      SET current_balance = current_balance - OLD.amount,
          available_balance = available_balance - OLD.amount,
          updated_at = NOW()
      WHERE id = OLD.account_to_id;
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recriar trigger de atualização de saldos
DROP TRIGGER IF EXISTS trigger_update_bank_balances ON transactions;
CREATE TRIGGER trigger_update_bank_balances
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_bank_account_balances();