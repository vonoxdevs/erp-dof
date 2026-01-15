-- Confirmar email do usuário thauanls.oficial@gmail.com
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'thauanls.oficial@gmail.com';