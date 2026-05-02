-- Update handle_new_user to include company_id from metadata and avoid NOT NULL violations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _company_id uuid;
  _role user_role;
BEGIN
  IF NEW.raw_user_meta_data ? 'company_id' THEN
    BEGIN
      _company_id := NULLIF(NEW.raw_user_meta_data->>'company_id','')::uuid;
    EXCEPTION WHEN others THEN
      _company_id := NULL;
    END;
  END IF;

  IF NEW.raw_user_meta_data ? 'default_role' THEN
    BEGIN
      _role := (NEW.raw_user_meta_data->>'default_role')::user_role;
    EXCEPTION WHEN others THEN
      _role := 'company_user';
    END;
  ELSE
    _role := 'company_user';
  END IF;

  INSERT INTO public.profiles (user_id, email, display_name, name, phone, status, company_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'status','pending'),
    _company_id
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    company_id = COALESCE(EXCLUDED.company_id, public.profiles.company_id);

  -- Insert default role scoped to company when available
  IF _company_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, company_id)
    VALUES (NEW.id, _role, _company_id)
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger exists on auth.users to call handle_new_user after user creation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'on_auth_user_created'
      AND n.nspname = 'auth'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
  END IF;
END$$;