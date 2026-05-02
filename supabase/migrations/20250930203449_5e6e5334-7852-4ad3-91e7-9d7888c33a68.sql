-- ============================================================================
-- MIGRATION: Multi-tenant System with Super Admin, Companies and Tools
-- ============================================================================

-- 1. Criar tabela de empresas
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Criar tabela de ferramentas
CREATE TABLE IF NOT EXISTS public.tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Criar tabela de relacionamento empresa-ferramenta
CREATE TABLE IF NOT EXISTS public.company_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, tool_id)
);

-- 4. Criar primeira empresa "Clínica Dorta"
INSERT INTO public.companies (id, name) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Clínica Dorta')
ON CONFLICT DO NOTHING;

-- 5. Criar primeira ferramenta "Sistema de Acompanhamento"
INSERT INTO public.tools (id, name, description) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Sistema de Acompanhamento', 'Sistema de gestão de protocolos e propostas')
ON CONFLICT DO NOTHING;

-- 6. Atribuir ferramenta à empresa
INSERT INTO public.company_tools (company_id, tool_id)
VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- 7. Dropar políticas e funções que dependem do tipo user_role
DROP POLICY IF EXISTS "Admin users can view audit logs" ON public.proposal_events;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update all api credentials" ON public.api_credentials;
DROP POLICY IF EXISTS "Admins can update profiles for approval" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all api credentials" ON public.api_credentials;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all propostas" ON public.propostas;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "webhook_dlq_admin_access" ON public.webhook_dlq;
DROP POLICY IF EXISTS "webhook_endpoints_admin_only" ON public.webhook_endpoints;
DROP POLICY IF EXISTS "Users can view their own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "api_creds_select" ON public.api_credentials;
DROP POLICY IF EXISTS "api_creds_insert" ON public.api_credentials;
DROP POLICY IF EXISTS "api_creds_update" ON public.api_credentials;
DROP POLICY IF EXISTS "Users can view their own credentials" ON public.api_credentials;
DROP POLICY IF EXISTS "Users can insert their own credentials" ON public.api_credentials;
DROP POLICY IF EXISTS "Users can update their own credentials" ON public.api_credentials;
DROP POLICY IF EXISTS "Users can delete their own credentials" ON public.api_credentials;
DROP POLICY IF EXISTS "Users can view their own propostas" ON public.propostas;
DROP POLICY IF EXISTS "Users can create their own propostas" ON public.propostas;
DROP POLICY IF EXISTS "Users can update their own propostas" ON public.propostas;
DROP POLICY IF EXISTS "Users can delete their own propostas" ON public.propostas;
DROP POLICY IF EXISTS "Authenticated users can view all protocols" ON public.protocols;
DROP POLICY IF EXISTS "Users can insert own protocols" ON public.protocols;
DROP POLICY IF EXISTS "Users can update own protocols" ON public.protocols;
DROP POLICY IF EXISTS "Users can delete own protocols" ON public.protocols;
DROP POLICY IF EXISTS "Authenticated users can view all protocol items" ON public.protocol_items;
DROP POLICY IF EXISTS "Users can insert items into own protocols" ON public.protocol_items;
DROP POLICY IF EXISTS "Users can update items of own protocols" ON public.protocol_items;
DROP POLICY IF EXISTS "Users can delete items of own protocols" ON public.protocol_items;

DROP FUNCTION IF EXISTS public.has_role(uuid, user_role);

-- 8. Remover o default da coluna role antes de alterar o enum
ALTER TABLE public.user_roles ALTER COLUMN role DROP DEFAULT;

-- 9. Recriar enum user_role com novos valores
ALTER TYPE user_role RENAME TO user_role_old;
CREATE TYPE user_role AS ENUM ('super_admin', 'company_admin', 'company_user');

-- Atualizar user_roles temporariamente
ALTER TABLE public.user_roles ALTER COLUMN role TYPE TEXT;

-- Mapear roles antigas para novas
UPDATE public.user_roles SET role = 
  CASE 
    WHEN role = 'admin' THEN 'company_admin'
    WHEN role = 'user' THEN 'company_user'
    ELSE 'company_user'
  END;

-- Aplicar novo tipo e definir novo default
ALTER TABLE public.user_roles ALTER COLUMN role TYPE user_role USING role::user_role;
ALTER TABLE public.user_roles ALTER COLUMN role SET DEFAULT 'company_user'::user_role;
DROP TYPE user_role_old;

