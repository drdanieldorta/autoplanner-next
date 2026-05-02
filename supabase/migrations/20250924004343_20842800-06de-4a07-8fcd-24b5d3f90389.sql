-- Security Fix: Restrict webhook system access to admins only

-- Drop existing permissive policies for webhook_endpoints
DROP POLICY IF EXISTS "endpoints_user_rw" ON public.webhook_endpoints;

-- Create admin-only policies for webhook_endpoints
CREATE POLICY "Admin users can manage webhook endpoints"
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

-- Add admin-only policies for webhook_dlq (currently only has service_role access)
CREATE POLICY "Admin users can view webhook queue"
ON public.webhook_dlq
FOR SELECT
USING (
  auth.role() = 'service_role'::text 
  OR has_role(auth.uid(), 'admin'::user_role)
);

-- Add audit logging trigger for sensitive webhook operations
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

-- Create audit triggers for webhook tables
CREATE TRIGGER webhook_endpoints_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.webhook_endpoints
  FOR EACH ROW EXECUTE FUNCTION public.audit_webhook_changes();

CREATE TRIGGER webhook_dlq_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.webhook_dlq
  FOR EACH ROW EXECUTE FUNCTION public.audit_webhook_changes();