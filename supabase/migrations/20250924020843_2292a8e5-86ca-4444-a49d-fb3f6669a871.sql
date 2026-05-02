-- Add webhook columns to api_credentials table
ALTER TABLE public.api_credentials
  ADD COLUMN IF NOT EXISTS webhook_url text,
  ADD COLUMN IF NOT EXISTS webhook_secret text,
  ADD COLUMN IF NOT EXISTS webhook_enabled boolean DEFAULT true;