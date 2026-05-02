
-- Corrigir a política RLS da tabela tools que está com parâmetros invertidos
-- A função is_company_admin espera (user_id, company_id), mas a política estava passando (company_id, user_id)

DROP POLICY IF EXISTS "Company admins can view their company tools" ON public.tools;

CREATE POLICY "Company admins can view their company tools"
ON public.tools
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM company_tools ct
    WHERE ct.tool_id = tools.id
      AND ct.enabled = true
      AND is_company_admin(auth.uid(), ct.company_id)
  )
);
