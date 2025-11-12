-- =====================================================
-- MIGRATION: Corrigir duplicação de saldos bancários
-- =====================================================

-- 1. REMOVER TRIGGERS DUPLICADOS
-- Há dois triggers fazendo a mesma coisa, causando duplicação!
DROP TRIGGER IF EXISTS update_balance_on_transaction_change ON public.transactions;
DROP TRIGGER IF EXISTS update_balance_on_transaction_delete ON public.transactions;
DROP TRIGGER IF EXISTS update_bank_account_balance_trigger ON public.transactions;

-- 2. REMOVER FUNÇÃO ANTIGA (duplicada)
DROP FUNCTION IF EXISTS public.update_bank_account_balance() CASCADE;

-- 3. RECRIAR FUNÇÃO ÚNICA E CORRETA para atualizar saldos
CREATE OR REPLACE FUNCTION public.update_bank_account_balances()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ============= INSERT =============
  -- Quando uma transação PAGA é criada
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
  
  -- ============= UPDATE =============
  -- Quando uma transação é atualizada
  IF TG_OP = 'UPDATE' THEN
    -- Reverter valores antigos se estava pago
    IF OLD.status = 'paid' THEN
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
        IF OLD.account_from_id IS NOT NULL THEN
          UPDATE bank_accounts 
          SET current_balance = current_balance + OLD.amount,
              available_balance = available_balance + OLD.amount,
              updated_at = NOW()
          WHERE id = OLD.account_from_id;
        END IF;
        IF OLD.account_to_id IS NOT NULL THEN
          UPDATE bank_accounts 
          SET current_balance = current_balance - OLD.amount,
              available_balance = available_balance - OLD.amount,
              updated_at = NOW()
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
  -- Quando uma transação PAGA é deletada, reverter o saldo
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
      IF OLD.account_from_id IS NOT NULL THEN
        UPDATE bank_accounts 
        SET current_balance = current_balance + OLD.amount,
            available_balance = available_balance + OLD.amount,
            updated_at = NOW()
        WHERE id = OLD.account_from_id;
      END IF;
      IF OLD.account_to_id IS NOT NULL THEN
        UPDATE bank_accounts 
        SET current_balance = current_balance - OLD.amount,
            available_balance = available_balance - OLD.amount,
            updated_at = NOW()
        WHERE id = OLD.account_to_id;
      END IF;
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. CRIAR TRIGGER ÚNICO
-- Um único trigger para INSERT, UPDATE e DELETE
CREATE TRIGGER update_bank_balance_on_transaction
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bank_account_balances();

-- 5. ADICIONAR COMENTÁRIOS para documentação
COMMENT ON FUNCTION public.update_bank_account_balances() IS 
'Atualiza automaticamente os saldos das contas bancárias quando transações são criadas, atualizadas ou deletadas. 
IMPORTANTE: Apenas transações com status=paid afetam o saldo.
- initial_balance é imutável e definido apenas na criação da conta
- current_balance é calculado automaticamente com base nas transações pagas';

COMMENT ON TRIGGER update_bank_balance_on_transaction ON public.transactions IS 
'Trigger único que atualiza saldos bancários. Substituiu triggers duplicados que causavam duplicação de cálculos.';