-- Primeiro: atualizar dados existentes (sem constraint ativa)
DO $$ 
BEGIN
  -- Remover temporariamente a constraint
  ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_type_check;
  
  -- Atualizar registros de 'income' para 'revenue'
  UPDATE categories 
  SET type = 'revenue' 
  WHERE type = 'income';
END $$;

-- Agora adicionar constraint com novos valores
ALTER TABLE categories ADD CONSTRAINT categories_type_check 
  CHECK (type IN ('revenue', 'expense', 'transfer'));

-- Atualizar função de criação de categorias padrão
CREATE OR REPLACE FUNCTION public.create_default_categories(p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Categorias de Receita (agora usando 'revenue')
  INSERT INTO categories (company_id, name, type, icon, color) VALUES
    (p_company_id, 'Vendas', 'revenue', '💰', '#10b981'),
    (p_company_id, 'Serviços', 'revenue', '🛠️', '#3b82f6'),
    (p_company_id, 'Consultoria', 'revenue', '📊', '#8b5cf6'),
    (p_company_id, 'Outras Receitas', 'revenue', '📈', '#06b6d4');

  -- Categorias de Despesa
  INSERT INTO categories (company_id, name, type, icon, color) VALUES
    (p_company_id, 'Salários', 'expense', '👥', '#ef4444'),
    (p_company_id, 'Fornecedores', 'expense', '🏪', '#f97316'),
    (p_company_id, 'Aluguel', 'expense', '🏢', '#eab308'),
    (p_company_id, 'Marketing', 'expense', '📢', '#ec4899'),
    (p_company_id, 'Tecnologia', 'expense', '💻', '#6366f1'),
    (p_company_id, 'Outras Despesas', 'expense', '📉', '#64748b');
END;
$function$;