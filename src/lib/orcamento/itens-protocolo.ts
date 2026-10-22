/**
 * Itens de protocolo de um orçamento (`propostas.itens_protocolo`).
 *
 * Um orçamento pode ter VÁRIOS protocolos, com a quantidade de cada item
 * ajustada e itens retirados (decisão 2026-10-22). O orçamento guarda um
 * RETRATO dos itens incluídos, montado no servidor na criação a partir de
 * `protocol_items`: protocolo de origem, quantidade escolhida aqui e as
 * camadas comercial e clínica copiadas do protocolo naquele momento.
 *
 * Retrato, e não leitura ao vivo, porque `updateProtocol` faz
 * delete-then-insert: os ids dos itens mudam a cada edição do protocolo, e
 * o contrato passaria a mostrar o protocolo de hoje em vez do que foi
 * vendido. `ref` guarda o `protocol_items.id` da época — é a chave do delta
 * `prescricao_ajustes`, como sempre foi.
 *
 * `null` no banco = orçamento anterior à coluna: quem lê cai no caminho
 * antigo (`protocolo_id` + `protocol_items` ao vivo).
 *
 * Módulo neutro (sem `server-only`): servidor, tela de detalhe e testes.
 */

import { isVia, type Via } from "@/lib/prescricao/enums";

export type ItemProtocoloOrcamento = {
  /** `protocol_items.id` no momento da criação. Chave do delta clínico. */
  ref: string;
  protocolo_id: string;
  protocolo_nome: string;
  procedure_id: string;
  procedure_name: string;
  /** Quantidade escolhida NO ORÇAMENTO (pode diferir da do protocolo). */
  quantity: number;
  /** Quantidade que o protocolo propunha — só para exibir o que mudou. */
  quantity_protocolo: number;
  interval_days: number;
  value_cents: number;
  discount_percent: number;
  via: Via | null;
  dose: string | null;
  inicio_dias: number;
  cuidados: string | null;
};

const num = (v: unknown, fallback: number): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const strOuNull = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v : null;

/**
 * Lê o JSONB. `null` quando a coluna está vazia ou não é array — o caller
 * então usa o caminho antigo. Elemento sem `ref`/`protocolo_id` é descartado
 * (o JSONB não tem CHECK).
 */
export function parseItensProtocolo(
  raw: unknown,
): ItemProtocoloOrcamento[] | null {
  if (!Array.isArray(raw)) return null;
  const itens: ItemProtocoloOrcamento[] = [];
  for (const el of raw) {
    if (!el || typeof el !== "object" || Array.isArray(el)) continue;
    const r = el as Record<string, unknown>;
    const ref = str(r.ref);
    const protocoloId = str(r.protocolo_id);
    if (!ref || !protocoloId) continue;
    const quantity = Math.max(1, Math.trunc(num(r.quantity, 1)));
    itens.push({
      ref,
      protocolo_id: protocoloId,
      protocolo_nome: str(r.protocolo_nome) || "Protocolo",
      procedure_id: str(r.procedure_id),
      procedure_name: str(r.procedure_name) || "Procedimento",
      quantity,
      quantity_protocolo: Math.max(
        1,
        Math.trunc(num(r.quantity_protocolo, quantity)),
      ),
      interval_days: Math.max(0, Math.trunc(num(r.interval_days, 0))),
      value_cents: Math.max(0, Math.trunc(num(r.value_cents, 0))),
      discount_percent: Math.min(100, Math.max(0, num(r.discount_percent, 0))),
      via: isVia(r.via) ? r.via : null,
      dose: strOuNull(r.dose),
      inicio_dias: Math.max(0, Math.trunc(num(r.inicio_dias, 0))),
      cuidados: strOuNull(r.cuidados),
    });
  }
  return itens;
}

export type GrupoProtocolo = {
  protocolo_id: string;
  protocolo_nome: string;
  itens: ItemProtocoloOrcamento[];
};

/** Agrupa por protocolo, na ordem em que os protocolos aparecem. */
export function agruparPorProtocolo(
  itens: ItemProtocoloOrcamento[],
): GrupoProtocolo[] {
  const grupos: GrupoProtocolo[] = [];
  for (const item of itens) {
    let g = grupos.find((x) => x.protocolo_id === item.protocolo_id);
    if (!g) {
      g = {
        protocolo_id: item.protocolo_id,
        protocolo_nome: item.protocolo_nome,
        itens: [],
      };
      grupos.push(g);
    }
    g.itens.push(item);
  }
  return grupos;
}

/** "A + B" — o que vai em `propostas.protocolo_nome`. */
export function nomeDosProtocolos(nomes: string[]): string {
  return nomes.filter((n) => n.trim()).join(" + ");
}

/**
 * Texto de protocolo (cuidados gerais, sinais de alerta) de VÁRIOS
 * protocolos num campo só. Um protocolo: o texto dele, intocado — assim a
 * folha de um orçamento de protocolo único sai igual à de sempre. Vários:
 * cada texto com o nome do protocolo na frente, para a enfermagem saber de
 * onde vem cada orientação.
 */
export function combinarTextosDeProtocolos(
  textos: Array<{ nome: string; texto: string | null }>,
): string | null {
  const comTexto = textos.filter((t) => (t.texto ?? "").trim());
  if (comTexto.length === 0) return null;
  if (textos.length === 1) return comTexto[0].texto;
  return comTexto
    .map((t) => `${t.nome}:\n${(t.texto ?? "").trim()}`)
    .join("\n\n");
}

/** Subtotal de um item: quantidade × valor, com o desconto do item. */
export function subtotalItem(item: {
  quantity: number;
  value_cents: number;
  discount_percent: number;
}): number {
  return Math.round(
    item.quantity * item.value_cents * (1 - (item.discount_percent ?? 0) / 100),
  );
}
