-- CRITICAL SECURITY FIX: Restrict propostas access to user-specific data only
-- This fixes the patient data exposure vulnerability

-- Drop the overly permissive policy that allows all authenticated users to view all proposals
DROP POLICY IF EXISTS "Authenticated users can view all propostas" ON public.propostas;

-- Create user-specific policy - users can only see their own proposals
CREATE POLICY "Users can view their own propostas" 
ON public.propostas 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create admin policy - admins can view all proposals for management purposes
CREATE POLICY "Admins can view all propostas" 
ON public.propostas 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role));

-- OPTIONAL: Review protocols access - currently allows all authenticated users to view all protocols
-- If protocols should be user-specific, uncomment the following:

-- DROP POLICY IF EXISTS "Authenticated users can view all protocols" ON public.protocols;
-- CREATE POLICY "Users can view their own protocols" ON public.protocols FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "Admins can view all protocols" ON public.protocols FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role));

-- DROP POLICY IF EXISTS "Authenticated users can view all protocol items" ON public.protocol_items;
-- CREATE POLICY "Users can view items of accessible protocols" ON public.protocol_items FOR SELECT 
-- USING (EXISTS (
--   SELECT 1 FROM protocols p 
--   WHERE p.id = protocol_items.protocol_id 
--   AND (p.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::user_role))
-- ));

-- Add audit logging for sensitive data access
INSERT INTO public.proposal_events (proposal_id, payload) 
VALUES ('security_fix', jsonb_build_object(
  'action', 'rls_policy_updated',
  'table', 'propostas', 
  'description', 'Fixed critical patient data exposure - restricted access to user-specific data only',
  'admin_id', auth.uid(),
  'timestamp', now()
));