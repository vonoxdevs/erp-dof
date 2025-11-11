-- Add icon column to categorias table
ALTER TABLE public.categorias 
  ADD COLUMN IF NOT EXISTS icon varchar(50) DEFAULT '📁';

-- Add comment
COMMENT ON COLUMN public.categorias.icon IS 'Ícone/emoji da categoria';