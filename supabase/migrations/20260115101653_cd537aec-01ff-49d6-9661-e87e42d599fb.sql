-- Corrigir política de tools: ordem dos parâmetros estava invertida
-- is_company_admin(_company_id, _user_id) estava sendo chamada como is_company_admin(user_id, company_id)

DROP POLICY IF EXISTS "Company admins can view their company tools" ON public.tools;

-- Criar política correta para admins da empresa
CREATE POLICY "Company admins can view their company tools"
ON public.tools
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM company_tools ct
    WHERE ct.tool_id = tools.id
      AND ct.enabled = true
      AND public.is_company_admin(ct.company_id, auth.uid())
  )
);

-- Também precisamos garantir que company_users possam ver as ferramentas
DROP POLICY IF EXISTS "Company users can view assigned tools" ON public.tools;

CREATE POLICY "Company users can view assigned tools"
ON public.tools
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_tool_permissions utp
    WHERE utp.tool_id = tools.id
      AND utp.user_id = auth.uid()
  )
);