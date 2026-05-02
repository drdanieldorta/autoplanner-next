-- Adicionar campo paciente_cpf na tabela propostas
ALTER TABLE public.propostas 
ADD COLUMN IF NOT EXISTS paciente_cpf text;