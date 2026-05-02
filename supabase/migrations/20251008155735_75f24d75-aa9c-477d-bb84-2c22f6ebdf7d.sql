-- Add discount_percent column to propostas table
ALTER TABLE public.propostas 
ADD COLUMN discount_percent integer NOT NULL DEFAULT 0;

-- Add comment to explain the column
COMMENT ON COLUMN public.propostas.discount_percent IS 'Desconto percentual aplicado ao valor total do orçamento (0-100)';