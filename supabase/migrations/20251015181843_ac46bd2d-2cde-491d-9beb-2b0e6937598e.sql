-- First, we need to create the user in auth.users using Admin API
-- This SQL will create a function to promote an existing user to super_admin

-- Function to promote a user to super_admin by email
CREATE OR REPLACE FUNCTION public.promote_to_super_admin(user_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
  result jsonb;
BEGIN
  -- Find user by email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email;

  IF target_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found with email: ' || user_email
    );
  END IF;

  -- Insert super_admin role (ignore if already exists)
  INSERT INTO public.user_roles (user_id, role, company_id)
  VALUES (target_user_id, 'super_admin', NULL)
  ON CONFLICT DO NOTHING;

  -- Update profile status to approved
  UPDATE public.profiles
  SET status = 'approved'
  WHERE user_id = target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'email', user_email
  );
END;
$$;

-- Now promote Daniel Dorta if the user exists in auth.users
-- Note: The user must be created in Supabase Auth first
DO $$
DECLARE
  daniel_result jsonb;
BEGIN
  -- Try to promote Daniel Dorta
  SELECT public.promote_to_super_admin('md.ia@drdanieldorta.com.br') INTO daniel_result;
  
  RAISE NOTICE 'Result for Daniel Dorta: %', daniel_result;
END $$;