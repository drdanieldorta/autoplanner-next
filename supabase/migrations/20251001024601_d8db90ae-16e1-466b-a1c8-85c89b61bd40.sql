-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Company admins can delete their company profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can delete all profiles" ON public.profiles;

-- Add delete policies for profiles so admins can remove employees
-- Company admins can delete profiles in their company
CREATE POLICY "Company admins can delete their company profiles"
ON public.profiles
FOR DELETE
USING (is_company_admin(auth.uid(), company_id));

-- Super admins can delete any profile
CREATE POLICY "Super admins can delete all profiles"
ON public.profiles
FOR DELETE
USING (is_super_admin(auth.uid()));