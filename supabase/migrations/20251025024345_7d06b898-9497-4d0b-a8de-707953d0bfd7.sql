-- Corrigir avisos de segurança do linter

-- 1. Remover Security Definer da View (ERROR 1)
DROP VIEW IF EXISTS dashboard_stats;

-- Recriar view SEM SECURITY DEFINER (views são executadas com permissões do usuário)
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT 
  t.company_id,
  SUM(CASE WHEN t.type = 'income' AND t.status = 'paid' THEN t.amount ELSE 0 END) as total_revenue,
  SUM(CASE WHEN t.type = 'expense' AND t.status = 'paid' THEN t.amount ELSE 0 END) as total_expenses,
  COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN t.status = 'overdue' THEN 1 END) as overdue_count
FROM transactions t
GROUP BY t.company_id;

-- 2. Corrigir funções com search_path mutable (WARN 2, 3, 4)

-- 2.1 Função update_updated_at_column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 2.2 Função create_default_categories  
CREATE OR REPLACE FUNCTION create_default_categories(p_company_id UUID)
RETURNS VOID 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Categorias de Receita
  INSERT INTO categories (company_id, name, type, icon, color) VALUES
    (p_company_id, 'Vendas', 'income', '💰', '#10b981'),
    (p_company_id, 'Serviços', 'income', '🛠️', '#3b82f6'),
    (p_company_id, 'Consultoria', 'income', '📊', '#8b5cf6'),
    (p_company_id, 'Outras Receitas', 'income', '📈', '#06b6d4');

  -- Categorias de Despesa
  INSERT INTO categories (company_id, name, type, icon, color) VALUES
    (p_company_id, 'Salários', 'expense', '👥', '#ef4444'),
    (p_company_id, 'Fornecedores', 'expense', '🏪', '#f97316'),
    (p_company_id, 'Aluguel', 'expense', '🏢', '#eab308'),
    (p_company_id, 'Marketing', 'expense', '📢', '#ec4899'),
    (p_company_id, 'Tecnologia', 'expense', '💻', '#6366f1'),
    (p_company_id, 'Outras Despesas', 'expense', '📉', '#64748b');
END;
$$;