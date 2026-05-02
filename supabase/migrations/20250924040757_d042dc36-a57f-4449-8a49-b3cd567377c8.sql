-- CRITICAL SECURITY FIX: Remove only the overly permissive API credentials policies
-- This prevents unauthorized access to sensitive API tokens

-- Drop the dangerous policies that allow ANY authenticated user to access API credentials
DROP POLICY IF EXISTS "api_creds_select" ON public.api_credentials;
DROP POLICY IF EXISTS "api_creds_insert" ON public.api_credentials; 
DROP POLICY IF EXISTS "api_creds_update" ON public.api_credentials;

-- The user-specific policies already exist and are secure:
-- "Users can view their own credentials" - USING (auth.uid() = user_id) ✓ SECURE
-- "Users can insert their own credentials" - WITH CHECK (auth.uid() = user_id) ✓ SECURE  
-- "Users can update their own credentials" - USING/WITH CHECK (auth.uid() = user_id) ✓ SECURE
-- "Users can delete their own credentials" - USING (auth.uid() = user_id) ✓ SECURE

-- Add admin override policies only if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'api_credentials' AND policyname = 'Admins can view all api credentials') THEN
        CREATE POLICY "Admins can view all api credentials" 
        ON public.api_credentials 
        FOR SELECT 
        USING (has_role(auth.uid(), 'admin'::user_role));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'api_credentials' AND policyname = 'Admins can update all api credentials') THEN
        CREATE POLICY "Admins can update all api credentials" 
        ON public.api_credentials 
        FOR UPDATE 
        USING (has_role(auth.uid(), 'admin'::user_role))
        WITH CHECK (has_role(auth.uid(), 'admin'::user_role));
    END IF;
END $$;

-- Add audit logging for API credentials security fix
INSERT INTO public.proposal_events (proposal_id, payload) 
VALUES ('api_security_fix', jsonb_build_object(
  'action', 'rls_policy_updated',
  'table', 'api_credentials',
  'description', 'CRITICAL: Fixed API credentials exposure - removed overly permissive policies that allowed any authenticated user to access sensitive tokens',
  'admin_id', auth.uid(),
  'timestamp', now(),
  'severity', 'CRITICAL'
));