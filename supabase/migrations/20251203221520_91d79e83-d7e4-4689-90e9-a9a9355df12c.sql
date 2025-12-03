
-- Adicionar campo de chave Pix na tabela bank_accounts
ALTER TABLE public.bank_accounts 
ADD COLUMN pix_key TEXT,
ADD COLUMN pix_key_type VARCHAR(20);

-- Comentários para documentação
COMMENT ON COLUMN public.bank_accounts.pix_key IS 'Chave Pix da conta (CPF, CNPJ, email, telefone ou chave aleatória)';
COMMENT ON COLUMN public.bank_accounts.pix_key_type IS 'Tipo da chave Pix: cpf, cnpj, email, phone, random';
