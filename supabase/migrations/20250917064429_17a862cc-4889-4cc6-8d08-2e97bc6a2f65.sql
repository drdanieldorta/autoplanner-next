-- Add total_value_cents column to protocols table
ALTER TABLE public.protocols ADD COLUMN total_value_cents INTEGER DEFAULT 0 NOT NULL;