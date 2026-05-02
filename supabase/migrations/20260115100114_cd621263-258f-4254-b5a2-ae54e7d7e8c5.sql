-- Corrigir função get_user_company_id para priorizar empresas válidas (não-default)
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT company_id
  FROM public.user_roles
  WHERE user_id = _user_id
    AND company_id IS NOT NULL
    AND company_id != '00000000-0000-0000-0000-000000000001'
  ORDER BY created_at DESC
  LIMIT 1
$function$;

-- Atualizar RLS policy de company_tools para SELECT para verificar se usuário pertence à empresa
DROP POLICY IF EXISTS "Users can view their company tools" ON public.company_tools;

CREATE POLICY "Users can view their company tools" 
ON public.company_tools 
FOR SELECT 
USING (
  company_id IN (
    SELECT ur.company_id 
    FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.company_id IS NOT NULL
  )
);