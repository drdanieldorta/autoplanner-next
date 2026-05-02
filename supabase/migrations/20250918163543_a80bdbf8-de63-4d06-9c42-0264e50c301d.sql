-- Add status_id column to propostas table
ALTER TABLE public.propostas 
ADD COLUMN status_id integer DEFAULT 1;