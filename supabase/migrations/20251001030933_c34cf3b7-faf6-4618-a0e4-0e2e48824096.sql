-- Add additional company information columns
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS cnpj TEXT,
ADD COLUMN IF NOT EXISTS nicho TEXT,
ADD COLUMN IF NOT EXISTS endereco TEXT,
ADD COLUMN IF NOT EXISTS ceo_name TEXT,
ADD COLUMN IF NOT EXISTS ceo_cpf TEXT;