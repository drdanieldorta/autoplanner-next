import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type ProtocolRow = Database["public"]["Tables"]["protocols"]["Row"];
type ProtocolItemRow =
  Database["public"]["Tables"]["protocol_items"]["Row"];

export type Protocol = Pick<
  ProtocolRow,
  | "id"
  | "name"
  | "created_at"
  | "updated_at"
  | "total_value_cents"
  | "cuidados_gerais"
  | "sinais_alerta"
  | "incluir_tcle_padrao"
> & {
  itemsCount: number;
};

export type ProtocolWithItems = Protocol & {
  items: ProtocolItemRow[];
  /** Modelos de documento que este protocolo propõe, em ordem. */
  contractIds: string[];
};

/** Vínculos de documento de um conjunto de protocolos, já em ordem. */
async function loadContractIds(
  protocolIds: string[],
): Promise<Record<string, string[]>> {
  if (protocolIds.length === 0) return {};
  const supabase = await createClient();
  const result = await supabase
    .from("protocol_contracts")
    .select("protocol_id, contract_id, ordem")
    .in("protocol_id", protocolIds)
    .order("ordem", { ascending: true });
  if (result.error) throw new Error(result.error.message);

  const porProtocolo: Record<string, string[]> = {};
  for (const row of (result.data ?? []) as Array<{
    protocol_id: string;
    contract_id: string;
  }>) {
    (porProtocolo[row.protocol_id] ??= []).push(row.contract_id);
  }
  return porProtocolo;
}

/**
 * Lista protocolos da empresa do usuário logado.
 * Filtragem por company_id é feita via RLS, mas aplicamos `eq` explícito
 * como cinto de segurança (mesmo padrão dos services do Vite).
 */
export async function listProtocols(args: {
  companyId: string;
  search?: string;
}): Promise<Protocol[]> {
  const supabase = await createClient();
  let query = supabase
    .from("protocols")
    .select(
      `id, name, created_at, updated_at, total_value_cents, cuidados_gerais, sinais_alerta, incluir_tcle_padrao, protocol_items(count)`,
    )
    .eq("company_id", args.companyId);

  if (args.search) {
    query = query.ilike("name", `%${args.search}%`);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const r = row as unknown as ProtocolRow & {
      protocol_items?: { count: number }[];
    };
    return {
      id: r.id,
      name: r.name,
      created_at: r.created_at,
      updated_at: r.updated_at,
      total_value_cents: r.total_value_cents ?? 0,
      cuidados_gerais: r.cuidados_gerais ?? null,
      sinais_alerta: r.sinais_alerta ?? null,
      incluir_tcle_padrao: r.incluir_tcle_padrao ?? false,
      itemsCount: r.protocol_items?.[0]?.count ?? 0,
    };
  });
}

/**
 * Lista protocolos com seus itens. Usado pelo form de Orçamento, que
 * precisa expandir um protocolo selecionado em itens — sem a roundtrip
 * adicional do /api/protocols/:id.
 */
export async function listProtocolsWithItems(args: {
  companyId: string;
}): Promise<ProtocolWithItems[]> {
  const protocols = await listProtocols({ companyId: args.companyId });
  if (protocols.length === 0) return [];
  const supabase = await createClient();
  const itemsResult = await supabase
    .from("protocol_items")
    .select("*")
    .in(
      "protocol_id",
      protocols.map((p) => p.id),
    )
    .order("created_at", { ascending: true });
  if (itemsResult.error) throw new Error(itemsResult.error.message);
  const items = (itemsResult.data ?? []) as ProtocolItemRow[];
  const itemsByProtocol = items.reduce<Record<string, ProtocolItemRow[]>>(
    (acc, item) => {
      if (!acc[item.protocol_id]) acc[item.protocol_id] = [];
      acc[item.protocol_id].push(item);
      return acc;
    },
    {},
  );
  const contractsByProtocol = await loadContractIds(protocols.map((p) => p.id));
  return protocols.map((p) => ({
    ...p,
    items: itemsByProtocol[p.id] ?? [],
    contractIds: contractsByProtocol[p.id] ?? [],
  }));
}

export async function getProtocolById(args: {
  id: string;
  companyId: string;
}): Promise<ProtocolWithItems | null> {
  const supabase = await createClient();
  const protocolResult = await supabase
    .from("protocols")
    // ⚠️ Lista explícita: qualquer coluna nova PRECISA ser adicionada aqui.
    // A página de editar remonta o form a partir deste retorno e
    // `updateProtocol` faz delete-then-insert dos itens — uma coluna
    // esquecida aqui não fica "sem aparecer", ela é APAGADA no primeiro
    // salvamento.
    .select(
      "id, name, created_at, updated_at, total_value_cents, company_id, cuidados_gerais, sinais_alerta, incluir_tcle_padrao",
    )
    .eq("id", args.id)
    .eq("company_id", args.companyId)
    .maybeSingle();
  const protocol = protocolResult.data as ProtocolRow | null;
  if (!protocol) return null;

  const itemsResult = await supabase
    .from("protocol_items")
    .select("*")
    .eq("protocol_id", args.id)
    .order("created_at", { ascending: true });
  const items = (itemsResult.data ?? []) as ProtocolItemRow[];

  const contractsByProtocol = await loadContractIds([args.id]);

  return {
    id: protocol.id,
    name: protocol.name,
    created_at: protocol.created_at,
    updated_at: protocol.updated_at,
    total_value_cents: protocol.total_value_cents ?? 0,
    cuidados_gerais: protocol.cuidados_gerais ?? null,
    sinais_alerta: protocol.sinais_alerta ?? null,
    incluir_tcle_padrao: protocol.incluir_tcle_padrao ?? false,
    itemsCount: items.length,
    items,
    contractIds: contractsByProtocol[args.id] ?? [],
  };
}
