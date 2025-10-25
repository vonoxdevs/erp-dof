-- Fix SUPA_security_definer_view: Remove SECURITY DEFINER from dashboard_stats view
-- This view was created with SECURITY DEFINER which bypasses RLS
-- Recreating it as a regular view to enforce proper RLS policies

DROP VIEW IF EXISTS public.dashboard_stats;

CREATE VIEW public.dashboard_stats AS
SELECT 
  company_id,
  SUM(CASE WHEN type = 'income' AND status = 'paid' THEN amount ELSE 0 END) as total_revenue,
  SUM(CASE WHEN type = 'expense' AND status = 'paid' THEN amount ELSE 0 END) as total_expenses,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_count
FROM public.transactions
GROUP BY company_id;