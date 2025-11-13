-- Corrigir datas absurdas nos contratos
-- Resetar last_generated_date e next_generation_date para contratos com datas muito futuras

UPDATE contracts
SET 
  last_generated_date = NULL,
  next_generation_date = start_date,
  updated_at = NOW()
WHERE 
  deleted_at IS NULL
  AND is_active = true
  AND (
    last_generated_date > (CURRENT_DATE + INTERVAL '5 years')
    OR next_generation_date > (CURRENT_DATE + INTERVAL '5 years')
  );

-- Também resetar contratos que estão com datas muito no passado ou que precisam ser reprocessados
UPDATE contracts
SET 
  last_generated_date = NULL,
  next_generation_date = start_date,
  updated_at = NOW()
WHERE 
  deleted_at IS NULL
  AND is_active = true
  AND last_generated_date IS NOT NULL
  AND last_generated_date > CURRENT_DATE;