-- Criar tabela de propostas/orçamentos
CREATE TABLE public.propostas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  paciente_id TEXT NOT NULL,
  paciente_nome TEXT NOT NULL,
  paciente_email TEXT,
  paciente_telefone TEXT,
  paciente_nascimento TEXT,
  paciente_bairro TEXT,
  profissional_id TEXT NOT NULL,
  profissional_nome TEXT NOT NULL,
  profissional_email TEXT,
  profissional_especialidade TEXT,
  profissional_cpf TEXT,
  profissional_crm TEXT,
  protocolo_id UUID,
  protocolo_nome TEXT,
  procedimentos_adicionais JSONB DEFAULT '[]'::jsonb,
  valor_total_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'enviado', 'aprovado', 'rejeitado', 'cancelado')),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own propostas" 
ON public.propostas 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own propostas" 
ON public.propostas 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own propostas" 
ON public.propostas 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own propostas" 
ON public.propostas 
FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_propostas_updated_at
BEFORE UPDATE ON public.propostas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para definir user_id automaticamente
CREATE TRIGGER set_propostas_user_id
BEFORE INSERT ON public.propostas
FOR EACH ROW
EXECUTE FUNCTION public.set_user_id();