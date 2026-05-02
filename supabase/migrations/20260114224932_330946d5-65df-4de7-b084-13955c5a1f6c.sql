-- Melhoria 1: Adicionar campo custom_payment_method na tabela propostas
ALTER TABLE public.propostas 
ADD COLUMN IF NOT EXISTS custom_payment_method TEXT;

-- Melhoria 2: Criar tabela de contratos personalizados
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Adicionar campo contract_id na tabela propostas
ALTER TABLE public.propostas 
ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL;

-- Enable RLS on contracts table
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contracts table

-- Company admins can manage their company contracts (CRUD completo)
CREATE POLICY "Company admins can manage their company contracts"
ON public.contracts
FOR ALL
USING (is_company_admin(auth.uid(), company_id))
WITH CHECK (is_company_admin(auth.uid(), company_id));

-- Company users can view their company contracts (somente leitura)
CREATE POLICY "Company users can view their company contracts"
ON public.contracts
FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();