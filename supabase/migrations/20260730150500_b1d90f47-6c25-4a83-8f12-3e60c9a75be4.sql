-- ─────────────────────────────────────────────────────────────────────
-- Projeção da folha de execução na proposta.
--
-- O plano é CONGELADO em prescricao_snapshot na emissão. Isso não é
-- preciosismo: updateProtocol faz delete-then-insert dos itens
-- (protocolos/actions.ts:111-128), então editar um protocolo reescreve
-- retroativamente o conteúdo de toda folha já emitida. Sem snapshot, a
-- enfermagem leria o que está autorizado hoje, não o que foi fechado.
-- ─────────────────────────────────────────────────────────────────────

alter table public.propostas
  add column if not exists prescricao_inicio            date,
  add column if not exists prescricao_snapshot          jsonb,
  add column if not exists prescricao_hash              text,
  add column if not exists prescricao_gerada_em         timestamptz,
  add column if not exists prescricao_gerada_por        uuid,
  add column if not exists prescricao_envio_iniciado_em timestamptz,
  add column if not exists prescricao_feegow_em         timestamptz,
  add column if not exists prescricao_erro              text,
  add column if not exists prescricao_revisao           smallint not null default 0,
  add column if not exists prescricao_revisoes          jsonb not null default '[]'::jsonb,
  add column if not exists paciente_alergias            text;

do $$ begin
  alter table public.propostas add constraint propostas_prescricao_revisao_chk
    check (prescricao_revisao >= 0);
exception when duplicate_object then null; end $$;

comment on column public.propostas.prescricao_inicio is
  'Data D0 do tratamento. Persistida na primeira emissão e REUSADA nas seguintes — se voltasse a defaultar para "hoje", o mesmo orçamento geraria hash diferente a cada dia e criaria revisão espúria permanente (a Feegow não expõe delete de anexo).';
comment on column public.propostas.prescricao_snapshot is
  'Plano congelado na emissão. Fonte da verdade do PDF e do que foi à Feegow — imune a edições posteriores do protocolo.';
comment on column public.propostas.prescricao_hash is
  'sha256 do plano canônico (sem gerado_em e sem revisao). Chave de idempotência do upload à Feegow.';
comment on column public.propostas.prescricao_gerada_por is
  'auth.uid() de quem gerou. Único rastro de autoria: a edição da camada clínica não é gateada por role (decisão 2026-07-30).';
comment on column public.propostas.prescricao_envio_iniciado_em is
  'Marcador in-flight gravado ANTES da chamada à Feegow. Se o lambda morrer entre o upload e o UPDATE, o anexo existe mas feegow_em é null; sem este marcador o retry criaria uma segunda cópia indelével.';
comment on column public.propostas.prescricao_erro is
  'Última falha no envio à Feegow. NULL quando o último envio foi confirmado. Diferente do webhook Authentique, que engole o erro, aqui a falha persiste e aparece na UI.';
comment on column public.propostas.prescricao_revisoes is
  'Histórico APPEND-ONLY das revisões emitidas [{revisao, hash, gerado_em, feegow_em}]. Nunca sobrescrever: o anexo anterior continua permanentemente no prontuário e precisa ser reproduzível.';
comment on column public.propostas.paciente_alergias is
  'Alergias relatadas. NULL => a folha imprime a faixa "ALERGIAS NÃO INFORMADAS - CONFERIR ANTES DE ADMINISTRAR" com linha para preenchimento à caneta.';

-- Fila de pendentes: gerada mas não confirmada na Feegow.
create index if not exists propostas_prescricao_pendente_idx
  on public.propostas (company_id)
  where prescricao_gerada_em is not null and prescricao_feegow_em is null;
