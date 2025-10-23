-- Remover a view anterior
DROP VIEW IF EXISTS public.dashboard_stats CASCADE;

-- Recriar como uma função SECURITY DEFINER em vez de uma view
-- Isso permite aplicar lógica de segurança adequada
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(user_company_id uuid)
RETURNS TABLE (
  company_id uuid,
  total_revenue numeric,
  total_expenses numeric,
  pending_count bigint,
  overdue_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    t.company_id,
    SUM(CASE WHEN t.type = 'income' AND t.status = 'paid' THEN t.amount ELSE 0 END) as total_revenue,
    SUM(CASE WHEN t.type = 'expense' AND t.status = 'paid' THEN t.amount ELSE 0 END) as total_expenses,
    COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN t.status = 'overdue' THEN 1 END) as overdue_count
  FROM public.transactions t
  WHERE t.company_id = user_company_id
  GROUP BY t.company_id;
$$;

-- Adicionar comentário explicativo
COMMENT ON FUNCTION public.get_dashboard_stats IS 'Retorna estatísticas do dashboard filtradas por company_id para garantir segurança';