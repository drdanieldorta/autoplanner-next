-- ─────────────────────────────────────────────────────────────────────
-- Camada clínica do protocolo: dose e início por procedimento.
--
-- `inicio_dias`: até aqui TODO item começava no D0. Um item que só entra
-- na semana 3 não tinha como ser expresso no protocolo — só remanejando
-- sessão a sessão, por paciente. É offset e não data porque o protocolo é
-- modelo reutilizável; vira data real na projeção de cada orçamento.
--
-- `dose`: TEXT de propósito. Normalizar em valor+unidade obrigaria a
-- clínica a reescrever como ela escreve hoje ("15 g", "1 ampola",
-- "2,5 mg", "0,5 mL"), e não há peso nem superfície corporal no schema
-- para calcular nada com o número. Evolução é aditiva se surgir demanda.
--
-- ⚠️ CONSEQUÊNCIA DE ESCOPO: a folha de execução foi construída sobre a
-- AUSÊNCIA de dose — o rodapé afirma "não informa dose". Com dose
-- preenchida esse texto passa a ser condicional. Ver
-- lib/prescricao/templates/default-execucao.ts.
-- ─────────────────────────────────────────────────────────────────────

alter table public.protocol_items
  add column if not exists dose        text,
  add column if not exists inicio_dias integer not null default 0;

do $$ begin
  alter table public.protocol_items add constraint protocol_items_inicio_chk
    check (inicio_dias >= 0);
exception when duplicate_object then null; end $$;

comment on column public.protocol_items.dose is
  'Dose por aplicação, texto livre ("2,5 mg", "1 ampola"). Opcional. Quando algum item do plano tem dose, o rodapé da folha de execução muda de texto.';
comment on column public.protocol_items.inicio_dias is
  'Dias entre o D0 do plano e a PRIMEIRA sessão deste item. 0 = começa junto com o D0. As sessões seguintes usam interval_days a partir daí.';
