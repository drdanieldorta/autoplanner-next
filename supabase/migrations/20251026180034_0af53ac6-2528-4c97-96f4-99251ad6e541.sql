-- Adicionar campos de forma de pagamento na tabela propostas
ALTER TABLE public.propostas 
ADD COLUMN payment_method text,
ADD COLUMN installments integer,
ADD COLUMN installment_value_cents integer;

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.propostas.payment_method IS 'Forma de pagamento: dinheiro, pix, transferencia, debito, credito';
COMMENT ON COLUMN public.propostas.installments IS 'Quantidade de parcelas (apenas para cartão de crédito)';
COMMENT ON COLUMN public.propostas.installment_value_cents IS 'Valor de cada parcela em centavos (apenas para cartão de crédito)';