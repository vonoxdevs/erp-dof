-- =====================================================
-- LSFIN v2.0 - FASE 2: ÍNDICES E TRIGGERS
-- =====================================================

-- ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_transactions_company_date 
  ON public.transactions(company_id, due_date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_status 
  ON public.transactions(status) WHERE status != 'cancelled';

CREATE INDEX IF NOT EXISTS idx_transactions_type_company 
  ON public.transactions(type, company_id);

CREATE INDEX IF NOT EXISTS idx_transactions_bank_account 
  ON public.transactions(bank_account_id);

CREATE INDEX IF NOT EXISTS idx_transactions_category 
  ON public.transactions(category_id);

CREATE INDEX IF NOT EXISTS idx_transactions_contract 
  ON public.transactions(contract_id) WHERE contract_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_ai_classification 
  ON public.transactions USING gin (ai_classification) 
  WHERE ai_classification IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_company_active 
  ON public.contracts(company_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_contracts_next_generation 
  ON public.contracts(next_generation_date) 
  WHERE is_active = true AND auto_generate = true;

CREATE INDEX IF NOT EXISTS idx_bank_accounts_company 
  ON public.bank_accounts(company_id, is_active);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON public.notifications(user_id, created_at DESC) 
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_company 
  ON public.notifications(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_imports_company_status 
  ON public.imports(company_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity 
  ON public.audit_logs(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_company_date 
  ON public.audit_logs(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user 
  ON public.audit_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_categories_company_type 
  ON public.categories(company_id, type, is_active);

CREATE INDEX IF NOT EXISTS idx_contacts_company_type 
  ON public.contacts(company_id, type, is_active);

-- TRIGGER PARA ATUALIZAR SALDO BANCÁRIO
CREATE OR REPLACE FUNCTION update_bank_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Ao criar transação PAGA
  IF (TG_OP = 'INSERT' AND NEW.status = 'paid' AND NEW.paid_date IS NOT NULL) THEN
    IF NEW.type = 'revenue' THEN
      UPDATE public.bank_accounts 
      SET current_balance = current_balance + NEW.amount,
          available_balance = available_balance + NEW.amount,
          updated_at = now()
      WHERE id = NEW.bank_account_id;
      
    ELSIF NEW.type = 'expense' THEN
      UPDATE public.bank_accounts 
      SET current_balance = current_balance - NEW.amount,
          available_balance = available_balance - NEW.amount,
          updated_at = now()
      WHERE id = NEW.bank_account_id;
      
    ELSIF NEW.type = 'transfer' AND NEW.transfer_to_account_id IS NOT NULL THEN
      -- Debita da conta origem
      UPDATE public.bank_accounts 
      SET current_balance = current_balance - NEW.amount,
          available_balance = available_balance - NEW.amount,
          updated_at = now()
      WHERE id = NEW.bank_account_id;
      
      -- Credita na conta destino
      UPDATE public.bank_accounts 
      SET current_balance = current_balance + NEW.amount,
          available_balance = available_balance + NEW.amount,
          updated_at = now()
      WHERE id = NEW.transfer_to_account_id;
    END IF;
  END IF;

  -- Ao atualizar status para PAID
  IF (TG_OP = 'UPDATE' AND OLD.status != 'paid' AND NEW.status = 'paid') THEN
    IF NEW.type = 'revenue' THEN
      UPDATE public.bank_accounts 
      SET current_balance = current_balance + NEW.amount,
          available_balance = available_balance + NEW.amount,
          updated_at = now()
      WHERE id = NEW.bank_account_id;
      
    ELSIF NEW.type = 'expense' THEN
      UPDATE public.bank_accounts 
      SET current_balance = current_balance - NEW.amount,
          available_balance = available_balance - NEW.amount,
          updated_at = now()
      WHERE id = NEW.bank_account_id;
    END IF;
  END IF;

  -- Ao reverter pagamento (paid → pending/cancelled)
  IF (TG_OP = 'UPDATE' AND OLD.status = 'paid' AND NEW.status != 'paid') THEN
    IF NEW.type = 'revenue' THEN
      UPDATE public.bank_accounts 
      SET current_balance = current_balance - OLD.amount,
          available_balance = available_balance - OLD.amount,
          updated_at = now()
      WHERE id = NEW.bank_account_id;
      
    ELSIF NEW.type = 'expense' THEN
      UPDATE public.bank_accounts 
      SET current_balance = current_balance + OLD.amount,
          available_balance = available_balance + OLD.amount,
          updated_at = now()
      WHERE id = NEW.bank_account_id;
    END IF;
  END IF;

  -- Ao deletar transação PAGA, reverter o saldo
  IF (TG_OP = 'DELETE' AND OLD.status = 'paid') THEN
    IF OLD.type = 'revenue' THEN
      UPDATE public.bank_accounts 
      SET current_balance = current_balance - OLD.amount,
          available_balance = available_balance - OLD.amount,
          updated_at = now()
      WHERE id = OLD.bank_account_id;
      
    ELSIF OLD.type = 'expense' THEN
      UPDATE public.bank_accounts 
      SET current_balance = current_balance + OLD.amount,
          available_balance = available_balance + OLD.amount,
          updated_at = now()
      WHERE id = OLD.bank_account_id;
      
    ELSIF OLD.type = 'transfer' AND OLD.transfer_to_account_id IS NOT NULL THEN
      -- Reverter débito
      UPDATE public.bank_accounts 
      SET current_balance = current_balance + OLD.amount,
          available_balance = available_balance + OLD.amount,
          updated_at = now()
      WHERE id = OLD.bank_account_id;
      
      -- Reverter crédito
      UPDATE public.bank_accounts 
      SET current_balance = current_balance - OLD.amount,
          available_balance = available_balance - OLD.amount,
          updated_at = now()
      WHERE id = OLD.transfer_to_account_id;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_bank_balance ON public.transactions;
CREATE TRIGGER trigger_update_bank_balance
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION update_bank_account_balance();

-- FUNÇÃO PARA GERAR PARCELAS DE CONTRATOS
CREATE OR REPLACE FUNCTION generate_contract_installments()
RETURNS TABLE(
  contract_id uuid,
  contract_name varchar,
  parcelas_geradas integer
) AS $$
DECLARE
  contract_record RECORD;
  next_date DATE;
  transaction_count INTEGER;
  parcelas_count INTEGER := 0;
BEGIN
  FOR contract_record IN 
    SELECT * FROM public.contracts 
    WHERE is_active = true 
      AND auto_generate = true
      AND deleted_at IS NULL
      AND (
        next_generation_date IS NULL 
        OR next_generation_date <= CURRENT_DATE
      )
  LOOP
    parcelas_count := 0;
    
    IF contract_record.next_generation_date IS NULL THEN
      IF contract_record.last_generated_date IS NULL THEN
        next_date := contract_record.start_date;
      ELSE
        CASE contract_record.frequency
          WHEN 'daily' THEN
            next_date := contract_record.last_generated_date + INTERVAL '1 day';
          WHEN 'weekly' THEN
            next_date := contract_record.last_generated_date + INTERVAL '1 week';
          WHEN 'monthly' THEN
            next_date := contract_record.last_generated_date + INTERVAL '1 month';
          WHEN 'yearly' THEN
            next_date := contract_record.last_generated_date + INTERVAL '1 year';
        END CASE;
      END IF;
    ELSE
      next_date := contract_record.next_generation_date;
    END IF;

    IF next_date <= CURRENT_DATE THEN
      SELECT COUNT(*) INTO transaction_count
      FROM public.transactions
      WHERE contract_id = contract_record.id;

      IF contract_record.total_installments IS NULL OR 
         transaction_count < contract_record.total_installments THEN
        
        INSERT INTO public.transactions (
          company_id,
          type,
          category_id,
          contact_id,
          bank_account_id,
          description,
          amount,
          due_date,
          status,
          payment_method,
          is_recurring,
          contract_id,
          installment_number,
          total_installments
        ) VALUES (
          contract_record.company_id,
          contract_record.type,
          contract_record.category_id,
          contract_record.contact_id,
          contract_record.bank_account_id,
          contract_record.name || ' - Parcela ' || (transaction_count + 1),
          contract_record.amount,
          next_date,
          'pending',
          contract_record.payment_method,
          true,
          contract_record.id,
          transaction_count + 1,
          contract_record.total_installments
        );

        CASE contract_record.frequency
          WHEN 'daily' THEN
            next_date := next_date + INTERVAL '1 day';
          WHEN 'weekly' THEN
            next_date := next_date + INTERVAL '1 week';
          WHEN 'monthly' THEN
            next_date := next_date + INTERVAL '1 month';
          WHEN 'yearly' THEN
            next_date := next_date + INTERVAL '1 year';
        END CASE;

        UPDATE public.contracts 
        SET last_generated_date = CURRENT_DATE,
            next_generation_date = next_date,
            updated_at = now()
        WHERE id = contract_record.id;

        parcelas_count := 1;
      END IF;
    END IF;

    IF parcelas_count > 0 THEN
      contract_id := contract_record.id;
      contract_name := contract_record.name;
      parcelas_geradas := parcelas_count;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;