"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { documentosPlanoSchema, protocolItemSchema } from "@/lib/validations";

const CreateSchema = z.object({
  name: z.string().trim().min(3, "Nome deve ter pelo menos 3 caracteres").max(120),
  cuidados_gerais: z.string().max(2000).nullable().optional(),
  sinais_alerta: z.string().max(2000).nullable().optional(),
  items: z.array(protocolItemSchema).min(1, "Adicione pelo menos um procedimento"),
  ...documentosPlanoSchema,
});

const UpdateSchema = CreateSchema.extend({
  id: z.string().uuid(),
});

export type ProtocolFormState =
  | { ok: true; id: string }
  | { ok: false; error: string }
  | null;

/** Textarea vazia vira NULL, não string vazia — mantém o banco limpo. */
function nullIfBlank(v: string | null | undefined): string | null {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Replace dos documentos do protocolo.
 *
 * `ordem` é a posição no array — é ela que decide a sequência das páginas
 * no PDF, então a ordem da tela precisa chegar intacta até aqui.
 */
async function replaceProtocolContracts(
  supabase: Supabase,
  protocolId: string,
  contractIds: string[],
): Promise<string | null> {
  const del = await supabase
    .from("protocol_contracts")
    .delete()
    .eq("protocol_id", protocolId);
  if (del.error) return del.error.message;

  if (contractIds.length === 0) return null;

  // Dedup preservando a ordem: id repetido violaria a PK composta.
  const unicos = [...new Set(contractIds)];
  const ins = await supabase.from("protocol_contracts").insert(
    unicos.map((contract_id, ordem) => ({
      protocol_id: protocolId,
      contract_id,
      ordem,
    })) as never,
  );
  return ins.error?.message ?? null;
}

function calcTotal(items: z.infer<typeof protocolItemSchema>[]): number {
  return items.reduce((sum, item) => {
    const subtotal = item.quantity * item.value_cents;
    const discount = subtotal * (item.discount_percent / 100);
    return sum + (subtotal - discount);
  }, 0);
}

export async function createProtocol(
  input: z.infer<typeof CreateSchema>,
): Promise<ProtocolFormState> {
  const user = await requireUser();
  if (!user.companyId)
    return { ok: false, error: "Sua conta não está associada a uma empresa." };

  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const totalCents = calcTotal(parsed.data.items);

  const insertResult = await supabase
    .from("protocols")
     
    .insert({
      name: parsed.data.name,
      total_value_cents: totalCents,
      user_id: user.id,
      company_id: user.companyId,
      cuidados_gerais: nullIfBlank(parsed.data.cuidados_gerais),
      sinais_alerta: nullIfBlank(parsed.data.sinais_alerta),
      incluir_tcle_padrao: parsed.data.incluir_tcle_padrao,
    } as never)
    .select("id")
    .single();
  const created = insertResult.data as { id: string } | null;
  if (insertResult.error || !created) {
    return {
      ok: false,
      error: insertResult.error?.message ?? "Erro ao criar protocolo",
    };
  }

  const items = parsed.data.items.map((item) => ({
    ...item,
    via: item.via ?? null,
    dose: nullIfBlank(item.dose),
    inicio_dias: item.inicio_dias ?? 0,
    cuidados: nullIfBlank(item.cuidados),
    protocol_id: created.id,
  }));
  const itemsResult = await supabase
    .from("protocol_items")
     
    .insert(items as never);
  if (itemsResult.error) {
    // cleanup
    await supabase.from("protocols").delete().eq("id", created.id);
    return { ok: false, error: itemsResult.error.message };
  }

  const docsError = await replaceProtocolContracts(
    supabase,
    created.id,
    parsed.data.contract_ids,
  );
  if (docsError) {
    await supabase.from("protocols").delete().eq("id", created.id);
    return { ok: false, error: docsError };
  }

  revalidatePath("/protocolos");
  return { ok: true, id: created.id };
}

export async function updateProtocol(
  input: z.infer<typeof UpdateSchema>,
): Promise<ProtocolFormState> {
  const user = await requireUser();
  if (!user.companyId)
    return { ok: false, error: "Sua conta não está associada a uma empresa." };

  const parsed = UpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const totalCents = calcTotal(parsed.data.items);

  const updateResult = await supabase
    .from("protocols")
     
    .update({
      name: parsed.data.name,
      total_value_cents: totalCents,
      cuidados_gerais: nullIfBlank(parsed.data.cuidados_gerais),
      sinais_alerta: nullIfBlank(parsed.data.sinais_alerta),
      incluir_tcle_padrao: parsed.data.incluir_tcle_padrao,
    } as never)
    .eq("id", parsed.data.id)
    .eq("company_id", user.companyId);
  if (updateResult.error) {
    return { ok: false, error: updateResult.error.message };
  }

  // Replace items: delete existing + insert new
  //
  // ⚠️ Este delete-then-insert é destrutivo: TODO campo de protocol_items
  // precisa chegar no map abaixo. Um campo ausente aqui não fica "sem ser
  // atualizado" — ele é APAGADO, mesmo que o usuário só tenha mexido no
  // preço. Ao adicionar coluna nova, ela precisa entrar em quatro lugares:
  // protocolItemSchema, getProtocolById (select), a página de editar
  // (initialValues) e este map.
  const deleteResult = await supabase
    .from("protocol_items")
    .delete()
    .eq("protocol_id", parsed.data.id);
  if (deleteResult.error) {
    return { ok: false, error: deleteResult.error.message };
  }
  const items = parsed.data.items.map((item) => ({
    ...item,
    via: item.via ?? null,
    dose: nullIfBlank(item.dose),
    inicio_dias: item.inicio_dias ?? 0,
    cuidados: nullIfBlank(item.cuidados),
    protocol_id: parsed.data.id,
  }));
  const insertResult = await supabase
    .from("protocol_items")
     
    .insert(items as never);
  if (insertResult.error) {
    return { ok: false, error: insertResult.error.message };
  }

  const docsError = await replaceProtocolContracts(
    supabase,
    parsed.data.id,
    parsed.data.contract_ids,
  );
  if (docsError) {
    return { ok: false, error: docsError };
  }

  revalidatePath("/protocolos");
  revalidatePath(`/protocolos/${parsed.data.id}/editar`);
  return { ok: true, id: parsed.data.id };
}

/**
 * Server Action chamada via `<form action={...}>` na listagem.
 * Recebe FormData com `id`, deleta e revalida.
 */
export async function deleteProtocolFromForm(formData: FormData) {
  const user = await requireUser();
  if (!user.companyId) redirect("/protocolos");

  const id = formData.get("id");
  if (typeof id !== "string" || !id) redirect("/protocolos");

  const supabase = await createClient();
  await supabase
    .from("protocols")
    .delete()
    .eq("id", id)
    .eq("company_id", user.companyId);

  revalidatePath("/protocolos");
}
