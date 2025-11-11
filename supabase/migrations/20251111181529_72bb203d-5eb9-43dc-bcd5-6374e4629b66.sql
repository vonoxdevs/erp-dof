-- Enable realtime for categorias table
ALTER TABLE categorias REPLICA IDENTITY FULL;

-- Add categorias table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE categorias;