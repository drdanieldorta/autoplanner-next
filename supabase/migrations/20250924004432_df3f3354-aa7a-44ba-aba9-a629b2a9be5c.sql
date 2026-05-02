-- Fix security issues from linter

-- Fix function search_path for security (set explicit search_path for all functions)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name, name, phone, status)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'phone',
    'pending'
  );
  
  -- Insert default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add RLS policies for tables that might be missing them
-- (Note: Most tables already have policies, this is for completeness)

-- Ensure proposal_events has basic RLS policies for audit logs
CREATE POLICY "Service role can access audit logs"
ON public.proposal_events
FOR ALL
USING (auth.role() = 'service_role'::text);

CREATE POLICY "Admin users can view audit logs"
ON public.proposal_events
FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));