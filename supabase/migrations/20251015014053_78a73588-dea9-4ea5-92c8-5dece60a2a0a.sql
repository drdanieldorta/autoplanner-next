-- Criar tabela de teste
CREATE TABLE public.test_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.test_table ENABLE ROW LEVEL SECURITY;

-- Política de acesso para super_admin
CREATE POLICY "Super admins can manage test_table"
ON public.test_table
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- Inserir registro na tabela tools
INSERT INTO public.tools (name, description)
VALUES (
  'Ferramenta de Teste - Criada pela IA',
  'Esta ferramenta foi criada para demonstrar o acesso ao banco de dados via Lovable AI'
);