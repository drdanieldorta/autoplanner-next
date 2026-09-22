import { NextResponse } from "next/server";

import {
  jsonError,
  requireUserWithCompanyOr401,
} from "@/app/api/_lib/api-helpers";
import { getCompanyCredentials } from "@/lib/integrations/credentials";
import { HelenaError } from "@/lib/integrations/helena";
import { searchCrmPatients } from "@/lib/services/orcamento-form-data";

export const dynamic = "force-dynamic";

/**
 * Busca conforme digita do dropdown de paciente em `/orcamentos/novo`, no
 * modo sem Feegow. Repassa `q` como `textFilter` ao CRM (contatos com a
 * etiqueta "Paciente") e devolve a primeira página já no shape do dropdown.
 *
 * Usa o `crm_token` da empresa do usuário logado — o token já delimita a
 * conta do CRM, não há filtro por empresa a fazer aqui.
 */
export async function GET(req: Request) {
  const auth = await requireUserWithCompanyOr401();
  if (!auth.ok) return auth.response;

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 100);

  const creds = await getCompanyCredentials(auth.user.companyId);
  if (!creds?.crm_token) {
    return jsonError("CRM não configurado para esta empresa", 400);
  }

  try {
    const page = await searchCrmPatients(creds.crm_token, q);
    // Dados de paciente — nunca em cache compartilhado.
    return NextResponse.json(page, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    if (err instanceof HelenaError) {
      return jsonError(err.message, err.status >= 400 ? 502 : 500);
    }
    return jsonError(
      err instanceof Error ? err.message : "Erro ao chamar o CRM",
      500,
    );
  }
}
