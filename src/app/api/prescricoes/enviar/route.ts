import { NextResponse } from "next/server";
import { z } from "zod";

import {
  jsonError,
  requireUserWithCompanyOr401,
} from "@/app/api/_lib/api-helpers";
import { getDocumentBranding } from "@/lib/branding/document";
import { getCompanyCredentials } from "@/lib/integrations/credentials";
import { feegow, FeegowError } from "@/lib/integrations/feegow";
import { generatePdfFromHtml } from "@/lib/integrations/pdf";
import {
  footerTemplateFor,
  renderFolhaExecucao,
} from "@/lib/prescricao/templates/default-execucao";
import type { RevisaoRegistro } from "@/lib/prescricao/types";
import {
  getSnapshot,
  loadPrescricaoFonte,
  marcarEnvioConcluido,
  marcarEnvioFalhou,
  marcarEnvioIniciado,
  planHash,
} from "@/lib/services/prescricoes";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * ANEXA a folha ao prontuário Feegow. Ato explícito e irreversível.
 *
 * ── Por que este endpoint e não outro ────────────────────────────────
 * A API da Feegow NÃO tem escrita estruturada de prescrição.
 * `/medical-record/prescription`, `/medical-record/diagnosis` e
 * `/medical-record/timeline` são todos GET-only; não existe POST/PUT/PATCH
 * sob `/medical-record/*` em nenhum dos ~99 endpoints documentados.
 * `/medical-reports/create` exige `agendamento_id` obrigatório, que não
 * existe no momento do orçamento. Sobra `POST /patient/upload-base64`.
 * Não refazer esta investigação.
 *
 * ── Renderiza do SNAPSHOT, nunca reprojeta ───────────────────────────
 * O que vai ao prontuário é exatamente o que foi revisado. Reprojetar aqui
 * pegaria o protocolo de HOJE — e `updateProtocol` faz delete-then-insert
 * dos itens, então o conteúdo pode ter mudado entre a revisão e o clique.
 *
 * ── Revisão ──────────────────────────────────────────────────────────
 * Só existe como fato do prontuário. Incrementa quando um conteúdo DIFERENTE
 * do último anexado é arquivado. Gerar e editar não incrementam nada.
 */

const BodySchema = z.object({
  proposta_id: z.string().uuid(),
  /**
   * Confirma o envio mesmo com um envio in-flight recente, cujo anexo pode
   * já existir no prontuário. Só o usuário pode decidir isso — nós não temos
   * como consultar: a Feegow não expõe listagem de anexos.
   */
  confirmar_duplicata: z.boolean().optional().default(false),
});

const MAX_PDF_BYTES = 2 * 1024 * 1024;
const INFLIGHT_MS = 5 * 60 * 1000;

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

  const fonte = await loadPrescricaoFonte({
    propostaId: body.proposta_id,
    companyId: auth.user.companyId,
  });
  if ("error" in fonte) return jsonError(fonte.error, fonte.status);

  const { anterior } = fonte;

  const snapshot = await getSnapshot({
    propostaId: fonte.propostaId,
    companyId: fonte.companyId,
  });
  if (!snapshot) {
    return jsonError(
      "A folha ainda não foi gerada. Gere e revise antes de enviar.",
      409,
    );
  }

  const hash = anterior.hash ?? planHash(snapshot);

  // ── Nada mudou desde o último envio ─────────────────────────────────
  if (hash === anterior.hashEnviado && !body.confirmar_duplicata) {
    return NextResponse.json({
      ok: true,
      feegow: "skipped_unchanged",
      revisao: anterior.revisao,
      enviado_em: anterior.feegowEm,
    });
  }

  // ── Envio in-flight: o anexo PODE já existir ────────────────────────
  // Se o lambda morreu entre o upload e o UPDATE, o prontuário tem o
  // arquivo e o banco não sabe. Reenviar às cegas duplicaria, e não há
  // delete na Feegow para corrigir.
  if (
    !body.confirmar_duplicata &&
    anterior.envioIniciadoEm &&
    Date.now() - new Date(anterior.envioIniciadoEm).getTime() < INFLIGHT_MS
  ) {
    return NextResponse.json(
      {
        ok: false,
        feegow: "envio_em_andamento",
        error:
          "Um envio foi iniciado há pouco e não confirmou. A folha pode já estar no prontuário — confira lá antes de reenviar.",
      },
      { status: 409 },
    );
  }

  const creds = await getCompanyCredentials(auth.user.companyId);
  if (!creds?.feegow_token) {
    return jsonError("Feegow não configurada para esta empresa", 400);
  }
  if (!fonte.pacienteId || fonte.pacienteId === "manual") {
    return jsonError(
      "Paciente digitado à mão não tem prontuário na Feegow. Use o PDF para impressão.",
      400,
    );
  }

  // Revisão definitiva: só agora, e só porque algo novo vai ser arquivado.
  const revisao = anterior.hashEnviado ? anterior.revisao + 1 : 0;
  const planoFinal = { ...snapshot, revisao };

  const branding = await getDocumentBranding(auth.user.companyId);

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generatePdfFromHtml(
      renderFolhaExecucao(planoFinal, { branding }),
      {
        displayHeaderFooter: true,
        headerTemplate: "<div></div>",
        footerTemplate: footerTemplateFor(planoFinal),
        margin: { top: "12mm", right: "0mm", bottom: "14mm", left: "0mm" },
      },
    );
  } catch (err) {
    return jsonError(
      `Falha ao gerar PDF: ${err instanceof Error ? err.message : String(err)}`,
      500,
    );
  }

  // `PDF_DISABLE=1` (CI) devolve buffer vazio — sem esta guarda subiríamos
  // um PDF de 0 byte ao prontuário de um paciente real.
  if (pdfBuffer.length === 0) {
    return jsonError("Geração de PDF desabilitada neste ambiente", 503);
  }
  if (pdfBuffer.length > MAX_PDF_BYTES) {
    return jsonError(
      `PDF grande demais (${Math.round(pdfBuffer.length / 1024)} KB).`,
      413,
    );
  }

  // Descrição SEM o nome do protocolo: ela aparece na listagem de arquivos
  // do prontuário, e nomes de protocolo podem revelar diagnóstico
  // (LGPD art. 6 — dados sensíveis de saúde).
  const descricao =
    `Cronograma de aplicações - Proposta ${planoFinal.proposta_ref}` +
    (revisao > 0 ? ` (rev. ${revisao})` : "");

  await marcarEnvioIniciado({
    propostaId: fonte.propostaId,
    companyId: fonte.companyId,
  });

  try {
    await feegow(creds.feegow_token).uploadBase64ToPatient({
      paciente_id: fonte.pacienteId,
      base64: `data:application/pdf;base64,${pdfBuffer.toString("base64")}`,
      arquivo_descricao: descricao,
    });
  } catch (err) {
    const msg =
      err instanceof FeegowError || err instanceof Error
        ? err.message
        : "Erro desconhecido no upload";
    await marcarEnvioFalhou({
      propostaId: fonte.propostaId,
      companyId: fonte.companyId,
      erro: msg,
    });
    return NextResponse.json(
      {
        ok: false,
        feegow: "falhou",
        error: `Não foi possível anexar ao prontuário: ${msg}`,
      },
      { status: 502 },
    );
  }

  const revisoes: RevisaoRegistro[] = [
    ...anterior.revisoes,
    {
      revisao,
      hash,
      gerado_em: planoFinal.gerado_em,
      gerado_por: auth.user.id ?? null,
      feegow_em: null,
    },
  ];
  await marcarEnvioConcluido({
    propostaId: fonte.propostaId,
    companyId: fonte.companyId,
    revisao,
    hash,
    revisoes,
  });

  return NextResponse.json({ ok: true, feegow: "enviado", revisao });
}
