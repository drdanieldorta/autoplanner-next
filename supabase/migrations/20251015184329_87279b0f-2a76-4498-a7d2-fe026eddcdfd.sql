-- Permitir que company_id seja NULL para super admins
ALTER TABLE public.profiles 
ALTER COLUMN company_id DROP NOT NULL;

-- Atualizar a função handle_new_user para lidar corretamente com super admins
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _company_id uuid;
  _role user_role;
BEGIN
  -- Tentar extrair company_id dos metadados (pode ser NULL para super admins)
  IF NEW.raw_user_meta_data ? 'company_id' THEN
    BEGIN
      _company_id := NULLIF(NEW.raw_user_meta_data->>'company_id','')::uuid;
    EXCEPTION WHEN others THEN
      _company_id := NULL;
    END;
  END IF;

  -- Determinar role padrão
  IF NEW.raw_user_meta_data ? 'default_role' THEN
    BEGIN
      _role := (NEW.raw_user_meta_data->>'default_role')::user_role;
    EXCEPTION WHEN others THEN
      _role := 'company_user';
    END;
  ELSE
    _role := 'company_user';
  END IF;

  -- Inserir ou atualizar profile
  INSERT INTO public.profiles (user_id, email, display_name, name, phone, status, company_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'status','pending'),
    _company_id  -- Pode ser NULL para super admins
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    company_id = COALESCE(EXCLUDED.company_id, public.profiles.company_id);

  -- Inserir role padrão
  IF _company_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, company_id)
    VALUES (NEW.id, _role, _company_id)
    ON CONFLICT DO NOTHING;
  ELSE
    -- Se não tem company_id, assume role básica
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;