import { NextResponse } from "next/server";

import {
  jsonError,
  requireUserWithCompanyOr401,
} from "@/app/api/_lib/api-helpers";
import { FeegowError } from "@/lib/integrations/feegow";
import { getCompanyCredentials } from "@/lib/integrations/credentials";
import {
  listAllFeegowPatients,
  searchFeegowPatients,
} from "@/lib/services/feegow-patients";
import { feegowPatientToOption } from "@/lib/services/orcamento-form-data";

export const dynamic = "force-dynamic";

function erro(err: unknown) {
  if (err instanceof FeegowError) {
    return jsonError(err.message, err.status >= 400 ? 502 : 500);
  }
  return jsonError(
    err instanceof Error ? err.message : "Erro ao chamar Feegow",
    500,
  );
}

/**
 * Busca conforme digita do dropdown de paciente em `/orcamentos/novo`
 * (origem Feegow). A Feegow não filtra por nome, então a busca roda sobre a
 * lista completa da clínica, mantida em memória por alguns minutos (ver
 * `lib/services/feegow-patients.ts`). Devolve uma página no shape do
 * dropdown, igual a `GET /api/crm/pacientes`.
 */
export async function GET(req: Request) {
  const auth = await requireUserWithCompanyOr401();
  if (!auth.ok) return auth.response;

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 100);

  const creds = await getCompanyCredentials(auth.user.companyId);
  if (!creds?.feegow_token) {
    return jsonError("Feegow não configurada para esta empresa", 400);
  }

  try {
    const page = await searchFeegowPatients({
      companyId: auth.user.companyId,
      token: creds.feegow_token,
      q,
    });
    // Dados de paciente — nunca em cache compartilhado.
    return NextResponse.json(
      { items: page.items.map(feegowPatientToOption), hasMore: page.hasMore },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return erro(err);
  }
}

/**
 * Substitui o webhook n8n `POST /webhook/lovable/pacientes`: a lista
 * inteira, no shape antigo. Antes tinha teto de 1500 pacientes (como o
 * n8n); agora pagina até o fim.
 */
export async function POST() {
  const auth = await requireUserWithCompanyOr401();
  if (!auth.ok) return auth.response;

  const creds = await getCompanyCredentials(auth.user.companyId);
  if (!creds?.feegow_token) {
    return jsonError("Feegow não configurada para esta empresa", 400);
  }

  try {
    const pacientes = await listAllFeegowPatients({
      companyId: auth.user.companyId,
      token: creds.feegow_token,
    });
    return NextResponse.json(pacientes, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return erro(err);
  }
}
