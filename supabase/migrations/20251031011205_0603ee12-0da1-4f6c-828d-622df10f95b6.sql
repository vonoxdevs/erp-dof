-- =============================================================================
-- Migration: Corrigir search_path em funções SECURITY DEFINER
-- Descrição: Adiciona SET search_path = public em todas as funções com privilégios elevados
-- Segurança: Previne ataques de manipulação de search_path
-- =============================================================================

-- 1. update_bank_account_balance
CREATE OR REPLACE FUNCTION public.update_bank_account_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- 2. generate_contract_installments
CREATE OR REPLACE FUNCTION public.generate_contract_installments()
RETURNS TABLE(contract_id uuid, contract_name character varying, parcelas_geradas integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- 3. update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- 4. create_default_categories
CREATE OR REPLACE FUNCTION public.create_default_categories(p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Categorias de Receita
  INSERT INTO categories (company_id, name, type, icon, color) VALUES
    (p_company_id, 'Vendas', 'income', '💰', '#10b981'),
    (p_company_id, 'Serviços', 'income', '🛠️', '#3b82f6'),
    (p_company_id, 'Consultoria', 'income', '📊', '#8b5cf6'),
    (p_company_id, 'Outras Receitas', 'income', '📈', '#06b6d4');

  -- Categorias de Despesa
  INSERT INTO categories (company_id, name, type, icon, color) VALUES
    (p_company_id, 'Salários', 'expense', '👥', '#ef4444'),
    (p_company_id, 'Fornecedores', 'expense', '🏪', '#f97316'),
    (p_company_id, 'Aluguel', 'expense', '🏢', '#eab308'),
    (p_company_id, 'Marketing', 'expense', '📢', '#ec4899'),
    (p_company_id, 'Tecnologia', 'expense', '💻', '#6366f1'),
    (p_company_id, 'Outras Despesas', 'expense', '📉', '#64748b');
END;
$function$;

-- 5. handle_updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- 6. get_user_company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT company_id FROM user_profiles WHERE id = auth.uid();
$function$;