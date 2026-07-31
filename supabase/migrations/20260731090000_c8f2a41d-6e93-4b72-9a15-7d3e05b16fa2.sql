-- ─────────────────────────────────────────────────────────────────────
-- Ajustes da folha por paciente + separação entre GERAR e ENVIAR.
--
-- Decisão 2026-07-31: o PDF continua sendo gerado automaticamente junto com
-- o contrato, mas o envio ao prontuário deixa de ser automático — vira ato
-- explícito, feito depois de revisar. Motivo: a Feegow não expõe delete nem
-- replace de anexo, então arquivar é irreversível e não pode acontecer sem
-- alguém ter olhado o documento.
-- ─────────────────────────────────────────────────────────────────────

alter table public.propostas
  add column if not exists prescricao_ajustes       jsonb not null default '{}'::jsonb,
  add column if not exists prescricao_hash_enviado  text;

comment on column public.propostas.prescricao_ajustes is
  'Delta ESPARSO sobre a projeção do protocolo, válido só para esta folha: {"<item_ref>": {via, cuidados, sessoes: {"<n>": offset_dias}}}. Vazio = a folha é exatamente a projeção do protocolo. As chaves são protocol_items.id (ou "extra:<i>"); updateProtocol recria esses ids, então ajuste órfão vira AVISO visível, nunca descarte silencioso.';

comment on column public.propostas.prescricao_hash_enviado is
  'Hash da última revisão efetivamente ANEXADA no prontuário. Separado de prescricao_hash (que é o snapshot atual, possivelmente editado e ainda não enviado): é a comparação entre os dois que decide se um envio é nova revisão ou reenvio do mesmo conteúdo.';
