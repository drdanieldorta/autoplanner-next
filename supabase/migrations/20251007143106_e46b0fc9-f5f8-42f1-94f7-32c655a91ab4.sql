-- Remover as policies problemáticas existentes
DROP POLICY IF EXISTS "Company users can view their own propostas" ON public.propostas;
DROP POLICY IF EXISTS "Company users can create their own propostas" ON public.propostas;
DROP POLICY IF EXISTS "Company users can update their own propostas" ON public.propostas;
DROP POLICY IF EXISTS "Company users can delete their own propostas" ON public.propostas;
DROP POLICY IF EXISTS "Company users can view their own protocols" ON public.protocols;
DROP POLICY IF EXISTS "Company users can create their own protocols" ON public.protocols;
DROP POLICY IF EXISTS "Company users can update their own protocols" ON public.protocols;
DROP POLICY IF EXISTS "Company users can delete their own protocols" ON public.protocols;

-- Políticas corrigidas para propostas - usuários só veem dados da sua própria empresa
CREATE POLICY "Users can view propostas from their company only"
ON public.propostas
FOR SELECT
USING (
  -- Se é company_admin da empresa OU se criou o registro e pertence à empresa
  company_id IN (
    SELECT ur.company_id 
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
      AND ur.company_id IS NOT NULL
      AND (ur.role = 'company_admin' OR ur.role = 'company_user')
  )
);

CREATE POLICY "Users can create propostas in their company only"
ON public.propostas
FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT ur.company_id 
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
      AND ur.company_id IS NOT NULL
      AND (ur.role = 'company_admin' OR ur.role = 'company_user')
  )
);

CREATE POLICY "Users can update propostas in their company only"
ON public.propostas
FOR UPDATE
USING (
  company_id IN (
    SELECT ur.company_id 
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
      AND ur.company_id IS NOT NULL
      AND (ur.role = 'company_admin' OR ur.role = 'company_user')
  )
);

CREATE POLICY "Users can delete propostas in their company only"
ON public.propostas
FOR DELETE
USING (
  company_id IN (
    SELECT ur.company_id 
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
      AND ur.company_id IS NOT NULL
      AND (ur.role = 'company_admin' OR ur.role = 'company_user')
  )
);

-- Políticas corrigidas para protocols - usuários só veem dados da sua própria empresa
CREATE POLICY "Users can view protocols from their company only"
ON public.protocols
FOR SELECT
USING (
  company_id IN (
    SELECT ur.company_id 
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
      AND ur.company_id IS NOT NULL
      AND (ur.role = 'company_admin' OR ur.role = 'company_user')
  )
);

CREATE POLICY "Users can create protocols in their company only"
ON public.protocols
FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT ur.company_id 
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
      AND ur.company_id IS NOT NULL
      AND (ur.role = 'company_admin' OR ur.role = 'company_user')
  )
);

CREATE POLICY "Users can update protocols in their company only"
ON public.protocols
FOR UPDATE
USING (
  company_id IN (
    SELECT ur.company_id 
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
      AND ur.company_id IS NOT NULL
      AND (ur.role = 'company_admin' OR ur.role = 'company_user')
  )
);

CREATE POLICY "Users can delete protocols in their company only"
ON public.protocols
FOR DELETE
USING (
  company_id IN (
    SELECT ur.company_id 
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
      AND ur.company_id IS NOT NULL
      AND (ur.role = 'company_admin' OR ur.role = 'company_user')
  )
);

-- Remover as policies antigas de super admin que veem tudo
DROP POLICY IF EXISTS "Super admins as company admins can manage propostas" ON public.propostas;
DROP POLICY IF EXISTS "Super admins as company admins can manage protocols" ON public.protocols;
DROP POLICY IF EXISTS "Super admins as company admins can manage credentials" ON public.api_credentials;

-- Super admins NÃO podem ver todos os dados, apenas das empresas onde são company_admin
-- As políticas de company_admin já cobrem isso