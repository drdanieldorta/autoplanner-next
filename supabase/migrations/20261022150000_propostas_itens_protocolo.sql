-- Vários protocolos por orçamento, com quantidade editável e itens removíveis
-- no próprio orçamento (decisão 2026-10-22).
--
-- `itens_protocolo` é o RETRATO dos itens de protocolo deste orçamento,
-- montado no servidor na criação: um elemento por item incluído, com o
-- protocolo de origem, a quantidade escolhida no orçamento e a camada
-- comercial e clínica copiada do protocolo naquele momento. Item retirado
-- simplesmente não está no array.
--
-- Por que retrato e não leitura ao vivo de `protocol_items`: `updateProtocol`
-- faz delete-then-insert dos itens, então os ids mudam a cada edição do
-- protocolo. Um ajuste de quantidade guardado por id ficaria órfão e o
-- contrato passaria a mostrar o protocolo de hoje, não o que foi vendido.
--
-- NULL = orçamento anterior a esta coluna: contrato, cronograma e tela de
-- detalhe continuam lendo `protocolo_id` + `protocol_items` ao vivo, como
-- sempre (o hash do cronograma desses orçamentos não muda).
--
-- `protocolo_id` passa a guardar o PRIMEIRO protocolo e `protocolo_nome` os
-- nomes unidos por " + " — só para listagens e compatibilidade.

alter table public.propostas
  add column if not exists itens_protocolo jsonb;

comment on column public.propostas.itens_protocolo is
  'Retrato dos itens de protocolo do orçamento (vários protocolos, quantidade editada, itens retirados ausentes). NULL = orçamento antigo, que lê protocolo_id + protocol_items ao vivo. Formato em src/lib/orcamento/itens-protocolo.ts.';
