import { NextResponse } from "next/server";

import {
  jsonError,
  requireUserOr401,
} from "@/app/api/_lib/api-helpers";
import { helena, HelenaError } from "@/lib/integrations/helena";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Substitui o webhook n8n `POST /webhook/vincular-empresa-crm` com
 * `action: "list"`. Retorna empresas ativas no CRM Helena.
 *
 * Apenas super_admin: usa `crm_admin_token` se disponível na empresa
 * default, senão tenta `crm_token`.
 */
export async function GET() {
  const auth = await requireUserOr401();
  if (!auth.ok) return auth.response;
  if (!auth.user.isSuperAdmin) {
    return jsonError("Acesso restrito a super admins", 403);
  }

  // Procura um crm_admin_token em qualquer empresa (super_admin não tem
  // company_id próprio). Se não existir, falha.
  const admin = createAdminClient();
  const tokenResult = await admin
    .from("api_credentials")
    .select("crm_admin_token, crm_token")
    .or("crm_admin_token.not.is.null,crm_token.not.is.null")
    .limit(1)
    .maybeSingle();
  const tokens = tokenResult.data as {
    crm_admin_token: string | null;
    crm_token: string | null;
  } | null;
  const token = tokens?.crm_admin_token ?? tokens?.crm_token;

  if (!token) {
    // Fallback: se um companyId foi passado como query param, usa o token daquela empresa
    return jsonError(
      "Nenhuma empresa tem crm_admin_token ou crm_token configurado",
      400,
    );
  }

  try {
    const companies = await helena(token).listCompanies();
    return NextResponse.json(companies);
  } catch (err) {
    if (err instanceof HelenaError) {
      return jsonError(err.message, err.status >= 400 ? 502 : 500);
    }
    return jsonError(
      err instanceof Error ? err.message : "Erro ao chamar Helena",
      500,
    );
  }
}

