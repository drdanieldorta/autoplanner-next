-- Anexo do contrato assinado no prontuário da Feegow, com estado próprio
-- (decisão 2026-10-22).
--
-- Antes, o anexo dependia do carimbo de assinatura: só a requisição que
-- carimbava `contract_signed_at` anexava. Uma falha da Feegow naquele
-- instante perdia o anexo para sempre, sem registro. Agora:
--
--   contract_feegow_em           anexado com sucesso (fato do prontuário)
--   contract_feegow_iniciado_em  envio em curso (trava contra anexo duplo;
--                                a Feegow não tem delete de anexo)
--   contract_feegow_erro         última falha; envio pode ser retentado
--
-- Reenviar o contrato (documento novo) zera os três e `contract_signed_at`.
-- Lógica em src/lib/contracts/feegow-anexo.ts.

alter table public.propostas
  add column if not exists contract_feegow_em timestamptz,
  add column if not exists contract_feegow_iniciado_em timestamptz,
  add column if not exists contract_feegow_erro text;

comment on column public.propostas.contract_feegow_em is
  'Quando o contrato assinado foi anexado ao prontuário da Feegow. Ver src/lib/contracts/feegow-anexo.ts.';
comment on column public.propostas.contract_feegow_iniciado_em is
  'Envio do contrato assinado à Feegow em curso (trava contra anexo duplicado). Limpa ao concluir ou falhar.';
comment on column public.propostas.contract_feegow_erro is
  'Última falha ao anexar o contrato assinado na Feegow. Limpa ao tentar de novo.';
