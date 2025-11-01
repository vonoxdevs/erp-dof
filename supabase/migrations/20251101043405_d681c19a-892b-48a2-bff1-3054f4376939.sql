-- Remove old constraint
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_type_check;

-- Update existing records from 'income' to 'revenue'
UPDATE transactions 
SET type = 'revenue' 
WHERE type = 'income';

-- Add new constraint with correct values
ALTER TABLE transactions 
ADD CONSTRAINT transactions_type_check 
CHECK (type IN ('revenue', 'expense', 'transfer'));