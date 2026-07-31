"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BRANDING_BUCKET } from "@/lib/branding/document";
import { normalizeHex } from "@/lib/branding/palette";

const Schema = z.object({
  feegowToken: z.string().trim().optional(),
  authentiqueToken: z.string().trim().optional(),
  crmToken: z.string().trim().optional(),
  crmAdminToken: z.string().trim().optional(),
});

export type UpdateCredentialsState =
  | { ok: true }
  | { ok: false; error: string }
  | null;

/**
 * Atualiza credenciais.
 *
 * Preserve-existing-if-empty: tokens vazios NÃO sobrescrevem o existente.
 * Mesmo padrão do Vite legacy (configuracao.tsx) para evitar perda
 * acidental de tokens.
 *
 * Webhook outbound foi descartado (decisão 2026-05-02) — colunas
 * webhook_url/webhook_secret/webhook_enabled permanecem no banco mas
 * não são mais lidas nem escritas pelo painel.
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
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const data = parsed.data;

  if (
    !data.feegowToken &&
    !data.authentiqueToken &&
    !data.crmToken &&
    !data.crmAdminToken
  ) {
    return { ok: false, error: "Nada para salvar — preencha algum campo." };
  }

  const supabase = await createClient();

  // Pega valores atuais para preservar tokens vazios
  const existingResult = await supabase
    .from("api_credentials")
    .select("feegow_token, authentique_token, crm_token, crm_admin_token")
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

// ───────── Identidade visual ─────────

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // espelha file_size_limit do bucket
const ALLOWED_LOGO_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
];
const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

export type UpdateBrandingState =
  | { ok: true }
  | { ok: false; error: string }
  | null;

/**
 * Extrai o path interno do bucket a partir da URL pública, para conseguir
 * apagar o arquivo antigo ao trocar a logo. Devolve null se a URL não for
 * deste bucket (ex: valor legado colado à mão).
 */
function pathFromPublicUrl(url: string | null): string | null {
  if (!url) return null;
  const marker = `/${BRANDING_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const path = url.slice(idx + marker.length).split("?")[0];
  return path || null;
}

/**
 * Salva logo e cores da empresa.
 *
 * Campos em branco limpam o valor (cor volta ao neutro do documento).
 * A logo só é substituída quando um arquivo novo é enviado — salvar as
 * cores sozinho não derruba a logo existente.
 */
export async function updateBranding(
  _prev: UpdateBrandingState,
  formData: FormData,
): Promise<UpdateBrandingState> {
  const user = await requireUser();
  if (!user.isAdmin)
    return { ok: false, error: "Acesso restrito a administradores." };
  if (!user.companyId)
    return { ok: false, error: "Sua conta não está associada a uma empresa." };

  const rawPrimary = (formData.get("primaryColor") as string | null)?.trim();
  const rawSecondary = (formData.get("secondaryColor") as string | null)?.trim();

  // Vazio limpa; preenchido precisa ser hex válido.
  const primary = rawPrimary ? normalizeHex(rawPrimary) : null;
  if (rawPrimary && !primary)
    return { ok: false, error: "Cor primária inválida — use o formato #RRGGBB." };

  const secondary = rawSecondary ? normalizeHex(rawSecondary) : null;
  if (rawSecondary && !secondary)
    return {
      ok: false,
      error: "Cor secundária inválida — use o formato #RRGGBB.",
    };

  const supabase = await createClient();

  const currentResult = await supabase
    .from("companies")
    .select("*")
    .eq("id", user.companyId)
    .maybeSingle();
  if (currentResult.error && currentResult.error.code !== "PGRST116") {
    return { ok: false, error: currentResult.error.message };
  }
  const currentLogoUrl =
    (currentResult.data as unknown as { logo_url: string | null } | null)
      ?.logo_url ?? null;

  const payload: Record<string, string | null> = {
    brand_primary_color: primary,
    brand_secondary_color: secondary,
  };

  const removeLogo = formData.get("removeLogo") === "1";
  const file = formData.get("logo");
  const hasNewFile = file instanceof File && file.size > 0;

  if (hasNewFile) {
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      return {
        ok: false,
        error: "Formato não suportado. Envie PNG, JPG, WEBP ou SVG.",
      };
    }
    if (file.size > MAX_LOGO_BYTES) {
      return { ok: false, error: "A logo deve ter no máximo 2 MB." };
    }

    const ext = EXT_BY_TYPE[file.type] ?? "png";
    const path = `${user.companyId}/logo-${Date.now()}.${ext}`;

    const upload = await supabase.storage
      .from(BRANDING_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upload.error) {
      return { ok: false, error: `Falha ao enviar a logo: ${upload.error.message}` };
    }

    const { data: pub } = supabase.storage
      .from(BRANDING_BUCKET)
      .getPublicUrl(path);
    payload.logo_url = pub.publicUrl;
  } else if (removeLogo) {
    payload.logo_url = null;
  }

  const update = await supabase
    .from("companies")
     
    .update(payload as never)
    .eq("id", user.companyId);
  if (update.error) {
    return { ok: false, error: update.error.message };
  }

  // Arquivo antigo só sai depois que o banco já aponta para o novo —
  // se a limpeza falhar, sobra um órfão no bucket, o que é bem melhor
  // que uma logo apagada com o registro ainda apontando para ela.
  if ((hasNewFile || removeLogo) && currentLogoUrl) {
    const oldPath = pathFromPublicUrl(currentLogoUrl);
    if (oldPath && oldPath !== pathFromPublicUrl(payload.logo_url ?? null)) {
      await supabase.storage.from(BRANDING_BUCKET).remove([oldPath]);
    }
  }

  revalidatePath("/configuracao");
  return { ok: true };
}
