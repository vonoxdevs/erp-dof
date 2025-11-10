-- Modificar função para gerar todas as transações de contratos como RECEITAS
CREATE OR REPLACE FUNCTION public.generate_contract_installments()
RETURNS TABLE(contract_id uuid, contract_name character varying, parcelas_geradas integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  contract_record RECORD;
  current_date_calc DATE;
  transaction_count INTEGER;
  parcelas_count INTEGER := 0;
  max_iterations INTEGER := 1000;
  iteration_count INTEGER := 0;
BEGIN
  FOR contract_record IN 
    SELECT * FROM public.contracts 
    WHERE is_active = true 
      AND auto_generate = true
      AND deleted_at IS NULL
      AND bank_account_id IS NOT NULL
  LOOP
    parcelas_count := 0;
    iteration_count := 0;
    
    -- Começar da data de início ou da última geração
    IF contract_record.last_generated_date IS NULL THEN
      current_date_calc := contract_record.start_date;
    ELSE
      CASE contract_record.frequency
        WHEN 'daily' THEN
          current_date_calc := contract_record.last_generated_date + INTERVAL '1 day';
        WHEN 'weekly' THEN
          current_date_calc := contract_record.last_generated_date + INTERVAL '1 week';
        WHEN 'monthly' THEN
          current_date_calc := contract_record.last_generated_date + INTERVAL '1 month';
        WHEN 'yearly' THEN
          current_date_calc := contract_record.last_generated_date + INTERVAL '1 year';
      END CASE;
    END IF;

    -- Gerar todas as parcelas até hoje
    WHILE current_date_calc <= CURRENT_DATE AND iteration_count < max_iterations LOOP
      iteration_count := iteration_count + 1;
      
      -- Verificar se já atingiu o total de parcelas
      SELECT COUNT(*) INTO transaction_count
      FROM public.transactions t
      WHERE t.contract_id = contract_record.id;

      -- Verificar se deve continuar gerando
      IF contract_record.total_installments IS NOT NULL AND 
         transaction_count >= contract_record.total_installments THEN
        EXIT;
      END IF;

      -- Verificar se passou da data final
      IF contract_record.end_date IS NOT NULL AND 
         current_date_calc > contract_record.end_date THEN
        EXIT;
      END IF;

      -- Inserir a transação SEMPRE como RECEITA
      INSERT INTO public.transactions (
        company_id,
        type,
        category_id,
        contact_id,
        bank_account_id,
        account_from_id,
        account_to_id,
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
        'revenue',  -- SEMPRE RECEITA
        contract_record.category_id,
        contract_record.contact_id,
        contract_record.bank_account_id,
        NULL,  -- Receitas não têm conta origem
        contract_record.bank_account_id,  -- Conta destino para receitas
        contract_record.name || ' - Parcela ' || (transaction_count + 1),
        contract_record.amount,
        current_date_calc,
        'pending',
        contract_record.payment_method,
        true,
        contract_record.id,
        transaction_count + 1,
        contract_record.total_installments
      );

      parcelas_count := parcelas_count + 1;

      -- Avançar para próxima data
      CASE contract_record.frequency
        WHEN 'daily' THEN
          current_date_calc := current_date_calc + INTERVAL '1 day';
        WHEN 'weekly' THEN
          current_date_calc := current_date_calc + INTERVAL '1 week';
        WHEN 'monthly' THEN
          current_date_calc := current_date_calc + INTERVAL '1 month';
        WHEN 'yearly' THEN
          current_date_calc := current_date_calc + INTERVAL '1 year';
      END CASE;
    END LOOP;

    -- Atualizar o contrato com a última data gerada
    IF parcelas_count > 0 THEN
      UPDATE public.contracts 
      SET last_generated_date = CURRENT_DATE,
          next_generation_date = current_date_calc,
          updated_at = now()
      WHERE id = contract_record.id;

      contract_id := contract_record.id;
      contract_name := contract_record.name;
      parcelas_geradas := parcelas_count;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$function$;