-- Add role field to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT;