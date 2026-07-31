import { z } from "zod";

import {
  jsonError,
  requireUserWithCompanyOr401,
} from "@/app/api/_lib/api-helpers";
import { buildContractHtml } from "@/lib/contracts/build-html";
import { readContractPdf } from "@/lib/contracts/archive";
import { generatePdfFromHtml } from "@/lib/integrations/pdf";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
// Pode cair no caminho de regeração (Puppeteer + Chromium cold start).
export const maxDuration = 60;

/** Nome de arquivo seguro a partir do nome do paciente. */
function slugify(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "contrato"
  );
}

/**
 * Serve o PDF do contrato para visualizar/imprimir/baixar.
 *
 * Duas origens, nesta ordem:
 *   1. Arquivo guardado no envio (`contract_pdf_path`) — é exatamente o
 *      documento que o paciente recebeu.
 *   2. Regeração sob demanda — para os contratos enviados antes de
 *      existir o acervo. Sai do mesmo builder, então reflete os dados
 *      atuais da proposta e do template.
 *
 * `?download=1` força download em vez de abrir no navegador.
 * O header `X-Contract-Source` diz qual dos dois caminhos foi usado.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ propostaId: string }> },
) {
  const auth = await requireUserWithCompanyOr401();
  if (!auth.ok) return auth.response;

  const { propostaId } = await params;
  if (!z.string().uuid().safeParse(propostaId).success) {
    return jsonError("Id de proposta inválido", 422);
  }

  const admin = createAdminClient();
  const result = await admin
    .from("propostas")
    .select("*")
    .eq("id", propostaId)
    .maybeSingle();
  const proposta = result.data as Record<string, unknown> | null;
  if (!proposta) return jsonError("Proposta não encontrada", 404);
  if (proposta.company_id !== auth.user.companyId) {
    return jsonError("Acesso negado a esta proposta", 403);
  }

  const archivedPath = (proposta.contract_pdf_path as string | null) ?? null;
  let pdf = archivedPath ? await readContractPdf(archivedPath) : null;
  let source = pdf ? "archived" : "regenerated";

  if (!pdf) {
    const built = await buildContractHtml({
      propostaId,
      companyId: auth.user.companyId,
    });
    if (!built.ok) return jsonError(built.error, built.status);
    try {
      pdf = await generatePdfFromHtml(built.value.html);
    } catch (err) {
      return jsonError(
        `Falha ao gerar PDF: ${err instanceof Error ? err.message : String(err)}`,
        500,
      );
    }
    source = "regenerated";
  }

  if (!pdf || pdf.byteLength === 0) {
    return jsonError("Não foi possível produzir o PDF do contrato", 500);
  }

  const url = new URL(req.url);
  const disposition = url.searchParams.get("download") === "1"
    ? "attachment"
    : "inline";
  const filename = `contrato-${slugify(
    (proposta.paciente_nome as string) ?? "",
  )}.pdf`;

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${filename}"`,
      // Contrato tem CPF e dados clínicos — nunca em cache compartilhado.
      "Cache-Control": "private, no-store",
      "X-Contract-Source": source,
    },
  });
}
