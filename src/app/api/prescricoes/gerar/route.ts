import { NextResponse } from "next/server";
import { z } from "zod";

import {
  jsonError,
  requireUserWithCompanyOr401,
} from "@/app/api/_lib/api-helpers";
import { getDocumentBranding } from "@/lib/branding/document";
import { generatePdfFromHtml } from "@/lib/integrations/pdf";
import { avisosDoPlano, isDataValida } from "@/lib/prescricao/project";
import {
  footerTemplateFor,
  renderFolhaExecucao,
} from "@/lib/prescricao/templates/default-execucao";
import {
  loadPrescricaoFonte,
  planHash,
  salvarSnapshot,
} from "@/lib/services/prescricoes";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GERA a folha de execução e congela o snapshot. **NUNCA envia à Feegow.**
 *
 * Essa separação é o ponto central do desenho (decisão 2026-07-31): gerar é
 * barato, reversível e pode acontecer automaticamente; ANEXAR ao prontuário é
 * irreversível — a Feegow não expõe delete nem replace de anexo — e por isso
 * exige um ato humano explícito, depois de alguém ter olhado o documento.
 * O envio vive em `POST /api/prescricoes/enviar`.
 *
 * Chamada em dois momentos:
 *   1. automaticamente, encadeada ao envio do contrato;
 *   2. ao salvar ajustes na tela `/orcamentos/[id]/cronograma`.
 *
 * Regenerar NÃO incrementa revisão: revisão é um fato do prontuário e só
 * existe quando algo foi efetivamente anexado.
 */

const BodySchema = z.object({
  proposta_id: z.string().uuid(),
  /** Só vale na PRIMEIRA geração — depois `prescricao_inicio` manda. */
  inicio: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar em yyyy-MM-dd")
    .optional(),
});

/** Base64 infla ~33%, então 2 MB crus ≈ 2,7 MB no fio. */
const MAX_PDF_BYTES = 2 * 1024 * 1024;

export async function POST(req: Request) {
  const auth = await requireUserWithCompanyOr401();
  if (!auth.ok) return auth.response;

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Payload inválido", 422);
    }
    return jsonError("Payload inválido", 422);
  }

  if (body.inicio && !isDataValida(body.inicio)) {
    return jsonError("Data de início inválida", 422);
  }

  const fonte = await loadPrescricaoFonte({
    propostaId: body.proposta_id,
    companyId: auth.user.companyId,
    inicioOverride: body.inicio,
  });
  if ("error" in fonte) return jsonError(fonte.error, fonte.status);

  const { plano, ajustes, anterior } = fonte;
  const hash = planHash(plano);
  const avisos = avisosDoPlano(plano, ajustes, {
    alinharSemana: fonte.alinharSemana,
  });

  // O plano carrega a revisão JÁ ANEXADA — é o número que o documento deve
  // exibir enquanto o conteúdo atual não for arquivado.
  const planoFinal = { ...plano, revisao: anterior.revisao };

  const branding = await getDocumentBranding(auth.user.companyId);

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generatePdfFromHtml(
      renderFolhaExecucao(planoFinal, { branding }),
      {
        displayHeaderFooter: true,
        headerTemplate: "<div></div>",
        footerTemplate: footerTemplateFor(planoFinal),
        margin: { top: "14mm", right: "12mm", bottom: "18mm", left: "12mm" },
      },
    );
  } catch (err) {
    return jsonError(
      `Falha ao gerar PDF: ${err instanceof Error ? err.message : String(err)}`,
      500,
    );
  }

  if (pdfBuffer.length > MAX_PDF_BYTES) {
    return jsonError(
      `PDF grande demais (${Math.round(pdfBuffer.length / 1024)} KB). Reduza o número de itens do protocolo.`,
      413,
    );
  }

  try {
    await salvarSnapshot({
      propostaId: fonte.propostaId,
      companyId: fonte.companyId,
      plano: planoFinal,
      hash,
      userId: auth.user.id ?? null,
      inicio: planoFinal.inicio,
    });
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Falha ao salvar a folha",
      500,
    );
  }

  return NextResponse.json({
    ok: true,
    hash,
    revisao: anterior.revisao,
    /** True quando o conteúdo difere do que já está no prontuário. */
    pendente_envio: hash !== anterior.hashEnviado,
    ja_enviada: Boolean(anterior.hashEnviado),
    total_sessoes: planoFinal.total_sessoes,
    inicio: planoFinal.inicio,
    ultima_data: planoFinal.ultima_data,
    avisos,
  });
}
