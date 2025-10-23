-- Corrigir usuários existentes sem perfil
-- Para cada usuário na tabela auth.users que não tem perfil, criar empresa e perfil

DO $$
DECLARE
  user_record RECORD;
  new_company_id UUID;
  user_full_name TEXT;
  temp_cnpj TEXT;
BEGIN
  FOR user_record IN 
    SELECT u.id, u.email, u.raw_user_meta_data
    FROM auth.users u
    LEFT JOIN public.user_profiles up ON up.id = u.id
    WHERE up.id IS NULL
  LOOP
    -- Extrair nome completo dos metadados
    user_full_name := COALESCE(
      user_record.raw_user_meta_data->>'full_name',
      user_record.email,
      'Usuário'
    );

    -- Gerar CNPJ temporário único usando parte do UUID
    temp_cnpj := 'PENDING-' || SUBSTRING(user_record.id::TEXT, 1, 8);

    -- Criar uma nova empresa para este usuário
    INSERT INTO public.companies (name, cnpj, email, responsible)
    VALUES (
      user_full_name || ' Company',
      temp_cnpj,
      user_record.email,
      jsonb_build_object(
        'name', user_full_name,
        'email', user_record.email
      )
    )
    RETURNING id INTO new_company_id;

    -- Criar perfil de usuário vinculado à nova empresa
    INSERT INTO public.user_profiles (id, company_id, full_name)
    VALUES (user_record.id, new_company_id, user_full_name);

    -- Atribuir role de owner ao usuário
    INSERT INTO public.user_roles (user_id, role)
    VALUES (user_record.id, 'owner')
    ON CONFLICT (user_id, role) DO NOTHING;

    RAISE NOTICE 'Perfil criado para usuário: %', user_record.email;
  END LOOP;
END $$;