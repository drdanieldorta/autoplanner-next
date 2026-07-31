import {
  jsonError,
  requireUserWithCompanyOr401,
} from "@/app/api/_lib/api-helpers";
import { getDocumentBranding } from "@/lib/branding/document";
import { generatePdfFromHtml } from "@/lib/integrations/pdf";
import {
  footerTemplateFor,
  renderFolhaExecucao,
} from "@/lib/prescricao/templates/default-execucao";
import { getSnapshot, loadPrescricaoFonte } from "@/lib/services/prescricoes";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Devolve o PDF da folha de execução para visualização/impressão.
 *
 * `[id]` é o id da PROPOSTA.
 *
 * Duas fontes, e a distinção importa:
 *  - Com snapshot: re-renderiza EXATAMENTE o que foi congelado. Nunca
 *    reprojeta. É a única forma de reproduzir o que está no prontuário,
 *    já que `updateProtocol` faz delete-then-insert dos itens e reprojetar
 *    devolveria o protocolo de hoje, não o que foi contratado.
 *  - Sem snapshot: projeta ao vivo e marca "PRÉVIA" na página, para o
 *    usuário conferir antes de emitir.
 *
 * Não toca na Feegow e não grava nada.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireUserWithCompanyOr401();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  const snapshot = await getSnapshot({
    propostaId: id,
    companyId: auth.user.companyId,
  });

  let plano = snapshot;
  let previa = false;

  if (!plano) {
    const fonte = await loadPrescricaoFonte({
      propostaId: id,
      companyId: auth.user.companyId,
    });
    if ("error" in fonte) return jsonError(fonte.error, fonte.status);
    plano = fonte.plano;
    previa = true;
  }

  const branding = await getDocumentBranding(auth.user.companyId);

  let pdf: Buffer;
  try {
    pdf = await generatePdfFromHtml(renderFolhaExecucao(plano, { previa, branding }), {
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: footerTemplateFor(plano),
      margin: { top: "12mm", right: "0mm", bottom: "14mm", left: "0mm" },
    });
  } catch (err) {
    return jsonError(
      `Falha ao gerar PDF: ${err instanceof Error ? err.message : String(err)}`,
      500,
    );
  }

  if (pdf.length === 0) {
    return jsonError("Geração de PDF desabilitada neste ambiente", 503);
  }

  const nome = `Cronograma - ${plano.paciente.nome || "paciente"}${previa ? " (previa)" : ` - rev${plano.revisao}`}.pdf`;

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nome.replace(/["\\]/g, "")}"`,
      "Cache-Control": "no-store",
    },
  });
}
