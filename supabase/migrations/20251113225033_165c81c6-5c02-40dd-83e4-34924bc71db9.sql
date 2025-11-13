-- Resetar datas incorretas de contratos (datas no futuro distante)
-- Isso permite que a função recalcule corretamente as transações

UPDATE contracts 
SET 
  next_generation_date = start_date,
  last_generated_date = NULL
WHERE is_active = true 
  AND (
    last_generated_date IS NULL 
    OR EXTRACT(YEAR FROM last_generated_date) > 2030
    OR next_generation_date > (CURRENT_DATE + INTERVAL '1 year')
  );