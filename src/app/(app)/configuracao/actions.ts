"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const Schema = z.object({
  feegowToken: z.string().trim().optional(),
  authentiqueToken: z.string().trim().optional(),
  crmToken: z.string().trim().optional(),
  crmAdminToken: z.string().trim().optional(),
  webhookUrl: z
    .string()
    .trim()
    .url("URL de webhook inválida")
    .or(z.literal("")),
  webhookSecret: z.string().trim().optional(),
  webhookEnabled: z.boolean(),
});

export type UpdateCredentialsState =
  | { ok: true }
  | { ok: false; error: string }
  | null;

/**
 * Atualiza credenciais e webhook.
 *
 * Preserve-existing-if-empty: tokens vazios NÃO sobrescrevem o existente.
 * Apenas o webhook_url/secret/enabled aceitam string vazia explicitamente.
 *
 * Mesmo padrão do Vite legacy (configuracao.tsx) para evitar perda
 * acidental de tokens quando o admin só queria atualizar o webhook.
 */
export async function updateCredentials(
  _prev: UpdateCredentialsState,
  formData: FormData,
): Promise<UpdateCredentialsState> {
  const user = await requireUser();
  if (!user.isAdmin)
    return { ok: false, error: "Acesso restrito a administradores." };
  if (!user.companyId)
    return { ok: false, error: "Sua conta não está associada a uma empresa." };

  const parsed = Schema.safeParse({
    feegowToken: formData.get("feegowToken") || undefined,
    authentiqueToken: formData.get("authentiqueToken") || undefined,
    crmToken: formData.get("crmToken") || undefined,
    crmAdminToken: formData.get("crmAdminToken") || undefined,
    webhookUrl: formData.get("webhookUrl") ?? "",
    webhookSecret: formData.get("webhookSecret") || undefined,
    webhookEnabled: formData.get("webhookEnabled") === "on",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const data = parsed.data;

  if (
    !data.feegowToken &&
    !data.authentiqueToken &&
    !data.crmToken &&
    !data.crmAdminToken &&
    data.webhookUrl === ""
  ) {
    return { ok: false, error: "Nada para salvar — preencha algum campo." };
  }

  const supabase = await createClient();

  // Pega valores atuais para preservar tokens vazios
  const existingResult = await supabase
    .from("api_credentials")
    .select(
      "feegow_token, authentique_token, crm_token, crm_admin_token, webhook_url, webhook_secret, webhook_enabled",
    )
    .eq("company_id", user.companyId)
    .maybeSingle();

  if (existingResult.error && existingResult.error.code !== "PGRST116") {
    return { ok: false, error: existingResult.error.message };
  }

  const existing = existingResult.data as {
    feegow_token: string | null;
    authentique_token: string | null;
    crm_token: string | null;
    crm_admin_token: string | null;
    webhook_url: string | null;
    webhook_secret: string | null;
    webhook_enabled: boolean | null;
  } | null;

  const upsertPayload = {
    user_id: user.id,
    company_id: user.companyId,
    feegow_token: data.feegowToken
      ? data.feegowToken
      : existing?.feegow_token ?? null,
    authentique_token: data.authentiqueToken
      ? data.authentiqueToken
      : existing?.authentique_token ?? null,
    crm_token: data.crmToken ? data.crmToken : existing?.crm_token ?? null,
    crm_admin_token: user.isSuperAdmin
      ? data.crmAdminToken
        ? data.crmAdminToken
        : existing?.crm_admin_token ?? null
      : existing?.crm_admin_token ?? null,
    webhook_url:
      data.webhookUrl !== ""
        ? data.webhookUrl
        : existing?.webhook_url ?? null,
    webhook_secret:
      data.webhookSecret && data.webhookSecret.trim() !== ""
        ? data.webhookSecret
        : existing?.webhook_secret ?? null,
    webhook_enabled: data.webhookEnabled,
  };

  const upsert = await supabase
    .from("api_credentials")
     
    .upsert(upsertPayload as never, {
      onConflict: "company_id",
      ignoreDuplicates: false,
    });

  if (upsert.error) {
    return { ok: false, error: upsert.error.message };
  }

  revalidatePath("/configuracao");
  return { ok: true };
}
