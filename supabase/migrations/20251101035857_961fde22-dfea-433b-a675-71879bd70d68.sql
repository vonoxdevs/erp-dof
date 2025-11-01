-- Add text fields for customer and supplier names in transactions
ALTER TABLE transactions
ADD COLUMN customer_name TEXT,
ADD COLUMN supplier_name TEXT;

COMMENT ON COLUMN transactions.customer_name IS 'Free-text customer name for revenue transactions';
COMMENT ON COLUMN transactions.supplier_name IS 'Free-text supplier name for expense transactions';