-- Remove políticas que permitem super admin ver todos os dados
DROP POLICY IF EXISTS "Super admins can manage all propostas" ON public.propostas;
DROP POLICY IF EXISTS "Super admins can manage all protocols" ON public.protocols;
DROP POLICY IF EXISTS "Super admins can manage all credentials" ON public.api_credentials;

-- Propostas: Super admin só pode ver/gerenciar se for company_admin da empresa
CREATE POLICY "Super admins as company admins can manage propostas"
ON public.propostas
FOR ALL
USING (
  is_super_admin(auth.uid()) AND is_company_admin(auth.uid(), company_id)
)
WITH CHECK (
  is_super_admin(auth.uid()) AND is_company_admin(auth.uid(), company_id)
);

-- Protocols: Super admin só pode ver/gerenciar se for company_admin da empresa
CREATE POLICY "Super admins as company admins can manage protocols"
ON public.protocols
FOR ALL
USING (
  is_super_admin(auth.uid()) AND is_company_admin(auth.uid(), company_id)
)
WITH CHECK (
  is_super_admin(auth.uid()) AND is_company_admin(auth.uid(), company_id)
);

-- API Credentials: Super admin só pode ver/gerenciar se for company_admin da empresa
CREATE POLICY "Super admins as company admins can manage credentials"
ON public.api_credentials
FOR ALL
USING (
  is_super_admin(auth.uid()) AND is_company_admin(auth.uid(), company_id)
)
WITH CHECK (
  is_super_admin(auth.uid()) AND is_company_admin(auth.uid(), company_id)
);

-- Atualizar a policy de protocol_items para refletir a nova lógica
DROP POLICY IF EXISTS "Users can view protocol items from their company" ON public.protocol_items;

CREATE POLICY "Users can view protocol items from their company"
ON public.protocol_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM protocols p
    WHERE p.id = protocol_items.protocol_id
      AND (
        p.company_id = get_user_company_id(auth.uid())
        OR (is_super_admin(auth.uid()) AND is_company_admin(auth.uid(), p.company_id))
      )
  )
);