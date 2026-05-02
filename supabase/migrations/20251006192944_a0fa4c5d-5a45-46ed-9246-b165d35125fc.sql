-- Ensure RLS allows users to read their own roles globally (including super_admin without company_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_roles' 
      AND policyname = 'Users can read own roles'
  ) THEN
    CREATE POLICY "Users can read own roles"
    ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
  END IF;
END$$;

-- Optional: keep existing company-scoped read policies intact; this policy only ensures a user can always read their own roles
