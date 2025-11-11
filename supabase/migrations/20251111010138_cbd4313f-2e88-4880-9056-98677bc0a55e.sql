-- Migration 1: Create categorias table
CREATE TABLE IF NOT EXISTS public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('centro_custo', 'receita', 'despesa')),
  ativo BOOLEAN DEFAULT true,
  cor VARCHAR(7) DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_categorias_company ON public.categorias(company_id);
CREATE INDEX IF NOT EXISTS idx_categorias_tipo ON public.categorias(tipo);
CREATE INDEX IF NOT EXISTS idx_categorias_ativo ON public.categorias(ativo);
CREATE INDEX IF NOT EXISTS idx_categorias_nome ON public.categorias(nome);

-- RLS Policies
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

-- Users can view active categories from their company
CREATE POLICY "Users can view company categories"
  ON public.categorias FOR SELECT
  USING (company_id = get_user_company_id() AND ativo = true);

-- Authenticated users can manage their company categories
CREATE POLICY "Users can manage company categories"
  ON public.categorias FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- Super admin access
CREATE POLICY "Super admin access all categories"
  ON public.categorias FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Comments
COMMENT ON TABLE public.categorias IS 'Categorias financeiras: centro de custo, receita e despesa';
COMMENT ON COLUMN public.categorias.tipo IS 'Tipo de categoria: centro_custo, receita ou despesa';

-- Migration 2: Create categoria_conta_bancaria junction table
CREATE TABLE IF NOT EXISTS public.categoria_conta_bancaria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID NOT NULL REFERENCES public.categorias(id) ON DELETE CASCADE,
  conta_bancaria_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  habilitado BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(categoria_id, conta_bancaria_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cat_conta_categoria ON public.categoria_conta_bancaria(categoria_id);
CREATE INDEX IF NOT EXISTS idx_cat_conta_banco ON public.categoria_conta_bancaria(conta_bancaria_id);
CREATE INDEX IF NOT EXISTS idx_cat_conta_habilitado ON public.categoria_conta_bancaria(habilitado);

-- RLS
ALTER TABLE public.categoria_conta_bancaria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage category bank links"
  ON public.categoria_conta_bancaria FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.categorias c 
      WHERE c.id = categoria_id 
      AND c.company_id = get_user_company_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.categorias c 
      WHERE c.id = categoria_id 
      AND c.company_id = get_user_company_id()
    )
  );

-- Comments
COMMENT ON TABLE public.categoria_conta_bancaria IS 'Relacionamento N:N entre categorias e contas bancárias';

-- Migration 3: Add category columns to contracts
ALTER TABLE public.contracts 
  ADD COLUMN IF NOT EXISTS centro_custo_id UUID REFERENCES public.categorias(id),
  ADD COLUMN IF NOT EXISTS categoria_receita_id UUID REFERENCES public.categorias(id),
  ADD COLUMN IF NOT EXISTS categoria_despesa_id UUID REFERENCES public.categorias(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contracts_centro_custo ON public.contracts(centro_custo_id);
CREATE INDEX IF NOT EXISTS idx_contracts_cat_receita ON public.contracts(categoria_receita_id);
CREATE INDEX IF NOT EXISTS idx_contracts_cat_despesa ON public.contracts(categoria_despesa_id);

-- Comments
COMMENT ON COLUMN public.contracts.centro_custo_id IS 'Centro de custo do contrato';
COMMENT ON COLUMN public.contracts.categoria_receita_id IS 'Categoria de receita do contrato';
COMMENT ON COLUMN public.contracts.categoria_despesa_id IS 'Categoria de despesa do contrato';

-- Migration 4: Add category columns to transactions
ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS centro_custo_id UUID REFERENCES public.categorias(id),
  ADD COLUMN IF NOT EXISTS categoria_receita_id UUID REFERENCES public.categorias(id),
  ADD COLUMN IF NOT EXISTS categoria_despesa_id UUID REFERENCES public.categorias(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_centro_custo ON public.transactions(centro_custo_id);
CREATE INDEX IF NOT EXISTS idx_transactions_cat_receita ON public.transactions(categoria_receita_id);
CREATE INDEX IF NOT EXISTS idx_transactions_cat_despesa ON public.transactions(categoria_despesa_id);

-- Comments
COMMENT ON COLUMN public.transactions.centro_custo_id IS 'Centro de custo da transação';
COMMENT ON COLUMN public.transactions.categoria_receita_id IS 'Categoria de receita (para receitas)';
COMMENT ON COLUMN public.transactions.categoria_despesa_id IS 'Categoria de despesa (para despesas)';