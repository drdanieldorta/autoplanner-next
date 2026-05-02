"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireCompanyAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const CreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nome é obrigatório")
    .max(200, "Nome deve ter no máximo 200 caracteres"),
  description: z
    .string()
    .trim()
    .max(500, "Descrição deve ter no máximo 500 caracteres")
    .optional(),
  content: z.string().trim().min(1, "Conteúdo é obrigatório"),
});

const UpdateSchema = CreateSchema.extend({
  id: z.string().uuid(),
});

export type ContractFormState =
  | { ok: true; id: string }
  | { ok: false; error: string }
  | null;

export async function createContract(
  input: z.infer<typeof CreateSchema>,
): Promise<ContractFormState> {
  const user = await requireCompanyAdmin();
  if (!user.companyId)
    return { ok: false, error: "Sua conta não está associada a uma empresa." };

  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const insertResult = await supabase
    .from("contracts")
    .insert(
      // TODO: regenerar types via `npm run types:supabase` para remover este `as never`.
      // Versão atual do SDK colapsa para `never` (ver autoplanner-next/CLAUDE.md).
       
      {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        content: parsed.data.content,
        user_id: user.id,
        company_id: user.companyId,
      } as never,
    )
    .select("id")
    .single();
  const created = insertResult.data as { id: string } | null;
  if (insertResult.error || !created) {
    return {
      ok: false,
      error: insertResult.error?.message ?? "Erro ao criar contrato",
    };
  }

  revalidatePath("/contratos");
  return { ok: true, id: created.id };
}

export async function updateContract(
  input: z.infer<typeof UpdateSchema>,
): Promise<ContractFormState> {
  const user = await requireCompanyAdmin();
  if (!user.companyId)
    return { ok: false, error: "Sua conta não está associada a uma empresa." };

  const parsed = UpdateSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const result = await supabase
    .from("contracts")
     
    .update({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      content: parsed.data.content,
    } as never)
    .eq("id", parsed.data.id)
    .eq("company_id", user.companyId);
  if (result.error) return { ok: false, error: result.error.message };

  revalidatePath("/contratos");
  revalidatePath(`/contratos/${parsed.data.id}`);
  return { ok: true, id: parsed.data.id };
}

export async function deleteContractFromForm(formData: FormData) {
  const user = await requireCompanyAdmin();
  if (!user.companyId) redirect("/contratos");

  const id = formData.get("id");
  if (typeof id !== "string" || !id) redirect("/contratos");

  const supabase = await createClient();
  await supabase
    .from("contracts")
    .delete()
    .eq("id", id)
    .eq("company_id", user.companyId);

  revalidatePath("/contratos");
}
