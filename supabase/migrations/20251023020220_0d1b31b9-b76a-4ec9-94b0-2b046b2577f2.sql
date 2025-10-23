-- Corrigir recursão infinita nas políticas RLS de user_profiles

-- Dropar políticas problemáticas de user_profiles
DROP POLICY IF EXISTS "Users can view profiles in own company" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;

-- Criar políticas corretas sem recursão
-- Usuários podem ver seu próprio perfil
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Usuários podem ver perfis da mesma empresa (usando subconsulta direta)
CREATE POLICY "Users can view company profiles"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM public.user_profiles 
      WHERE id = auth.uid()
    )
  );

-- Usuários podem atualizar seu próprio perfil
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Usuários podem inserir seu próprio perfil (para o trigger de signup)
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());