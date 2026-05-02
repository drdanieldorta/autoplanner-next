"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { protocolItemSchema } from "@/lib/validations";

const CreateSchema = z.object({
  name: z.string().trim().min(3, "Nome deve ter pelo menos 3 caracteres").max(120),
  items: z.array(protocolItemSchema).min(1, "Adicione pelo menos um procedimento"),
});

const UpdateSchema = CreateSchema.extend({
  id: z.string().uuid(),
});

export type ProtocolFormState =
  | { ok: true; id: string }
  | { ok: false; error: string }
  | null;

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
     
    .update({ name: parsed.data.name, total_value_cents: totalCents } as never)
    .eq("id", parsed.data.id)
    .eq("company_id", user.companyId);
  if (updateResult.error) {
    return { ok: false, error: updateResult.error.message };
  }

  // Replace items: delete existing + insert new
  const deleteResult = await supabase
    .from("protocol_items")
    .delete()
    .eq("protocol_id", parsed.data.id);
  if (deleteResult.error) {
    return { ok: false, error: deleteResult.error.message };
  }
  const items = parsed.data.items.map((item) => ({
    ...item,
    protocol_id: parsed.data.id,
  }));
  const insertResult = await supabase
    .from("protocol_items")
     
    .insert(items as never);
  if (insertResult.error) {
    return { ok: false, error: insertResult.error.message };
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
