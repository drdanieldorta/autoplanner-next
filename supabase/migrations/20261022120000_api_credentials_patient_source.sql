-- Origem dos pacientes no formulário de orçamento (decisão 2026-10-22).
--
-- Preferência da empresa, escolhida em Configurações. O padrão 'feegow'
-- reproduz o comportamento de antes da opção existir (Feegow; sem chave da
-- Feegow, CRM; sem nenhuma das duas, manual), então aplicar esta migration
-- não muda nada para nenhuma empresa até alguém trocar a opção.
--
-- A resolução preferência + chaves vive em src/lib/orcamento/patient-source.ts.

alter table public.api_credentials
  add column if not exists patient_source text not null default 'feegow';

alter table public.api_credentials
  drop constraint if exists api_credentials_patient_source_check;

alter table public.api_credentials
  add constraint api_credentials_patient_source_check
  check (patient_source in ('feegow', 'crm', 'manual'));

comment on column public.api_credentials.patient_source is
  'Origem do paciente no orçamento: feegow (padrão; sem chave da Feegow cai para o CRM, sem chave do CRM para manual), crm (sem chave do CRM cai para manual) ou manual. Resolvida em src/lib/orcamento/patient-source.ts.';
