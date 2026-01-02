
-- Excluir transações duplicadas da Lucena&Santos
-- Mantém a transação mais antiga de cada grupo (mesma contract_id, due_date, amount, description)

WITH duplicatas_para_remover AS (
  SELECT 
    t.id
  FROM transactions t
  WHERE t.company_id = 'ae298c26-4a77-4dd5-913f-1f3feb04d746'
    AND t.deleted_at IS NULL
    AND t.contract_id IS NOT NULL
    AND t.id NOT IN (
      -- IDs a manter (primeira transação de cada grupo)
      SELECT DISTINCT ON (contract_id, due_date, amount, description) id
      FROM transactions
      WHERE company_id = 'ae298c26-4a77-4dd5-913f-1f3feb04d746'
        AND deleted_at IS NULL
        AND contract_id IS NOT NULL
      ORDER BY contract_id, due_date, amount, description, created_at ASC
    )
)
DELETE FROM transactions
WHERE id IN (SELECT id FROM duplicatas_para_remover);
