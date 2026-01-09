-- Remover trial da TCL
UPDATE companies 
SET is_trial = false, 
    subscription_status = 'active',
    trial_end_date = NULL,
    trial_start_date = NULL
WHERE id = 'e94d85be-98ce-4090-ab78-4270c4b3020f';