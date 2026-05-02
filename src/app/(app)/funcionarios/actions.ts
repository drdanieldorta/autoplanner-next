"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireCompanyAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const CreateSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório"),
  email: z.string().trim().email("Email inválido"),
  cpf: z.string().trim().min(1, "CPF é obrigatório"),
  isAdmin: z.boolean().default(false),
});

export type FuncionarioFormState =
  | { ok: true }
  | { ok: false; error: string }
  | null;

/**
 * Cria funcionário. Invoca Edge Function `create-employee` (Deno) que:
 *   - Convida via auth.admin.inviteUserByEmail
 *   - Faz upsert em profiles (status=approved direto)
 *   - Insere user_role (company_user + opcionalmente company_admin)
 *
 * Ver autoplanner/docs/BD.md § 3 e supabase/functions/create-employee/index.ts.
 */
export async function createFuncionario(
  _prev: FuncionarioFormState,
  formData: FormData,
): Promise<FuncionarioFormState> {
  const user = await requireCompanyAdmin();
  if (!user.companyId)
    return { ok: false, error: "Sua conta não está associada a uma empresa." };

  const parsed = CreateSchema.safeParse({
    name: formData.get("name") ?? "",
    email: formData.get("email") ?? "",
    cpf: formData.get("cpf") ?? "",
    isAdmin: formData.get("isAdmin") === "on",
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.functions.invoke("create-employee", {
    body: {
      company_id: user.companyId,
      name: parsed.data.name,
      email: parsed.data.email,
      cpf: parsed.data.cpf,
      role: "company_user",
      isAdmin: parsed.data.isAdmin,
    },
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/funcionarios");
  return { ok: true };
}

/**
 * Substitui o conjunto de permissões de ferramentas de um funcionário.
 * Estratégia: delete-all + insert (igual ao Vite legacy) — simples e
 * idempotente. Wrapped numa única RPC seria mais bonito mas exigiria
 * adicionar uma função no Supabase só pra isso.
 *
 * Admins (company_admin) NÃO precisam de permissões explícitas — o caller
 * deve checar `isAdmin` antes de abrir o dialog. Mesmo assim, se um payload
 * com isAdmin=true escapar, ainda gravamos (sem dano).
 */
const SetPermsSchema = z.object({
  user_id: z.string().uuid(),
  tool_ids: z.array(z.string().uuid()),
});

export type SetPermsState =
  | { ok: true }
  | { ok: false; error: string }
  | null;

export async function setFuncionarioToolPermissions(
  input: z.infer<typeof SetPermsSchema>,
): Promise<SetPermsState> {
  const user = await requireCompanyAdmin();
  if (!user.companyId)
    return { ok: false, error: "Sua conta não está associada a uma empresa." };

  const parsed = SetPermsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    };
  }

  const supabase = await createClient();

  const deleteResult = await supabase
    .from("user_tool_permissions")
    .delete()
    .eq("user_id", parsed.data.user_id)
    .eq("company_id", user.companyId);
  if (deleteResult.error) {
    return { ok: false, error: deleteResult.error.message };
  }

  if (parsed.data.tool_ids.length > 0) {
    const rows = parsed.data.tool_ids.map((toolId) => ({
      user_id: parsed.data.user_id,
      tool_id: toolId,
      company_id: user.companyId!,
    }));
    const insertResult = await supabase
      .from("user_tool_permissions")
      .insert(rows as never);
    if (insertResult.error) {
      return { ok: false, error: insertResult.error.message };
    }
  }

  revalidatePath("/funcionarios");
  return { ok: true };
}

/**
 * Deleta funcionário. Invoca Edge Function `delete-user` (Deno) que:
 *   - Valida que o caller é super_admin OU company_admin da empresa do alvo
 *   - Faz auth.admin.deleteUser (cascata FK derruba profiles + user_roles)
 */
export async function deleteFuncionarioFromForm(formData: FormData) {
  const user = await requireCompanyAdmin();
  if (!user.companyId) redirect("/funcionarios");

  const userId = formData.get("id");
  if (typeof userId !== "string" || !userId) redirect("/funcionarios");

  const supabase = await createClient();
  await supabase.functions.invoke("delete-user", {
    body: { user_id: userId },
  });

  revalidatePath("/funcionarios");
}
