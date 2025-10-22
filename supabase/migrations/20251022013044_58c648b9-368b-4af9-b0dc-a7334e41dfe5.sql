-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'manager', 'user');

-- Create user_roles table for secure role management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (bypasses RLS to prevent circular dependencies)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create security definer function to check if user has any of multiple roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles app_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
  )
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Only owners can assign roles"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Only owners can update roles"
  ON public.user_roles
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Only owners can delete roles"
  ON public.user_roles
  FOR DELETE
  USING (public.has_role(auth.uid(), 'owner'));

-- Drop existing RLS policies on bank_accounts that use user_profiles.role
DROP POLICY IF EXISTS "Admins can manage bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can view bank accounts in own company" ON public.bank_accounts;

-- Create new RLS policies for bank_accounts using has_any_role function
CREATE POLICY "Admins can manage bank accounts"
  ON public.bank_accounts
  FOR ALL
  USING (
    company_id IN (
      SELECT user_profiles.company_id
      FROM user_profiles
      WHERE user_profiles.id = auth.uid()
    )
    AND public.has_any_role(auth.uid(), ARRAY['owner', 'admin']::app_role[])
  );

CREATE POLICY "Users can view bank accounts in own company"
  ON public.bank_accounts
  FOR SELECT
  USING (
    company_id IN (
      SELECT user_profiles.company_id
      FROM user_profiles
      WHERE user_profiles.id = auth.uid()
    )
  );

-- Drop existing RLS policies on categories
DROP POLICY IF EXISTS "Managers can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Users can view categories in own company" ON public.categories;

-- Create new RLS policies for categories
CREATE POLICY "Managers can manage categories"
  ON public.categories
  FOR ALL
  USING (
    company_id IN (
      SELECT user_profiles.company_id
      FROM user_profiles
      WHERE user_profiles.id = auth.uid()
    )
    AND public.has_any_role(auth.uid(), ARRAY['owner', 'admin', 'manager']::app_role[])
  );

CREATE POLICY "Users can view categories in own company"
  ON public.categories
  FOR SELECT
  USING (
    company_id IN (
      SELECT user_profiles.company_id
      FROM user_profiles
      WHERE user_profiles.id = auth.uid()
    )
  );

-- Create trigger function to automatically create company and user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_company_id UUID;
  user_full_name TEXT;
BEGIN
  -- Extract full_name from metadata
  user_full_name := NEW.raw_user_meta_data->>'full_name';
  IF user_full_name IS NULL THEN
    user_full_name := 'User';
  END IF;

  -- Create a new company for this user
  INSERT INTO public.companies (name, cnpj)
  VALUES (user_full_name || '''s Company', 'PENDING')
  RETURNING id INTO new_company_id;

  -- Create user profile linked to the new company
  INSERT INTO public.user_profiles (id, company_id, full_name)
  VALUES (NEW.id, new_company_id, user_full_name);

  -- Assign owner role to the new user
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'owner');

  RETURN NEW;
END;
$$;

-- Create trigger to run on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Migrate existing user_profiles.role data to user_roles table
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::app_role
FROM public.user_profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;