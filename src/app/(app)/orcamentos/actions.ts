"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Deleta um orçamento (proposta). Chamado via `<form action={...}>` com
 * FormData contendo `id`. RLS garante que só o owner ou admin da empresa
 * possa deletar; o `.eq("company_id", ...)` é cinto de segurança.
 *
 * Não cancela na Feegow ou no Authentique — esse fluxo entra na Fase 6
 * com o cancelamento automático junto com a rotação de secrets.
 */
export async function deleteOrcamentoFromForm(formData: FormData) {
  const user = await requireUser();
  if (!user.companyId) redirect("/orcamentos");

  const id = formData.get("id");
  if (typeof id !== "string" || !id) redirect("/orcamentos");

  const supabase = await createClient();
  await supabase
    .from("propostas")
    .delete()
    .eq("id", id)
    .eq("company_id", user.companyId);

  revalidatePath("/orcamentos");
}
