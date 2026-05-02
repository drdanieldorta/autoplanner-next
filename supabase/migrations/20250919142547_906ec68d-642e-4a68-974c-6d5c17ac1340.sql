-- Add profissional_sys_user column to propostas table
ALTER TABLE public.propostas 
ADD COLUMN profissional_sys_user text;