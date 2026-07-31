-- Arquivo do contrato gerado + metadados do envio.
--
-- Até aqui o PDF do contrato era gerado em memória, mandado para a
-- Authentique e descartado — não sobrava nada no painel. Agora cada
-- envio guarda o arquivo real e os dados do disparo, para a tela do
-- orçamento conseguir exibir, baixar e imprimir.

alter table public.propostas
  add column if not exists contract_pdf_path text,
  add column if not exists contract_sent_at timestamptz,
  add column if not exists contract_signing_link text;

comment on column public.propostas.contract_pdf_path is
  'Path no bucket `contracts` do PDF exatamente como enviado. NULL nos '
  'contratos anteriores a esta feature — nesses o PDF é regerado sob demanda.';
comment on column public.propostas.contract_sent_at is
  'Quando o contrato foi disparado para a Authentique.';
comment on column public.propostas.contract_signing_link is
  'Short link de assinatura devolvido pela Authentique no envio.';

-- Bucket PRIVADO: contrato tem CPF, endereço e procedimentos do paciente.
-- Não recebe nenhuma policy de propósito — sem policy, `anon` e
-- `authenticated` não alcançam o objeto. O acesso passa exclusivamente
-- pelo Route Handler, que valida a empresa antes de servir o arquivo
-- usando o service_role (que ignora RLS).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('contracts', 'contracts', false, 10485760, array['application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
