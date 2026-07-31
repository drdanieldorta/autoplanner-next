-- Carimbo de quando o contrato foi assinado.
--
-- Até aqui o painel inferia "assinado" consultando a Authentique a cada
-- abertura do orçamento e checando se existe `files.signed`. Isso depende
-- da API estar de pé, não diz QUANDO foi assinado e não distingue recusa
-- de pendente.
--
-- O webhook da Authentique já recebe o evento de assinatura (é ele que
-- baixa o PDF assinado e anexa ao prontuário na Feegow), mas descartava
-- essa informação. Passa a carimbar aqui.

alter table public.propostas
  add column if not exists contract_signed_at timestamptz;

comment on column public.propostas.contract_signed_at is
  'Quando a Authentique avisou que o contrato foi assinado. NULL nos '
  'contratos assinados antes desta coluna existir — nesses o painel '
  'ainda cai na consulta ao vivo da Authentique.';
