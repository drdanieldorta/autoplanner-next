-- Adicionar coluna para armazenar o ID da proposta retornado pela API
ALTER TABLE public.propostas 
ADD COLUMN id_proposta_api INTEGER;