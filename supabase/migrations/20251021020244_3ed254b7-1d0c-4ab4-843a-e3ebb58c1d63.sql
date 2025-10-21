-- Fix Security Issues - Part 2

-- 1. Fix Security Definer View - recreate without SECURITY DEFINER
DROP VIEW IF EXISTS dashboard_stats CASCADE;
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
GROUP BY t.company_id;

-- 2. Fix Function Search Path - drop with CASCADE and recreate
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- 3. Recreate all triggers
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();