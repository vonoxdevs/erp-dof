-- Enable Row Level Security on dashboard_stats view
ALTER VIEW dashboard_stats SET (security_invoker = true);

-- Note: Views don't use traditional RLS policies with ENABLE ROW LEVEL SECURITY
-- Instead, we use security_invoker = true which makes the view execute with the privileges
-- of the calling user, respecting the RLS policies on the underlying transactions table

-- This ensures that users can only see dashboard stats for their own company
-- because the underlying transactions table already has RLS policies that filter by company_id