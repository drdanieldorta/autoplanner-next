-- CRITICAL SECURITY FIX: Remove overly permissive API credentials policies
-- This prevents unauthorized access to sensitive API tokens

-- Drop the dangerous policies that allow ANY authenticated user to access API credentials
DROP POLICY IF EXISTS "api_creds_select" ON public.api_credentials;
DROP POLICY IF EXISTS "api_creds_insert" ON public.api_credentials; 
DROP POLICY IF EXISTS "api_creds_update" ON public.api_credentials;

-- Add admin override policies for legitimate administrative access
CREATE POLICY "Admins can view all api credentials" 
ON public.api_credentials 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update all api credentials" 
ON public.api_credentials 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Enhance user profile privacy - restrict admin access to necessary cases only
-- Update existing admin policy to be more specific
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles for approval" 
ON public.profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::user_role) AND status = 'pending');

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