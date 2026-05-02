-- ============================================
-- RESTRUCTURE RLS POLICIES FOR MULTI-TENANT SYSTEM
-- ============================================

-- ============================================
-- PROPOSTAS TABLE
-- ============================================
DROP POLICY IF EXISTS "Super admins can view all propostas" ON public.propostas;
DROP POLICY IF EXISTS "Users can create propostas for their company" ON public.propostas;
DROP POLICY IF EXISTS "Users can delete their own propostas" ON public.propostas;
DROP POLICY IF EXISTS "Users can update their own propostas" ON public.propostas;
DROP POLICY IF EXISTS "Users can view their company propostas" ON public.propostas;

-- Super admins can do everything
CREATE POLICY "Super admins can manage all propostas"
ON public.propostas
FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- Company admins can manage all propostas in their company
CREATE POLICY "Company admins can manage their company propostas"
ON public.propostas
FOR ALL
USING (public.is_company_admin(auth.uid(), company_id))
WITH CHECK (public.is_company_admin(auth.uid(), company_id));

-- Company users can only view their own propostas
CREATE POLICY "Company users can view their own propostas"
ON public.propostas
FOR SELECT
USING (
  user_id = auth.uid() 
  AND company_id = public.get_user_company_id(auth.uid())
);

-- Company users can create their own propostas
CREATE POLICY "Company users can create their own propostas"
ON public.propostas
FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  AND company_id = public.get_user_company_id(auth.uid())
);

-- Company users can update their own propostas
CREATE POLICY "Company users can update their own propostas"
ON public.propostas
FOR UPDATE
USING (
  user_id = auth.uid() 
  AND company_id = public.get_user_company_id(auth.uid())
);

-- Company users can delete their own propostas
CREATE POLICY "Company users can delete their own propostas"
ON public.propostas
FOR DELETE
USING (
  user_id = auth.uid() 
  AND company_id = public.get_user_company_id(auth.uid())
);

-- ============================================
-- PROTOCOLS TABLE
-- ============================================
DROP POLICY IF EXISTS "Super admins can view all protocols" ON public.protocols;
DROP POLICY IF EXISTS "Users can delete their own protocols" ON public.protocols;
DROP POLICY IF EXISTS "Users can insert protocols for their company" ON public.protocols;
DROP POLICY IF EXISTS "Users can update their own protocols" ON public.protocols;
DROP POLICY IF EXISTS "Users can view their company protocols" ON public.protocols;

-- Super admins can do everything
CREATE POLICY "Super admins can manage all protocols"
ON public.protocols
FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- Company admins can manage all protocols in their company
CREATE POLICY "Company admins can manage their company protocols"
ON public.protocols
FOR ALL
USING (public.is_company_admin(auth.uid(), company_id))
WITH CHECK (public.is_company_admin(auth.uid(), company_id));

-- Company users can only view their own protocols
CREATE POLICY "Company users can view their own protocols"
ON public.protocols
FOR SELECT
USING (
  user_id = auth.uid() 
  AND company_id = public.get_user_company_id(auth.uid())
);

-- Company users can create their own protocols
CREATE POLICY "Company users can create their own protocols"
ON public.protocols
FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  AND company_id = public.get_user_company_id(auth.uid())
);

-- Company users can update their own protocols
CREATE POLICY "Company users can update their own protocols"
ON public.protocols
FOR UPDATE
USING (
  user_id = auth.uid() 
  AND company_id = public.get_user_company_id(auth.uid())
);

-- Company users can delete their own protocols
CREATE POLICY "Company users can delete their own protocols"
ON public.protocols
FOR DELETE
USING (
  user_id = auth.uid() 
  AND company_id = public.get_user_company_id(auth.uid())
);

-- ============================================
-- PROFILES TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Allow super admins and company admins to create profiles
CREATE POLICY "Admins can insert profiles"
ON public.profiles
FOR INSERT
WITH CHECK (
  public.is_super_admin(auth.uid()) 
  OR public.is_company_admin(auth.uid(), company_id)
  OR user_id = auth.uid()
);

-- ============================================
-- USER_ROLES TABLE - Add validation trigger
-- ============================================

-- Function to validate user_role company_id
CREATE OR REPLACE FUNCTION public.validate_user_role_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Super admin must have NULL company_id
  IF NEW.role = 'super_admin' AND NEW.company_id IS NOT NULL THEN
    RAISE EXCEPTION 'super_admin role must have NULL company_id';
  END IF;
  
  -- All other roles must have a company_id
  IF NEW.role != 'super_admin' AND NEW.company_id IS NULL THEN
    RAISE EXCEPTION 'Non super_admin roles must have a company_id';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for validation
DROP TRIGGER IF EXISTS validate_user_role_company_trigger ON public.user_roles;
CREATE TRIGGER validate_user_role_company_trigger
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_user_role_company();

-- ============================================
-- TOOLS TABLE - Users can only see assigned tools
-- ============================================
DROP POLICY IF EXISTS "Users can view tools" ON public.tools;

-- Super admins can see all tools
CREATE POLICY "Super admins can view all tools"
ON public.tools
FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- Company admins can see tools assigned to their company
CREATE POLICY "Company admins can view their company tools"
ON public.tools
FOR SELECT
USING (
  public.is_company_admin(auth.uid(), (
    SELECT company_id FROM public.company_tools WHERE tool_id = tools.id LIMIT 1
  ))
);

-- Company users can only see tools they have permission for
CREATE POLICY "Company users can view assigned tools"
ON public.tools
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.user_tool_permissions utp
    WHERE utp.tool_id = tools.id
      AND utp.user_id = auth.uid()
      AND utp.company_id = public.get_user_company_id(auth.uid())
  )
);