-- Fix RLS policies for api_credentials table
-- Drop old policies that check profiles.role incorrectly
DROP POLICY IF EXISTS "company_admins_manage" ON public.api_credentials;
DROP POLICY IF EXISTS "users_see_own_company" ON public.api_credentials;

-- Create correct policies using security definer functions
CREATE POLICY "Super admins can manage all credentials"
ON public.api_credentials
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Company admins can manage their company credentials"
ON public.api_credentials
FOR ALL
TO authenticated
USING (public.is_company_admin(auth.uid(), company_id))
WITH CHECK (public.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Company users can view their company credentials"
ON public.api_credentials
FOR SELECT
TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()));