-- Corrige as políticas de escrita de `protocol_items`.
--
-- Problema: as políticas de INSERT/UPDATE/DELETE exigiam
--     p.user_id = auth.uid() AND p.company_id = get_user_company_id(auth.uid())
-- enquanto a tabela pai `protocols` é bem mais permissiva:
--   - "Company admins can manage their company protocols" (ALL) usa
--     is_company_admin(), que já inclui super_admin via OR is_super_admin()
--   - "Protocols: company_admin atualiza todos da empresa" (UPDATE) permite
--     ao company_admin editar protocolo de qualquer colega da empresa
--
-- Consequência de duas formas:
--   1. super_admin: get_user_company_id() retorna NULL para eles (a função
--      ignora a empresa sentinela MD.IA 00000000-...-0001 e o super_admin não
--      tem outra linha em user_roles com company_id). `company_id = NULL` é
--      NULL, nunca true — o INSERT do protocolo passava e o dos itens
--      estourava "new row violates row-level security policy".
--   2. company_admin editando protocolo de um colega: a UPDATE em `protocols`
--      passava, mas o replace dos itens falhava no mesmo ponto.
--
-- A política de SELECT já tinha sido corrigida para super_admin; as de
-- escrita ficaram para trás. Esta migration alinha as três com as regras
-- que já valem na tabela pai. Nenhum acesso novo é aberto: quem não pode
-- escrever em `protocols` continua sem poder escrever nos itens.

-- Predicado único reaproveitado pelas três políticas.
create or replace function public.can_write_protocol(_protocol_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.protocols p
    where p.id = _protocol_id
      and (
        -- company_admin da empresa do protocolo (ou super_admin)
        public.is_company_admin(auth.uid(), p.company_id)
        -- ou dono do protocolo, dentro de uma empresa em que tem vínculo
        or (
          p.user_id = auth.uid()
          and p.company_id in (
            select ur.company_id
            from public.user_roles ur
            where ur.user_id = auth.uid()
              and ur.company_id is not null
          )
        )
      )
  )
$$;

drop policy if exists "Users can insert items into own company protocols" on public.protocol_items;
create policy "Users can insert items into own company protocols"
  on public.protocol_items
  for insert
  with check (public.can_write_protocol(protocol_id));

drop policy if exists "Users can update items of own protocols" on public.protocol_items;
create policy "Users can update items of own protocols"
  on public.protocol_items
  for update
  using (public.can_write_protocol(protocol_id))
  with check (public.can_write_protocol(protocol_id));

drop policy if exists "Users can delete items of own protocols" on public.protocol_items;
create policy "Users can delete items of own protocols"
  on public.protocol_items
  for delete
  using (public.can_write_protocol(protocol_id));
