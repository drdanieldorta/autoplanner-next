import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveDocPalette, type DocPalette } from "@/lib/branding/palette";

export const BRANDING_BUCKET = "company-branding";

export type CompanyBranding = {
  companyName: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
};

export type DocumentBranding = {
  companyName: string;
  /** Logo já embutida como `data:` URI — o PDF não depende de rede. */
  logoDataUri: string | null;
  palette: DocPalette;
  /**
   * False quando a empresa não configurou logo nem cor. Nesse caso o
   * documento sai exatamente como saía antes desta feature existir.
   */
  hasBranding: boolean;
};

/**
 * Lê a identidade visual da empresa.
 *
 * Usa o admin client pelo mesmo motivo de `getCompanyCredentials`: quem
 * gera o documento pode não ter SELECT em `companies` sob RLS, e o
 * caller já validou que o user fala pela empresa.
 */
export async function getCompanyBranding(
  companyId: string,
): Promise<CompanyBranding | null> {
  const admin = createAdminClient();
  const result = await admin
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .maybeSingle();
  if (result.error && result.error.code !== "PGRST116") {
    throw new Error(result.error.message);
  }
  const row = result.data as unknown as {
    name: string | null;
    logo_url: string | null;
    brand_primary_color: string | null;
    brand_secondary_color: string | null;
  } | null;
  if (!row) return null;

  return {
    companyName: row.name ?? "",
    logoUrl: row.logo_url ?? null,
    primaryColor: row.brand_primary_color ?? null,
    secondaryColor: row.brand_secondary_color ?? null,
  };
}

/**
 * Baixa a logo e devolve como `data:` URI.
 *
 * Nunca joga: se a imagem sumiu do bucket, o link caiu ou o download
 * demorou, o documento sai sem logo em vez de falhar o envio inteiro do
 * contrato. Perder a marca é aceitável; perder o contrato não.
 */
async function fetchLogoAsDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "image/png";
    if (!contentType.startsWith("image/")) return null;

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0) return null;

    return `data:${contentType};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Branding pronto para render de documento (logo já embutida). */
export async function getDocumentBranding(
  companyId: string,
): Promise<DocumentBranding> {
  const empty: DocumentBranding = {
    companyName: "",
    logoDataUri: null,
    palette: resolveDocPalette(null, null),
    hasBranding: false,
  };

  let branding: CompanyBranding | null = null;
  try {
    branding = await getCompanyBranding(companyId);
  } catch {
    return empty;
  }
  if (!branding) return empty;

  const logoDataUri = branding.logoUrl
    ? await fetchLogoAsDataUri(branding.logoUrl)
    : null;

  const palette = resolveDocPalette(
    branding.primaryColor,
    branding.secondaryColor,
  );

  // Só consideramos "com identidade" se há algo de fato configurado.
  // Uma logo que falhou o download não conta — senão o documento ganharia
  // um cabeçalho vazio só com o nome.
  const hasBranding = !!logoDataUri || !!branding.primaryColor;

  return {
    companyName: branding.companyName,
    logoDataUri,
    palette,
    hasBranding,
  };
}

/**
 * Cabeçalho de marca — apenas a logo.
 *
 * Sem logo não emitimos nada: uma empresa que configurou só a cor
 * ganharia uma barra vazia no topo. As cores continuam sendo aplicadas
 * no resto do documento normalmente.
 */
export function renderBrandingHeader(branding: DocumentBranding): string {
  if (!branding.hasBranding || !branding.logoDataUri) return "";
  return `<div class="brand-header"><img class="brand-logo" src="${branding.logoDataUri}" alt="" /></div>`;
}

/** CSS do cabeçalho de marca. Vazio quando não há identidade. */
export function renderBrandingCss(branding: DocumentBranding): string {
  if (!branding.hasBranding) return "";
  const { primary } = branding.palette;
  return `
  .brand-header { display: flex; align-items: center; padding-bottom: 12px; margin-bottom: 18px; border-bottom: 3px solid ${primary}; }
  .brand-logo { max-height: 56px; max-width: 260px; object-fit: contain; }
`;
}
