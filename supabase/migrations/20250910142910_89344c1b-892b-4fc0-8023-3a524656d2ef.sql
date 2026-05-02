-- Criar tabela de protocolos
CREATE TABLE public.protocols (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 3 AND 120),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela de itens do protocolo
CREATE TABLE public.protocol_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  protocol_id UUID NOT NULL REFERENCES public.protocols(id) ON DELETE CASCADE,
  procedure_id TEXT NOT NULL,
  procedure_name TEXT NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  interval_days INT NOT NULL DEFAULT 0 CHECK (interval_days >= 0),
  value_cents INT NOT NULL CHECK (value_cents >= 0),
  discount_percent INT NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS nas tabelas
ALTER TABLE public.protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocol_items ENABLE ROW LEVEL SECURITY;

-- Criar políticas permissivas para service role (bypass RLS)
CREATE POLICY "Service role has full access" ON public.protocols FOR ALL USING (true);
CREATE POLICY "Service role has full access" ON public.protocol_items FOR ALL USING (true);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger para atualizar updated_at nos protocolos
CREATE TRIGGER update_protocols_updated_at
  BEFORE UPDATE ON public.protocols
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();