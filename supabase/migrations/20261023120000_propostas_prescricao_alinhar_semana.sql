-- Cronograma de aplicações: dia de atendimento (2026-10-23).
--
-- O dia da semana em que o tratamento começa (D0) é o dia em que o paciente
-- vem à clínica. Com a coluna ligada, cada data padrão do cronograma vai ao
-- múltiplo de 7 dias mais próximo do D0 (no máximo 3 dias antes ou depois).
-- Datas remarcadas à mão não mudam.
--
-- Orçamento novo nasce com a regra. Folha JÁ GERADA fica com a regra com que
-- foi gerada: o snapshot é congelado, e as que já estão no prontuário não têm
-- como ser apagadas na Feegow. Ligar nelas é escolha explícita, no editor.

alter table public.propostas
  add column if not exists prescricao_alinhar_semana boolean not null default true;

comment on column public.propostas.prescricao_alinhar_semana is
  'Cronograma: leva cada data padrão ao dia da semana do início (D0), até 3 dias antes ou depois. Remarcação manual vence. false = datas exatas do protocolo (folhas geradas antes de 2026-10-23).';

update public.propostas
  set prescricao_alinhar_semana = false
  where prescricao_hash is not null;
