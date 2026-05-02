import { NextResponse } from "next/server";

import {
  jsonError,
  requireUserWithCompanyOr401,
} from "@/app/api/_lib/api-helpers";
import { feegow, FeegowError } from "@/lib/integrations/feegow";
import { getCompanyCredentials } from "@/lib/integrations/credentials";

export const dynamic = "force-dynamic";

/**
 * Substitui o webhook n8n `POST /webhook/lovable/procedimentos`.
 * Auth via cookie do user. Token Feegow vem do `api_credentials`
 * da empresa do user (admin client server-side).
 */
export async function POST() {
  const auth = await requireUserWithCompanyOr401();
  if (!auth.ok) return auth.response;

  const creds = await getCompanyCredentials(auth.user.companyId);
  if (!creds?.feegow_token) {
    return jsonError("Feegow não configurada para esta empresa", 400);
  }

  try {
    const procedimentos = await feegow(creds.feegow_token).listProcedures();
    return NextResponse.json(procedimentos);
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
