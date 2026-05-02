-- Fase 4: Adicionar campo CPF em profiles (funcionários)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cpf text;

-- Fase 5: Adicionar campos de tokens CRM em api_credentials
ALTER TABLE public.api_credentials 
ADD COLUMN IF NOT EXISTS crm_token text,
ADD COLUMN IF NOT EXISTS crm_admin_token text;

-- Fase 6: Criar tabela para vínculos CRM das empresas
CREATE TABLE IF NOT EXISTS public.company_crm_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  crm_company_id text NOT NULL,
  crm_company_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- Enable RLS on company_crm_links
ALTER TABLE public.company_crm_links ENABLE ROW LEVEL SECURITY;

-- RLS policies for company_crm_links
CREATE POLICY "Super admins can manage all crm links"
ON public.company_crm_links
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Company admins can manage their company crm links"
ON public.company_crm_links
FOR ALL
TO authenticated
USING (is_company_admin(auth.uid(), company_id))
WITH CHECK (is_company_admin(auth.uid(), company_id));

CREATE POLICY "Company users can view their company crm link"
ON public.company_crm_links
FOR SELECT
TO authenticated
USING (company_id = get_user_company_id(auth.uid()));

-- Trigger para updated_at
CREATE OR REPLACE TRIGGER update_company_crm_links_updated_at
BEFORE UPDATE ON public.company_crm_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();