-- 10. Adicionar company_id à tabela user_roles
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- 11. Criar tabela de permissões de acesso a ferramentas
CREATE TABLE IF NOT EXISTS public.user_tool_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tool_id UUID NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, tool_id, company_id)
);

-- 12. Adicionar company_id às tabelas existentes
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.api_credentials ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.protocols ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- 13. Migrar dados existentes para a primeira empresa
UPDATE public.profiles SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.api_credentials SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.protocols SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.propostas SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.user_roles SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;

-- 14. Criar super admins para os emails especificados
DO $$
DECLARE
  user_id_1 UUID;
  user_id_2 UUID;
BEGIN
  -- Buscar user_id para dr.danieldsantiago@gmail.com
  SELECT user_id INTO user_id_1 FROM public.profiles WHERE email = 'dr.danieldsantiago@gmail.com' LIMIT 1;
  
  -- Buscar user_id para lucasluan.contato@gmail.com
  SELECT user_id INTO user_id_2 FROM public.profiles WHERE email = 'lucasluan.contato@gmail.com' LIMIT 1;
  
  -- Criar super admin para primeiro usuário se existir
  IF user_id_1 IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id = user_id_1;
    INSERT INTO public.user_roles (user_id, role, company_id)
    VALUES (user_id_1, 'super_admin', NULL);
  END IF;
  
  -- Criar super admin para segundo usuário se existir
  IF user_id_2 IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id = user_id_2;
    INSERT INTO public.user_roles (user_id, role, company_id)
    VALUES (user_id_2, 'super_admin', NULL);
  END IF;
END $$;

-- 15. Tornar company_id NOT NULL nas tabelas (após migração)
ALTER TABLE public.profiles ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.api_credentials ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.protocols ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.propostas ALTER COLUMN company_id SET NOT NULL;

-- 16. Atualizar constraint de user_roles para permitir mesma role em empresas diferentes
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_company_unique UNIQUE(user_id, role, company_id);

-- 17. Criar funções de segurança

-- Função para verificar se é super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
  )
$$;

-- Função para verificar se é admin da empresa
CREATE OR REPLACE FUNCTION public.is_company_admin(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND company_id = _company_id
      AND role = 'company_admin'
  ) OR public.is_super_admin(_user_id)
$$;

-- Função para verificar se tem acesso a ferramenta
CREATE OR REPLACE FUNCTION public.has_tool_access(_user_id UUID, _tool_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_tool_permissions
    WHERE user_id = _user_id
      AND tool_id = _tool_id
      AND company_id = _company_id
  ) OR public.is_super_admin(_user_id)
$$;

-- Função para pegar company_id do usuário
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.user_roles
  WHERE user_id = _user_id
    AND company_id IS NOT NULL
  LIMIT 1
$$;

-- Função has_role que aceita user_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (role = _role OR role = 'super_admin')
  )
$$;

-- 18. Habilitar RLS nas novas tabelas
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tool_permissions ENABLE ROW LEVEL SECURITY;

