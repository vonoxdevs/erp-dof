-- Add indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_transactions_payment_date ON transactions(payment_date) WHERE payment_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bank_accounts_active ON bank_accounts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);

-- Drop and recreate policies for user_profiles
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Drop and recreate policies for companies
DROP POLICY IF EXISTS "Users can create company" ON companies;
CREATE POLICY "Users can create company"
  ON companies FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own company" ON companies;
CREATE POLICY "Users can update own company"
  ON companies FOR UPDATE
  USING (id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  ));

-- Create helpful view for dashboard stats
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT 
  t.company_id,
  SUM(CASE WHEN t.type = 'revenue' AND t.status = 'paid' THEN t.amount ELSE 0 END) as total_revenue,
  SUM(CASE WHEN t.type = 'expense' AND t.status = 'paid' THEN t.amount ELSE 0 END) as total_expenses,
  SUM(CASE WHEN t.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
  SUM(CASE WHEN t.status = 'overdue' THEN 1 ELSE 0 END) as overdue_count
FROM transactions t
GROUP BY t.company_id;