-- Drop the existing view
DROP VIEW IF EXISTS current_app_settings;

-- Recreate the view with security_invoker to respect RLS from underlying tables
CREATE VIEW current_app_settings
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  feegow_token,
  authentique_token,
  webhook_url,
  webhook_secret,
  webhook_enabled,
  COALESCE(updated_at, created_at) AS last_changed_at
FROM api_credentials
ORDER BY COALESCE(updated_at, created_at) DESC
LIMIT 1;