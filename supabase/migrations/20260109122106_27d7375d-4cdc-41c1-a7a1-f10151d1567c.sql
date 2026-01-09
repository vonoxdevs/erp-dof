-- Remover trial da Limpério
UPDATE companies 
SET is_trial = false, 
    subscription_status = 'active',
    trial_end_date = NULL,
    trial_start_date = NULL
WHERE id = 'd438cecd-f537-4c14-ae75-0089b507e564';