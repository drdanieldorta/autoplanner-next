import { NextResponse } from "next/server";

import {
  jsonError,
  requireUserWithCompanyOr401,
} from "@/app/api/_lib/api-helpers";
import { feegow, FeegowError } from "@/lib/integrations/feegow";
import { getCompanyCredentials } from "@/lib/integrations/credentials";

export const dynamic = "force-dynamic";

/**
 * Substitui o webhook n8n `POST /webhook/lovable/pacientes`.
 *
 * ⚠️ Hard-cap de 1500 pacientes (mesmo do n8n). Quando vier demanda
 * real para clínicas grandes, trocar por busca paginada com `?search=`
 * (depende da API Feegow suportar — confirmar). Ver N8N.md ficha 3.
 */
export async function POST() {
  const auth = await requireUserWithCompanyOr401();
  if (!auth.ok) return auth.response;

  const creds = await getCompanyCredentials(auth.user.companyId);
  if (!creds?.feegow_token) {
    return jsonError("Feegow não configurada para esta empresa", 400);
  }

  try {
    const pacientes = await feegow(creds.feegow_token).listPatients();
    return NextResponse.json(pacientes);
  } catch (err) {
    if (err instanceof FeegowError) {
      return jsonError(err.message, err.status >= 400 ? 502 : 500);
    }
    return jsonError(
      err instanceof Error ? err.message : "Erro ao chamar Feegow",
      500,
    );
  }
}
