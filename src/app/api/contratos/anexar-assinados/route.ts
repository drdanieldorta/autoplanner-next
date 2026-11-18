import { NextResponse } from "next/server";
import { z } from "zod";

import {
  jsonError,
  requireUserWithCompanyOr401,
} from "@/app/api/_lib/api-helpers";
import { anexarProximoLote } from "@/lib/contracts/anexo-em-lote";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BodySchema = z.object({
  /** O envio é irreversível: a tela só chama depois da confirmação. */
  confirmar: z.literal(true),
  tentados: z.array(z.string().uuid()).max(5000).default([]),
});

/**
 * Envia ao prontuário da Feegow, em lotes, os contratos assinados que ainda
 * não estão lá (`contratosAssinadosForaDoProntuario`). Chamado em sequência
 * pelo card de Configurações até `restantes` chegar a zero. Só administrador.
 */
export async function POST(req: Request) {
  const auth = await requireUserWithCompanyOr401();
  if (!auth.ok) return auth.response;
  if (!auth.user.isAdmin) return jsonError("Acesso restrito a administradores", 403);

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return jsonError("Confirme o envio antes de continuar", 422);
  }

  try {
    const resultado = await anexarProximoLote({
      companyId: auth.user.companyId,
      jaTentados: body.tentados,
    });
    return NextResponse.json({ ok: true, ...resultado });
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Falha ao enviar ao prontuário",
      500,
    );
  }
}
