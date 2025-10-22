-- ============================================================================
-- FIX: Criar perfis para usuários existentes e corrigir trigger
-- ============================================================================

-- 1. Criar perfis para usuários que já existem mas não têm perfil
DO $$
DECLARE
  v_user RECORD;
  v_company_id UUID;
BEGIN
  -- Para cada usuário sem perfil
  FOR v_user IN 
    SELECT u.id, u.email, u.raw_user_meta_data
    FROM auth.users u
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_profiles WHERE id = u.id
    )
  LOOP
    -- Verificar se já existe alguma empresa
    SELECT id INTO v_company_id FROM public.companies LIMIT 1;
    
    -- Se não existir empresa, criar uma
    IF v_company_id IS NULL THEN
      INSERT INTO public.companies (name, cnpj, email, responsible)
      VALUES (
        'Empresa Principal',
        'PENDING',
        v_user.email,
        jsonb_build_object(
          'name', COALESCE(v_user.raw_user_meta_data->>'full_name', 'Admin'),
          'email', v_user.email
        )
      )
      RETURNING id INTO v_company_id;
    END IF;
    
    -- Criar perfil para o usuário
    INSERT INTO public.user_profiles (id, company_id, full_name)
    VALUES (
      v_user.id,
      v_company_id,
      COALESCE(v_user.raw_user_meta_data->>'full_name', v_user.email, 'Usuário')
    );
    
    -- Atribuir role de owner se for o primeiro usuário da empresa
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id != v_user.id 
      AND user_id IN (
        SELECT id FROM public.user_profiles WHERE company_id = v_company_id
      )
    ) THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (v_user.id, 'owner')
      ON CONFLICT DO NOTHING;
    ELSE
      -- Caso contrário, atribuir role de user
      INSERT INTO public.user_roles (user_id, role)
      VALUES (v_user.id, 'user')
      ON CONFLICT DO NOTHING;
    END IF;
    
    RAISE NOTICE 'Perfil criado para usuário: %', v_user.email;
  END LOOP;
END $$;

-- 2. Atualizar o trigger handle_new_user para ser mais robusto
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_company_id UUID;
  user_full_name TEXT;
BEGIN
  -- Extrair nome completo dos metadados
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    'Usuário'
  );

  -- Criar uma nova empresa para este usuário
  INSERT INTO public.companies (name, cnpj, email, responsible)
  VALUES (
    user_full_name || '''s Company',
    'PENDING',
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

-- 3. Recriar o trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();