-- Create an initialization function to promote the first authenticated user to super admin once
-- This avoids being blocked by RLS when bootstrapping the system
CREATE OR REPLACE FUNCTION public.bootstrap_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  super_count integer;
BEGIN
  -- Count existing super admins
  SELECT COUNT(*) INTO super_count
  FROM public.user_roles
  WHERE role = 'super_admin';

  -- If none exists, promote the caller to super_admin
  IF super_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (auth.uid(), 'super_admin');
    RETURN true;
  END IF;

  RETURN false;
END;
$$;