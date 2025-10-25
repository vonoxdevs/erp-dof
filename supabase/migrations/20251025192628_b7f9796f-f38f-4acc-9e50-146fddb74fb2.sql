-- Drop the dashboard_stats view as it bypasses RLS
-- The get_dashboard_stats() function should be used instead
DROP VIEW IF EXISTS public.dashboard_stats;