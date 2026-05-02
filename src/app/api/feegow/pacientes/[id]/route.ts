import { NextResponse } from "next/server";

import {
  jsonError,
  requireUserWithCompanyOr401,
} from "@/app/api/_lib/api-helpers";
import { feegow, FeegowError } from "@/lib/integrations/feegow";
import { getCompanyCredentials } from "@/lib/integrations/credentials";

export const dynamic = "force-dynamic";

/**
 * Busca um paciente Feegow por id. Usado pelo OrcamentoForm para
 * preencher CPF — que `/patient/list` (dropdown) NÃO retorna, mas
 * `/patient/search` retorna.
 *
 * O retorno é mínimo: só os campos que precisamos no form e que não
 * vêm na listagem.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireUserWithCompanyOr401();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  const creds = await getCompanyCredentials(auth.user.companyId);
  if (!creds?.feegow_token) {
    return jsonError("Feegow não configurada para esta empresa", 400);
  }

  try {
    const data = await feegow(creds.feegow_token).searchPatient(id);
    if (!data) {
      // searchPatient log em console.error o raw — vai pro runtime log da Vercel.
      // 502 sinaliza falha downstream em vez de "não encontrado" (que é 404).
      return jsonError(
        "Resposta inesperada da Feegow ao buscar paciente",
        502,
      );
    }
    return NextResponse.json({ cpf: data.cpf });
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
