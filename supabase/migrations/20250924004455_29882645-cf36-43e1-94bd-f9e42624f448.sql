-- Security Fix: Update webhook system policies to be admin-only

-- First, drop all existing policies for webhook_endpoints
DROP POLICY IF EXISTS "endpoints_svc_all" ON public.webhook_endpoints;
DROP POLICY IF EXISTS "endpoints_user_rw" ON public.webhook_endpoints;
DROP POLICY IF EXISTS "Admin users can manage webhook endpoints" ON public.webhook_endpoints;

-- Create secure admin-only policy for webhook_endpoints
CREATE POLICY "webhook_endpoints_admin_only"
ON public.webhook_endpoints
FOR ALL
USING (
  auth.role() = 'service_role'::text 
  OR has_role(auth.uid(), 'admin'::user_role)
)
WITH CHECK (
  auth.role() = 'service_role'::text 
  OR has_role(auth.uid(), 'admin'::user_role)
);

-- Update webhook_dlq to allow admin access for viewing
DROP POLICY IF EXISTS "dlq_svc_all" ON public.webhook_dlq;
DROP POLICY IF EXISTS "Admin users can view webhook queue" ON public.webhook_dlq;

CREATE POLICY "webhook_dlq_admin_access"
ON public.webhook_dlq
FOR ALL
USING (
  auth.role() = 'service_role'::text 
  OR has_role(auth.uid(), 'admin'::user_role)
)
WITH CHECK (
  auth.role() = 'service_role'::text 
  OR has_role(auth.uid(), 'admin'::user_role)
);

-- Add audit logging function and triggers
CREATE OR REPLACE FUNCTION public.audit_webhook_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log webhook endpoint changes for security auditing
  INSERT INTO public.proposal_events (
    proposal_id, 
    payload
  ) VALUES (
    'webhook_audit', 
    jsonb_build_object(
      'action', TG_OP,
      'table', TG_TABLE_NAME,
      'user_id', auth.uid(),
      'timestamp', now(),
      'old_data', CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
      'new_data', CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS webhook_endpoints_audit_trigger ON public.webhook_endpoints;
DROP TRIGGER IF EXISTS webhook_dlq_audit_trigger ON public.webhook_dlq;

-- Create audit triggers for webhook tables
CREATE TRIGGER webhook_endpoints_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.webhook_endpoints
  FOR EACH ROW EXECUTE FUNCTION public.audit_webhook_changes();

CREATE TRIGGER webhook_dlq_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.webhook_dlq
  FOR EACH ROW EXECUTE FUNCTION public.audit_webhook_changes();