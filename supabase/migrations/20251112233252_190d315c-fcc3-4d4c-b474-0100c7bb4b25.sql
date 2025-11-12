-- Add contract_name column to contracts table
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_name VARCHAR(255);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contracts_contact_id ON contracts(contact_id);
CREATE INDEX IF NOT EXISTS idx_contracts_contract_name ON contracts(contract_name);

-- Clean up orphaned records (contracts pointing to non-existent contacts)
-- Set contact_id to NULL for contracts where the contact doesn't exist
UPDATE contracts 
SET contact_id = NULL 
WHERE contact_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM contacts WHERE contacts.id = contracts.contact_id
  );

-- Now we can safely add the foreign key constraint
ALTER TABLE contracts 
DROP CONSTRAINT IF EXISTS contracts_contact_id_fkey;

ALTER TABLE contracts 
ADD CONSTRAINT contracts_contact_id_fkey 
FOREIGN KEY (contact_id) 
REFERENCES contacts(id) 
ON DELETE RESTRICT;

-- Note: contact_id is kept nullable for now to avoid breaking existing contracts
-- The application will enforce this as required in the UI