-- Recreate dashboard_stats view with built-in security filtering
-- This ensures users can only see stats for their own company
DROP VIEW IF EXISTS dashboard_stats;

CREATE VIEW dashboard_stats
WITH (security_invoker = true)
AS
SELECT 
  t.company_id,
  SUM(CASE WHEN t.type = 'revenue' AND t.status = 'paid' THEN t.amount ELSE 0 END) as total_revenue,
  SUM(CASE WHEN t.type = 'expense' AND t.status = 'paid' THEN t.amount ELSE 0 END) as total_expenses,
  SUM(CASE WHEN t.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
  SUM(CASE WHEN t.status = 'overdue' THEN 1 ELSE 0 END) as overdue_count
FROM transactions t
WHERE t.company_id IN (
  SELECT company_id 
  FROM user_profiles 
  WHERE id = auth.uid()
)
GROUP BY t.company_id;