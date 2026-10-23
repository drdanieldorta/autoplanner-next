import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

type ApiCredentialsRow =
  Database["public"]["Tables"]["api_credentials"]["Row"];

/**
 * Tokens reais de uma empresa. Use SOMENTE em Route Handlers / Server
 * Actions / lib server-side, depois de validar autenticação do user.
 *
 * Lê via service_role (bypassa RLS) porque `company_user` não tem acesso
 * a `api_credentials` mesmo sendo da empresa — RLS atual permite só
 * super_admin e company_admin. Mas o user precisa do token Feegow para
 * usar a integração. Por isso o admin client.
 *
 * Caller é responsável por validar que o user pode falar pela empresa.
 */
export async function getCompanyCredentials(
  companyId: string,
): Promise<ApiCredentialsRow | null> {
  const admin = createAdminClient();
  const result = await admin
    .from("api_credentials")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();
  if (result.error && result.error.code !== "PGRST116") {
    throw new Error(result.error.message);
  }
  return (result.data ?? null) as ApiCredentialsRow | null;
}

/**
 * Busca a proposta a partir do document_id Authentique. Usado pelo
 * callback `/webhooks/authentique` para resolver company + paciente_id +
 * id_proposta_api a partir do evento de assinatura.
 */
export async function getPropostaByDocumentId(documentId: string): Promise<{
  id: string;
  company_id: string;
  id_proposta_api: number | null;
  user_id: string;
  paciente_nome: string;
  paciente_id: string;
} | null> {
  const admin = createAdminClient();
  const result = await admin
    .from("propostas")
    .select("id, company_id, id_proposta_api, user_id, paciente_nome, paciente_id")
    .eq("document_id", documentId)
    .maybeSingle();
  if (result.error && result.error.code !== "PGRST116") {
    throw new Error(result.error.message);
  }
  return (
    result.data as {
      id: string;
      company_id: string;
      id_proposta_api: number | null;
      user_id: string;
      paciente_nome: string;
      paciente_id: string;
    } | null
  );
}
