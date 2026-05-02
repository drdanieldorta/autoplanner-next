-- Create simple view that inherits RLS from api_credentials table
create or replace view public.current_app_settings as
select
  id,
  user_id,
  feegow_token,
  authentique_token,
  webhook_url,
  webhook_secret,
  webhook_enabled,
  coalesce(updated_at, created_at) as last_changed_at
from public.api_credentials
order by coalesce(updated_at, created_at) desc
limit 1;