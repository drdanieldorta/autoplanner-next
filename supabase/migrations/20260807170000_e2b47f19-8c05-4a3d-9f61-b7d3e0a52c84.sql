-- Vários documentos por plano, numa assinatura só.
--
-- Até aqui um orçamento enviava UM documento: `propostas.contract_id`
-- apontava para um modelo, ou era nulo e caía no TCLE padrão code-driven.
-- A clínica precisa mandar contrato de prestação + TCLE + termo de imagem
-- juntos, com UMA assinatura.
--
-- A restrição que define o desenho: `createDocument` da Authentique recebe
-- `$file: Upload!` — SINGULAR, um arquivo por documento. Uma assinatura para
-- vários papéis só existe de uma forma: um PDF único com os documentos em
-- sequência. Por isso nada abaixo do PDF muda (document_id, webhook, acervo,
-- anexo no prontuário seguem 1:1).

-- ── Documentos que acompanham um protocolo (o padrão) ────────────────────
create table if not exists public.protocol_contracts (
  protocol_id uuid not null references public.protocols(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  ordem smallint not null default 0,
  primary key (protocol_id, contract_id)
);

-- ── Documentos efetivamente escolhidos neste orçamento ───────────────────
-- `on delete restrict` no contrato é DELIBERADO: apagar um modelo não pode
-- reescrever em silêncio o que já foi enviado a um paciente. No protocolo,
-- `cascade` é correto — ali é configuração, não registro.
create table if not exists public.proposta_contracts (
  proposta_id uuid not null references public.propostas(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete restrict,
  ordem smallint not null default 0,
  primary key (proposta_id, contract_id)
);

create index if not exists protocol_contracts_protocol_idx
  on public.protocol_contracts (protocol_id, ordem);
create index if not exists proposta_contracts_proposta_idx
  on public.proposta_contracts (proposta_id, ordem);

-- O TCLE padrão NÃO é linha em `contracts` — é código
-- (`renderDefaultSystemContract`). Por isso vira booleano, não id.
alter table public.protocols
  add column if not exists incluir_tcle_padrao boolean not null default false;
alter table public.propostas
  add column if not exists incluir_tcle_padrao boolean not null default false;

-- ── Backfill: sem ele isto é regressão silenciosa ────────────────────────
insert into public.proposta_contracts (proposta_id, contract_id, ordem)
  select id, contract_id, 0 from public.propostas where contract_id is not null
  on conflict do nothing;

-- A linha que mais importa: hoje "sem contract_id" SIGNIFICA "manda o TCLE".
-- Sem ela, todo orçamento antigo passaria a não ter documento nenhum.
update public.propostas
  set incluir_tcle_padrao = true
  where contract_id is null;

comment on column public.propostas.contract_id is
  'LEGADO. Substituída por proposta_contracts + incluir_tcle_padrao. Mantida para histórico; não é mais lida na montagem do documento.';

-- ── RLS ──────────────────────────────────────────────────────────────────
-- As duas tabelas herdam escopo do pai. Predicados espelham
-- `can_write_protocol` (migration 20260730120000), inclusive a correção de
-- super_admin que ela traz: `is_company_admin()` já inclui `is_super_admin()`.

create or replace function public.can_read_protocol(_protocol_id uuid)
returns boolean language sql stable security definer set search_path to 'public'
as $$
  select exists (
    select 1 from public.protocols p
    where p.id = _protocol_id
      and (
        public.is_company_admin(auth.uid(), p.company_id)
        or (
          p.user_id = auth.uid()
          and p.company_id in (
            select ur.company_id from public.user_roles ur
            where ur.user_id = auth.uid() and ur.company_id is not null
          )
        )
      )
  )
$$;

create or replace function public.can_read_proposta(_proposta_id uuid)
returns boolean language sql stable security definer set search_path to 'public'
as $$
  select exists (
    select 1 from public.propostas pr
    where pr.id = _proposta_id
      and (
        public.is_company_admin(auth.uid(), pr.company_id)
        or (
          pr.user_id = auth.uid()
          and pr.company_id in (
            select ur.company_id from public.user_roles ur
            where ur.user_id = auth.uid() and ur.company_id is not null
          )
        )
      )
  )
$$;

alter table public.protocol_contracts enable row level security;
alter table public.proposta_contracts enable row level security;

drop policy if exists "protocol_contracts: leitura pelo escopo do protocolo" on public.protocol_contracts;
create policy "protocol_contracts: leitura pelo escopo do protocolo"
  on public.protocol_contracts for select
  using (public.can_read_protocol(protocol_id));

drop policy if exists "protocol_contracts: escrita pelo escopo do protocolo" on public.protocol_contracts;
create policy "protocol_contracts: escrita pelo escopo do protocolo"
  on public.protocol_contracts for all
  using (public.can_write_protocol(protocol_id))
  with check (public.can_write_protocol(protocol_id));

drop policy if exists "proposta_contracts: leitura pelo escopo da proposta" on public.proposta_contracts;
create policy "proposta_contracts: leitura pelo escopo da proposta"
  on public.proposta_contracts for select
  using (public.can_read_proposta(proposta_id));

drop policy if exists "proposta_contracts: escrita pelo escopo da proposta" on public.proposta_contracts;
create policy "proposta_contracts: escrita pelo escopo da proposta"
  on public.proposta_contracts for all
  using (public.can_read_proposta(proposta_id))
  with check (public.can_read_proposta(proposta_id));
