-- ─────────────────────────────────────────────────────────────────────
-- Camada clínica MÍNIMA no protocolo: via de administração + cuidados.
--
-- Contexto: até aqui protocols/protocol_items eram 100% comerciais. A via
-- de administração era inferida por regex do nome do procedimento
-- (default-system-contract.ts: /\bIM\b/, /\bEV\b/, /IMPLANTE/i) apenas para
-- escolher qual termo de consentimento anexar ao contrato.
--
-- Escopo deliberadamente mínimo (decisão 2026-07-30): SEM dose, diluente,
-- volume ou tempo de infusão. O artefato gerado é um CRONOGRAMA DE
-- APLICAÇÕES, não uma prescrição — e um documento que não afirma dose não
-- pode induzir erro de dose.
-- ─────────────────────────────────────────────────────────────────────

alter table public.protocols
  add column if not exists cuidados_gerais text,
  add column if not exists sinais_alerta   text;

comment on column public.protocols.cuidados_gerais is
  'Cuidados de enfermagem válidos para todo o protocolo. Vai no cabeçalho da folha de execução.';
comment on column public.protocols.sinais_alerta is
  'Sinais/sintomas que exigem interromper a aplicação e comunicar o profissional responsável.';

alter table public.protocol_items
  add column if not exists via      text,
  add column if not exists cuidados text;

-- TEXT + CHECK em vez de enum PG: o repo não usa nenhum enum hoje e
-- ALTER TYPE ... ADD VALUE é doloroso de reverter. CHECK entrega
-- praticamente a mesma segurança com custo de manutenção muito menor.
do $$ begin
  alter table public.protocol_items add constraint protocol_items_via_chk
    check (via is null or via in ('EV','IM','SC','ID','VO','TOP','INAL','OUTRA'));
exception when duplicate_object then null; end $$;

comment on column public.protocol_items.via is
  'Via de administração: EV|IM|SC|ID|VO|TOP|INAL|OUTRA. NULL cai no heurístico de regex sobre procedure_name.';
comment on column public.protocol_items.cuidados is
  'Cuidados de enfermagem específicos deste item (ex.: proteger da luz, infundir após o item anterior).';
