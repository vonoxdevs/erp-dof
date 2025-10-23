-- Atualizar função handle_new_user para usar CNPJ temporário único
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_company_id UUID;
  user_full_name TEXT;
  temp_cnpj TEXT;
BEGIN
  -- Extrair nome completo dos metadados
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    'Usuário'
  );

  -- Gerar CNPJ temporário único usando parte do UUID
  temp_cnpj := 'PENDING-' || SUBSTRING(NEW.id::TEXT, 1, 8);

  -- Criar uma nova empresa para este usuário
  INSERT INTO public.companies (name, cnpj, email, responsible)
  VALUES (
    user_full_name || ' Company',
    temp_cnpj,
    NEW.email,
    jsonb_build_object(
      'name', user_full_name,
      'email', NEW.email
    )
  )
  RETURNING id INTO new_company_id;

  -- Criar perfil de usuário vinculado à nova empresa
  INSERT INTO public.user_profiles (id, company_id, full_name)
  VALUES (NEW.id, new_company_id, user_full_name);

  -- Atribuir role de owner ao novo usuário
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'owner');

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro mas não bloqueia o signup
    RAISE WARNING 'Erro ao criar perfil para usuário %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$function$;