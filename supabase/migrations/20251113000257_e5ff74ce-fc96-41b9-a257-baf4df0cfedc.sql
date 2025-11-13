-- Habilitar realtime para tabelas críticas
ALTER TABLE bank_accounts REPLICA IDENTITY FULL;
ALTER TABLE transactions REPLICA IDENTITY FULL;
ALTER TABLE contracts REPLICA IDENTITY FULL;