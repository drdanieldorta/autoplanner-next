import { NextResponse } from "next/server";
import { z } from "zod";

import {
  jsonError,
  requireUserWithCompanyOr401,
} from "@/app/api/_lib/api-helpers";
import { anexarContratoAssinadoNaFeegow } from "@/lib/contracts/feegow-anexo";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  /** Reenviar um envio que começou e nunca confirmou (pode já estar lá). */
  confirmar_duplicata: z.boolean().optional().default(false),
});

/**
 * Botão "Enviar ao prontuário" do card do contrato: anexa o contrato
 * ASSINADO ao prontuário da Feegow quando o automático (webhook da
 * Autentique) falhou ou não existia na época da assinatura.
 *
 * Ato explícito de quem clica — a Feegow não tem delete de anexo. Confirma
 * na Autentique que o documento está assinado antes de enviar e usa a
 * mesma trava do automático (`lib/contracts/feegow-anexo.ts`).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ propostaId: string }> },
) {
  const auth = await requireUserWithCompanyOr401();
  if (!auth.ok) return auth.response;

  const { propostaId } = await params;
  if (!z.string().uuid().safeParse(propostaId).success) {
    return jsonError("Id de proposta inválido", 422);
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json().catch(() => ({})));
  } catch {
    return jsonError("Payload inválido", 422);
  }

  const r = await anexarContratoAssinadoNaFeegow({
    propostaId,
    companyId: auth.user.companyId,
    confirmarDuplicata: body.confirmar_duplicata,
  });

  switch (r.status) {
    case "anexado":
    case "ja_anexado":
      return NextResponse.json({ ok: true, status: r.status, em: r.em });
    case "nao_aplicavel":
      return jsonError(r.motivo, 400);
    case "nao_assinado":
      return jsonError("O contrato ainda não foi assinado por todos.", 409);
    case "em_andamento":
      return jsonError(
        "Um envio deste contrato ao prontuário está em andamento. Aguarde alguns minutos.",
        409,
      );
    case "em_duvida":
      return NextResponse.json(
        {
          ok: false,
          status: "em_duvida",
          error:
            "Um envio começou e não confirmou. O contrato pode já estar no prontuário: confira lá antes de reenviar.",
        },
        { status: 409 },
      );
    case "erro":
      return jsonError(r.mensagem, 502);
  }
}
