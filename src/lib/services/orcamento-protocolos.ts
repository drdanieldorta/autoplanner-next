import "server-only";

import {
  nomeDosProtocolos,
  type ItemProtocoloOrcamento,
} from "@/lib/orcamento/itens-protocolo";
import { isVia } from "@/lib/prescricao/enums";
import { createAdminClient } from "@/lib/supabase/admin";

/** O que o formulário manda: quais protocolos, quais itens, quantas vezes. */
export type ProtocoloSelecionado = {
  protocolo_id: string;
  itens: Array<{ ref: string; quantity: number }>;
};

export type MontagemProtocolos =
  | {
      ok: true;
      itens: ItemProtocoloOrcamento[];
      /** Primeiro protocolo — `propostas.protocolo_id`, para listagens. */
      protocoloId: string | null;
      /** "A + B" — `propostas.protocolo_nome`. */
      protocoloNome: string | null;
    }
  | { ok: false; status: 404 | 409 | 422; error: string };

type ItemRow = {
  id: string;
  protocol_id: string;
  procedure_id: string | null;
  procedure_name: string | null;
  quantity: number | null;
  interval_days: number | null;
  value_cents: number | null;
  discount_percent: number | null;
  via: string | null;
  dose: string | null;
  inicio_dias: number | null;
  cuidados: string | null;
};

/**
 * Monta o retrato `propostas.itens_protocolo` NO SERVIDOR.
 *
 * Do formulário só se aceita a escolha (protocolos, itens incluídos e a
 * quantidade de cada um). Nome, valor, desconto, intervalo e a camada
 * clínica vêm de `protocol_items` agora — o orçamento não pode gravar um
 * valor que o protocolo não tem.
 *
 * ⚠️ Este select É explícito: coluna nova de `protocol_items` que precise ir
 * para o contrato ou para o cronograma tem que entrar aqui também (é o sexto
 * lugar da lista "SEIS lugares" de CLAUDE.md).
 *
 * 409 quando um item escolhido não existe mais: `updateProtocol` faz
 * delete-then-insert, então editar o protocolo com o formulário aberto troca
 * os ids. Melhor pedir para recarregar do que gravar um orçamento parcial.
 */
export async function montarItensProtocolo(args: {
  companyId: string;
  protocolos: ProtocoloSelecionado[];
}): Promise<MontagemProtocolos> {
  const selecionados = args.protocolos.filter((p) => p.itens.length > 0);
  if (selecionados.length === 0) {
    return { ok: true, itens: [], protocoloId: null, protocoloNome: null };
  }

  const ids = selecionados.map((p) => p.protocolo_id);
  if (new Set(ids).size !== ids.length) {
    return {
      ok: false,
      status: 422,
      error: "O mesmo protocolo foi adicionado duas vezes ao orçamento.",
    };
  }

  const admin = createAdminClient();

  const protosResult = await admin
    .from("protocols")
    .select("id, name")
    .in("id", ids)
    .eq("company_id", args.companyId);
  if (protosResult.error) {
    return { ok: false, status: 422, error: protosResult.error.message };
  }
  const protos = (protosResult.data ?? []) as Array<{ id: string; name: string }>;
  const nomePorId = new Map(protos.map((p) => [p.id, p.name]));
  const faltando = ids.find((id) => !nomePorId.has(id));
  if (faltando) {
    return {
      ok: false,
      status: 404,
      error: "Um dos protocolos do orçamento não foi encontrado. Recarregue a página.",
    };
  }

  const itemsResult = await admin
    .from("protocol_items")
    .select(
      "id, protocol_id, procedure_id, procedure_name, quantity, interval_days, value_cents, discount_percent, via, dose, inicio_dias, cuidados",
    )
    .in("protocol_id", ids)
    .order("created_at", { ascending: true });
  if (itemsResult.error) {
    return { ok: false, status: 422, error: itemsResult.error.message };
  }
  const rows = (itemsResult.data ?? []) as ItemRow[];

  const itens: ItemProtocoloOrcamento[] = [];
  for (const sel of selecionados) {
    const nome = nomePorId.get(sel.protocolo_id) ?? "Protocolo";
    const doProtocolo = rows.filter((r) => r.protocol_id === sel.protocolo_id);
    const porRef = new Map(doProtocolo.map((r) => [r.id, r]));

    const quantidadePorRef = new Map<string, number>();
    for (const it of sel.itens) {
      if (!porRef.has(it.ref)) {
        return {
          ok: false,
          status: 409,
          error: `O protocolo «${nome}» foi alterado enquanto o orçamento era montado. Recarregue a página e monte o orçamento de novo.`,
        };
      }
      quantidadePorRef.set(it.ref, it.quantity);
    }

    // Ordem do PROTOCOLO, não a do payload: é a ordem que o contrato e a
    // folha de enfermagem sempre usaram.
    for (const r of doProtocolo) {
      const quantity = quantidadePorRef.get(r.id);
      if (quantity === undefined) continue;
      itens.push({
        ref: r.id,
        protocolo_id: sel.protocolo_id,
        protocolo_nome: nome,
        procedure_id: r.procedure_id ?? "",
        procedure_name: r.procedure_name ?? "Procedimento",
        quantity,
        quantity_protocolo: r.quantity ?? quantity,
        interval_days: r.interval_days ?? 0,
        value_cents: r.value_cents ?? 0,
        discount_percent: r.discount_percent ?? 0,
        via: isVia(r.via) ? r.via : null,
        dose: r.dose?.trim() ? r.dose : null,
        inicio_dias: r.inicio_dias ?? 0,
        cuidados: r.cuidados?.trim() ? r.cuidados : null,
      });
    }
  }

  return {
    ok: true,
    itens,
    protocoloId: ids[0],
    protocoloNome: nomeDosProtocolos(ids.map((id) => nomePorId.get(id) ?? "")),
  };
}
