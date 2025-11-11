-- Adicionar coluna centro_custo_id na tabela categorias
ALTER TABLE categorias 
ADD COLUMN centro_custo_id uuid REFERENCES categorias(id) ON DELETE SET NULL;

-- Adicionar constraint para garantir que centro_custo_id só é usado em receita/despesa
ALTER TABLE categorias
ADD CONSTRAINT check_centro_custo_only_for_receita_despesa
CHECK (
  (tipo = 'centro_custo' AND centro_custo_id IS NULL) OR
  (tipo IN ('receita', 'despesa') AND centro_custo_id IS NULL) OR
  (tipo IN ('receita', 'despesa') AND centro_custo_id IS NOT NULL)
);

-- Adicionar constraint para garantir que centro_custo_id referencia apenas centros de custo
-- Isso será validado no trigger
CREATE OR REPLACE FUNCTION validate_centro_custo_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.centro_custo_id IS NOT NULL THEN
    -- Verificar se a categoria referenciada é realmente um centro de custo
    IF NOT EXISTS (
      SELECT 1 FROM categorias 
      WHERE id = NEW.centro_custo_id 
      AND tipo = 'centro_custo'
      AND ativo = true
    ) THEN
      RAISE EXCEPTION 'centro_custo_id deve referenciar uma categoria do tipo centro_custo ativa';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_centro_custo_before_insert_update
BEFORE INSERT OR UPDATE ON categorias
FOR EACH ROW
EXECUTE FUNCTION validate_centro_custo_reference();

-- Criar índice para performance
CREATE INDEX idx_categorias_centro_custo_id ON categorias(centro_custo_id) WHERE centro_custo_id IS NOT NULL;

COMMENT ON COLUMN categorias.centro_custo_id IS 'Centro de custo ao qual esta categoria de receita/despesa pertence';