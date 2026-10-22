import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Instante da assinatura mais recente registrada pelo webhook da Autentique
 * para a empresa — sinal de vida do webhook na tela de Configurações.
 *
 * `null` = nenhuma proposta da empresa tem `contract_signed_at`. Lança se a
 * consulta falhar: quem chama decide como mostrar "não sei", para não
 * confundir com "nunca recebeu".
 */
export async function getUltimaAssinaturaRecebida(args: {
  companyId: string;
}): Promise<string | null> {
  const supabase = await createClient();
  const result = await supabase
    .from("propostas")
    .select("contract_signed_at")
    .eq("company_id", args.companyId)
    .not("contract_signed_at", "is", null)
    .order("contract_signed_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  const row = result.data as { contract_signed_at: string | null } | null;
  return row?.contract_signed_at ?? null;
}
