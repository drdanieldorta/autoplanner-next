-- Create function to clean up user data when deleted
CREATE OR REPLACE FUNCTION public.cleanup_deleted_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete user roles
  DELETE FROM public.user_roles WHERE user_id = OLD.id;
  
  -- Delete user tool permissions
  DELETE FROM public.user_tool_permissions WHERE user_id = OLD.id;
  
  -- Delete profile
  DELETE FROM public.profiles WHERE user_id = OLD.id;
  
  RETURN OLD;
END;
$$;

-- Create trigger to cleanup user data on auth.users deletion
DROP TRIGGER IF EXISTS cleanup_user_data ON auth.users;
CREATE TRIGGER cleanup_user_data
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_deleted_user();