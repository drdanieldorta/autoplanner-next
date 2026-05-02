-- Remove the unused current_app_settings view
-- All functionality is now handled directly by api_credentials table
DROP VIEW IF EXISTS public.current_app_settings;