"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const Schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nome é obrigatório")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  email: z
    .string()
    .trim()
    .email("Email inválido")
    .max(255, "Email deve ter no máximo 255 caracteres"),
  phone: z
    .string()
    .trim()
    .max(20, "Telefone deve ter no máximo 20 caracteres")
    .optional(),
  display_name: z
    .string()
    .trim()
    .max(100, "Nome de exibição deve ter no máximo 100 caracteres")
    .optional(),
});

export type UpdateProfileState =
  | { ok: true }
  | { ok: false; error: string }
  | null;

export async function updateProfile(
  _prev: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const user = await requireUser();

  const parsed = Schema.safeParse({
    name: formData.get("name") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") || undefined,
    display_name: formData.get("display_name") || undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const result = await supabase
    .from("profiles")
     
    .update({
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      display_name: data.display_name ?? null,
    } as never)
    .eq("user_id", user.id);

  if (result.error) return { ok: false, error: result.error.message };

  revalidatePath("/perfil");
  return { ok: true };
}
