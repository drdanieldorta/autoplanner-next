-- Identidade visual por empresa: logo + cores da marca.
--
-- Usado para carimbar os documentos gerados (hoje o PDF de contrato,
-- via /api/contratos/envio-manual). Empresa sem branding configurado
-- continua gerando exatamente o documento de hoje — os campos são
-- opcionais e o render tem fallback neutro.

alter table public.companies
  add column if not exists logo_url text,
  add column if not exists brand_primary_color text,
  add column if not exists brand_secondary_color text;

comment on column public.companies.logo_url is
  'URL pública da logo no bucket company-branding. NULL = sem logo.';
comment on column public.companies.brand_primary_color is
  'Cor primária da marca em hex (#RRGGBB). NULL = usa o neutro do documento.';
comment on column public.companies.brand_secondary_color is
  'Cor secundária da marca em hex (#RRGGBB). NULL = derivada da primária.';

-- ───────── Storage ─────────
-- Bucket público: logo é ativo de marca, não dado sensível. Leitura
-- pública simplifica o preview na tela de configuração; a escrita é
-- restrita aos admins da empresa dona da pasta.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-branding',
  'company-branding',
  true,
  2097152, -- 2 MB
  array['image/png','image/jpeg','image/webp','image/svg+xml']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Convenção de path: {company_id}/logo-{timestamp}.{ext}
-- O primeiro segmento identifica a empresa dona do arquivo.
--
-- Parse defensivo: um path cujo primeiro segmento não seja UUID faria
-- o cast estourar dentro da policy. A função captura a exceção e nega,
-- em vez de derrubar o statement com erro de tipo.
create or replace function public.can_write_company_asset(_path text)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  _company_id uuid;
begin
  begin
    _company_id := (storage.foldername(_path))[1]::uuid;
  exception when others then
    return false;
  end;
  return public.is_company_admin(auth.uid(), _company_id);
end;
$$;

drop policy if exists "company branding: leitura pública" on storage.objects;
create policy "company branding: leitura pública"
  on storage.objects for select
  using (bucket_id = 'company-branding');

drop policy if exists "company branding: admin da empresa envia" on storage.objects;
create policy "company branding: admin da empresa envia"
  on storage.objects for insert
  with check (
    bucket_id = 'company-branding'
    and public.can_write_company_asset(name)
  );

drop policy if exists "company branding: admin da empresa atualiza" on storage.objects;
create policy "company branding: admin da empresa atualiza"
  on storage.objects for update
  using (
    bucket_id = 'company-branding'
    and public.can_write_company_asset(name)
  )
  with check (
    bucket_id = 'company-branding'
    and public.can_write_company_asset(name)
  );

drop policy if exists "company branding: admin da empresa remove" on storage.objects;
create policy "company branding: admin da empresa remove"
  on storage.objects for delete
  using (
    bucket_id = 'company-branding'
    and public.can_write_company_asset(name)
  );
