import { NextResponse } from "next/server";
import { z } from "zod";

import {
  jsonError,
  requireUserWithCompanyOr401,
} from "@/app/api/_lib/api-helpers";
import { feegow, FeegowError } from "@/lib/integrations/feegow";
import { getCompanyCredentials } from "@/lib/integrations/credentials";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  status_id: z.number().int().positive(),
  status: z.string().optional(),
});

/**
 * Substitui o webhook n8n `POST /webhook/change-status-proposta`.
 * Recebe `id` UUID local da proposta. Resolve `id_proposta_api` (Feegow)
 * e atualiza nos dois lugares se a proposta tiver vínculo Feegow.
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireUserWithCompanyOr401();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Payload inválido", 422);
    }
    return jsonError("Payload inválido", 422);
  }

  const admin = createAdminClient();

  // Busca proposta para validar empresa e pegar id_proposta_api
  const propostaResult = await admin
    .from("propostas")
    .select("id, company_id, id_proposta_api")
    .eq("id", id)
    .maybeSingle();
  const proposta = propostaResult.data as {
    id: string;
    company_id: string;
    id_proposta_api: number | null;
  } | null;
  if (!proposta) return jsonError("Proposta não encontrada", 404);
  if (proposta.company_id !== auth.user.companyId) {
    return jsonError("Acesso negado a esta proposta", 403);
  }

  // Se tem id_proposta_api e webhook_enabled, atualiza Feegow primeiro
  if (proposta.id_proposta_api) {
    const creds = await getCompanyCredentials(auth.user.companyId);
    if (creds?.feegow_token && creds.webhook_enabled !== false) {
      try {
        await feegow(creds.feegow_token).changeProposalStatus({
          proposal_id: proposta.id_proposta_api,
          status_id: body.status_id,
        });
      } catch (err) {
        if (err instanceof FeegowError) {
          return jsonError(
            `Falha ao atualizar status na Feegow: ${err.message}`,
            502,
          );
        }
        return jsonError(
          err instanceof Error ? err.message : "Erro Feegow",
          500,
        );
      }
    }
  }

  // Atualiza status local
  const updateResult = await admin
    .from("propostas")
    .update({
      status_id: body.status_id,
      status: body.status ?? null,
    } as never)
    .eq("id", id)
    .eq("company_id", auth.user.companyId);

  if (updateResult.error) return jsonError(updateResult.error.message, 500);

  return NextResponse.json({ ok: true });
}
