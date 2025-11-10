-- Atualizar todos os contratos existentes para serem do tipo 'revenue'
UPDATE public.contracts
SET type = 'revenue'
WHERE type = 'expense';

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.contracts.type IS 'Tipo do contrato - sempre revenue pois gera transações de receita';