-- 19. Criar políticas RLS para companies
CREATE POLICY "Super admins can view all companies"
  ON public.companies FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view their own company"
  ON public.companies FOR SELECT
  USING (id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Super admins can insert companies"
  ON public.companies FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update companies"
  ON public.companies FOR UPDATE
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete companies"
  ON public.companies FOR DELETE
  USING (public.is_super_admin(auth.uid()));

-- 20. Criar políticas RLS para tools
CREATE POLICY "Super admins can manage tools"
  ON public.tools FOR ALL
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view tools"
  ON public.tools FOR SELECT
  USING (auth.role() = 'authenticated');

-- 21. Criar políticas RLS para company_tools
CREATE POLICY "Super admins can manage company tools"
  ON public.company_tools FOR ALL
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view their company tools"
  ON public.company_tools FOR SELECT
  USING (company_id = public.get_user_company_id(auth.uid()));

-- 22. Criar políticas RLS para user_tool_permissions
CREATE POLICY "Super admins can manage all permissions"
  ON public.user_tool_permissions FOR ALL
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Company admins can manage their company permissions"
  ON public.user_tool_permissions FOR ALL
  USING (public.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Users can view their own permissions"
  ON public.user_tool_permissions FOR SELECT
  USING (user_id = auth.uid());

-- 23. Recriar políticas RLS para user_roles
CREATE POLICY "Super admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Company admins can manage their company roles"
  ON public.user_roles FOR ALL
  USING (public.is_company_admin(auth.uid(), company_id) AND company_id IS NOT NULL);

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

-- 24. Recriar políticas RLS para profiles
CREATE POLICY "Super admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Company admins can view their company profiles"
  ON public.profiles FOR SELECT
  USING (public.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Super admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Company admins can update their company profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 25. Recriar políticas RLS para api_credentials
CREATE POLICY "Super admins can view all credentials"
  ON public.api_credentials FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Company admins can manage their company credentials"
  ON public.api_credentials FOR ALL
  USING (public.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Service role can access credentials"
  ON public.api_credentials FOR SELECT
  USING (auth.role() = 'service_role');

-- 26. Recriar políticas RLS para protocols
CREATE POLICY "Super admins can view all protocols"
  ON public.protocols FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view their company protocols"
  ON public.protocols FOR SELECT
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert protocols for their company"
  ON public.protocols FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Users can update their own protocols"
  ON public.protocols FOR UPDATE
  USING (user_id = auth.uid() AND company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete their own protocols"
  ON public.protocols FOR DELETE
  USING (user_id = auth.uid() AND company_id = public.get_user_company_id(auth.uid()));

-- 27. Recriar políticas RLS para protocol_items
CREATE POLICY "Users can view protocol items from their company"
  ON public.protocol_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.protocols p
    WHERE p.id = protocol_items.protocol_id
      AND (p.company_id = public.get_user_company_id(auth.uid()) OR public.is_super_admin(auth.uid()))
  ));

CREATE POLICY "Users can insert items into own company protocols"
  ON public.protocol_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.protocols p
    WHERE p.id = protocol_items.protocol_id
      AND p.user_id = auth.uid()
      AND p.company_id = public.get_user_company_id(auth.uid())
  ));

CREATE POLICY "Users can update items of own protocols"
  ON public.protocol_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.protocols p
    WHERE p.id = protocol_items.protocol_id
      AND p.user_id = auth.uid()
      AND p.company_id = public.get_user_company_id(auth.uid())
  ));

CREATE POLICY "Users can delete items of own protocols"
  ON public.protocol_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.protocols p
    WHERE p.id = protocol_items.protocol_id
      AND p.user_id = auth.uid()
      AND p.company_id = public.get_user_company_id(auth.uid())
  ));

-- 28. Recriar políticas RLS para propostas
CREATE POLICY "Super admins can view all propostas"
  ON public.propostas FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view their company propostas"
  ON public.propostas FOR SELECT
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create propostas for their company"
  ON public.propostas FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Users can update their own propostas"
  ON public.propostas FOR UPDATE
  USING (user_id = auth.uid() AND company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete their own propostas"
  ON public.propostas FOR DELETE
  USING (user_id = auth.uid() AND company_id = public.get_user_company_id(auth.uid()));

-- 29. Recriar políticas para proposal_events
CREATE POLICY "Admin users can view audit logs"
  ON public.proposal_events FOR SELECT
  USING (public.has_role(auth.uid(), 'company_admin') OR public.is_super_admin(auth.uid()));

-- 30. Recriar políticas para webhook_dlq e webhook_endpoints
CREATE POLICY "webhook_dlq_admin_access"
  ON public.webhook_dlq FOR ALL
  USING ((auth.role() = 'service_role') OR public.has_role(auth.uid(), 'company_admin') OR public.is_super_admin(auth.uid()))
  WITH CHECK ((auth.role() = 'service_role') OR public.has_role(auth.uid(), 'company_admin') OR public.is_super_admin(auth.uid()));

CREATE POLICY "webhook_endpoints_admin_only"
  ON public.webhook_endpoints FOR ALL
  USING ((auth.role() = 'service_role') OR public.has_role(auth.uid(), 'company_admin') OR public.is_super_admin(auth.uid()))
  WITH CHECK ((auth.role() = 'service_role') OR public.has_role(auth.uid(), 'company_admin') OR public.is_super_admin(auth.uid()));

-- 31. Atualizar trigger updated_at para novas tabelas
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 32. Dar permissão de acesso à ferramenta para todos os usuários existentes da empresa
INSERT INTO public.user_tool_permissions (user_id, tool_id, company_id)
SELECT ur.user_id, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'
FROM public.user_roles ur
WHERE ur.company_id = '00000000-0000-0000-0000-000000000001'
  AND ur.role != 'super_admin'
ON CONFLICT DO NOTHING;