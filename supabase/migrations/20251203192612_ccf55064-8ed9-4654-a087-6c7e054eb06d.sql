
-- 1. Soft delete das transações duplicadas da empresa Mariana (manter apenas 1 por mês por contrato)
UPDATE transactions
SET deleted_at = NOW()
WHERE id IN (
  WITH ranked AS (
    SELECT 
      id,
      contract_id,
      DATE_TRUNC('month', due_date) as month,
      ROW_NUMBER() OVER (
        PARTITION BY contract_id, DATE_TRUNC('month', due_date) 
        ORDER BY created_at ASC
      ) as rn
    FROM transactions 
    WHERE company_id = 'cce78809-7f64-4877-8cb3-0a1ad42e9ba1'
      AND contract_id IS NOT NULL
      AND deleted_at IS NULL
  )
  SELECT id FROM ranked WHERE rn > 1
);

-- 2. Recriar a função de geração de parcelas com proteção contra duplicatas
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
  max_iterations INTEGER := 100;
  iteration_count INTEGER := 0;
  existing_count INTEGER;
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
        ELSE
          current_date_calc := contract_record.last_generated_date + INTERVAL '1 month';
      END CASE;
    END IF;

    -- Gerar parcelas até hoje (máximo 100 iterações por segurança)
    WHILE current_date_calc <= CURRENT_DATE AND iteration_count < max_iterations LOOP
      iteration_count := iteration_count + 1;
      
      -- Verificar se já atingiu o total de parcelas
      SELECT COUNT(*) INTO transaction_count
      FROM public.transactions t
      WHERE t.contract_id = contract_record.id
        AND t.deleted_at IS NULL;

      IF contract_record.total_installments IS NOT NULL AND 
         transaction_count >= contract_record.total_installments THEN
        EXIT;
      END IF;

      -- Verificar se passou da data final
      IF contract_record.end_date IS NOT NULL AND 
         current_date_calc > contract_record.end_date THEN
        EXIT;
      END IF;

      -- PROTEÇÃO CONTRA DUPLICATAS: Verificar se já existe transação para este mês/semana/dia
      SELECT COUNT(*) INTO existing_count
      FROM public.transactions t
      WHERE t.contract_id = contract_record.id
        AND t.deleted_at IS NULL
        AND (
          CASE contract_record.frequency
            WHEN 'daily' THEN t.due_date = current_date_calc
            WHEN 'weekly' THEN DATE_TRUNC('week', t.due_date) = DATE_TRUNC('week', current_date_calc)
            WHEN 'monthly' THEN DATE_TRUNC('month', t.due_date) = DATE_TRUNC('month', current_date_calc)
            WHEN 'yearly' THEN DATE_TRUNC('year', t.due_date) = DATE_TRUNC('year', current_date_calc)
            ELSE DATE_TRUNC('month', t.due_date) = DATE_TRUNC('month', current_date_calc)
          END
        );

      -- Só inserir se não existir duplicata
      IF existing_count = 0 THEN
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
          total_installments,
          centro_custo_id,
          categoria_receita_id,
          categoria_despesa_id
        ) VALUES (
          contract_record.company_id,
          'revenue',
          contract_record.category_id,
          contract_record.contact_id,
          contract_record.bank_account_id,
          NULL,
          contract_record.bank_account_id,
          contract_record.name || ' - Parcela',
          contract_record.amount,
          current_date_calc,
          'pending',
          contract_record.payment_method,
          true,
          contract_record.id,
          transaction_count + 1,
          contract_record.total_installments,
          contract_record.centro_custo_id,
          contract_record.categoria_receita_id,
          contract_record.categoria_despesa_id
        );

        parcelas_count := parcelas_count + 1;
      END IF;

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
        ELSE
          current_date_calc := current_date_calc + INTERVAL '1 month';
      END CASE;
    END LOOP;

    -- Atualizar o contrato com a última data gerada (somente se gerou algo)
    IF parcelas_count > 0 OR iteration_count > 0 THEN
      UPDATE public.contracts 
      SET last_generated_date = CURRENT_DATE,
          next_generation_date = current_date_calc,
          updated_at = now()
      WHERE id = contract_record.id;
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
