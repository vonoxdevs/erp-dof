-- Corrigir search_path na função de validação
CREATE OR REPLACE FUNCTION validate_centro_custo_reference()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;