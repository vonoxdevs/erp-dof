
-- EXCLUSÃO COMPLETA DOS DADOS DA EMPRESA LUCENA E SANTOS
-- company_id: ae298c26-4a77-4dd5-913f-1f3feb04d746

-- 1. Excluir transações (dependem de contratos, contas, categorias)
DELETE FROM transactions WHERE company_id = 'ae298c26-4a77-4dd5-913f-1f3feb04d746';

-- 2. Excluir contratos
DELETE FROM contracts WHERE company_id = 'ae298c26-4a77-4dd5-913f-1f3feb04d746';

-- 3. Excluir vínculos categoria-conta bancária (dependem de categorias)
DELETE FROM categoria_conta_bancaria 
WHERE categoria_id IN (SELECT id FROM categorias WHERE company_id = 'ae298c26-4a77-4dd5-913f-1f3feb04d746');

-- 4. Excluir categorias
DELETE FROM categorias WHERE company_id = 'ae298c26-4a77-4dd5-913f-1f3feb04d746';

-- 5. Excluir categories
DELETE FROM categories WHERE company_id = 'ae298c26-4a77-4dd5-913f-1f3feb04d746';

-- 6. Excluir credenciais de API bancária
DELETE FROM bank_api_credentials WHERE company_id = 'ae298c26-4a77-4dd5-913f-1f3feb04d746';

-- 7. Excluir contas bancárias
DELETE FROM bank_accounts WHERE company_id = 'ae298c26-4a77-4dd5-913f-1f3feb04d746';

-- 8. Excluir contatos
DELETE FROM contacts WHERE company_id = 'ae298c26-4a77-4dd5-913f-1f3feb04d746';

-- 9. Excluir convites pendentes
DELETE FROM user_invites WHERE company_id = 'ae298c26-4a77-4dd5-913f-1f3feb04d746';

-- 10. Excluir notificações
DELETE FROM notifications WHERE company_id = 'ae298c26-4a77-4dd5-913f-1f3feb04d746';

-- 11. Excluir imports
DELETE FROM imports WHERE company_id = 'ae298c26-4a77-4dd5-913f-1f3feb04d746';

-- 12. Excluir relatórios gerados
DELETE FROM generated_reports WHERE company_id = 'ae298c26-4a77-4dd5-913f-1f3feb04d746';

-- 13. Excluir audit logs
DELETE FROM audit_logs WHERE company_id = 'ae298c26-4a77-4dd5-913f-1f3feb04d746';

-- 14. Desvincular usuários da empresa (NÃO exclui os usuários, apenas desvincula)
UPDATE user_profiles SET company_id = NULL WHERE company_id = 'ae298c26-4a77-4dd5-913f-1f3feb04d746';

-- 15. Excluir a empresa
DELETE FROM companies WHERE id = 'ae298c26-4a77-4dd5-913f-1f3feb04d746';
