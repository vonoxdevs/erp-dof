
-- Corrigir transações marcadas como "paid" mas sem data de pagamento
-- Essas transações devem ser "pending" pois ainda não foram pagas de fato

UPDATE transactions
SET status = 'pending',
    updated_at = NOW()
WHERE company_id = 'cce78809-7f64-4877-8cb3-0a1ad42e9ba1'
  AND status = 'paid'
  AND payment_date IS NULL
  AND paid_date IS NULL
  AND deleted_at IS NULL
  AND (
    account_from_id = '3db3f374-da26-450e-8396-f9c5248b678c' OR
    account_to_id = '3db3f374-da26-450e-8396-f9c5248b678c' OR
    bank_account_id = '3db3f374-da26-450e-8396-f9c5248b678c'
  );

-- Após corrigir o status, recalcular o saldo da conta
SELECT recalculate_bank_account_balance('3db3f374-da26-450e-8396-f9c5248b678c');
