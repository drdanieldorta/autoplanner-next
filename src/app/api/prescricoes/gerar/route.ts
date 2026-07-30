import { NextResponse } from "next/server";
import { z } from "zod";

import {
  jsonError,
  requireUserWithCompanyOr401,
} from "@/app/api/_lib/api-helpers";
import { feegow, FeegowError } from "@/lib/integrations/feegow";
import { getCompanyCredentials } from "@/lib/integrations/credentials";
import { generatePdfFromHtml } from "@/lib/integrations/pdf";
import { avisosDoPlano, isDataValida } from "@/lib/prescricao/project";
import {
  footerTemplateFor,
  renderFolhaExecucao,
} from "@/lib/prescricao/templates/default-execucao";
import {
  loadPrescricaoFonte,
  marcarEnvioConcluido,
  marcarEnvioFalhou,
  marcarEnvioIniciado,
  planHash,
  salvarSnapshot,
} from "@/lib/services/prescricoes";

export const dynamic = "force-dynamic";
// Mesmo orçamento de tempo de `envio-manual`: cold start do Chromium +
// render + upload passa folgadamente dos 10s default da Vercel Hobby.
export const maxDuration = 60;

/**
 * Gera a folha de execução de enfermagem e a anexa ao prontuário Feegow.
 *
 * ── Por que este endpoint e não outro ────────────────────────────────
 * A API da Feegow NÃO tem escrita estruturada de prescrição.
 * `/medical-record/prescription`, `/medical-record/diagnosis` e
 * `/medical-record/timeline` são todos GET-only; não existe POST/PUT/PATCH
 * sob `/medical-record/*` em nenhum dos ~99 endpoints documentados.
 * `/medical-reports/create` exige `agendamento_id` obrigatório, que não
 * existe no momento do orçamento. Sobra `POST /patient/upload-base64`:
 * anexar um PDF é o único caminho. Não refazer esta investigação.
 *
 * ── Por que rota separada e não dentro de envio-manual ───────────────
 * Aquele handler já opera no teto de 60s do Hobby com um cold start de
 * Chromium + upload Authentique. `generatePdfFromHtml` abre e fecha um
 * browser inteiro por chamada, então um segundo PDF no mesmo invoke
 * transformaria a rota mais crítica do sistema na mais frágil.
 *
 * ── Ordem crítica ────────────────────────────────────────────────────
 * O snapshot é gravado ANTES da chamada à Feegow. Assim a folha sempre
 * existe e é baixável mesmo com a Feegow fora do ar, e a proposta cai na
 * fila de pendentes (`propostas_prescricao_pendente_idx`).
 */

const BodySchema = z.object({
  proposta_id: z.string().uuid(),
  /** Só vale na PRIMEIRA emissão — depois `prescricao_inicio` manda. */
  inicio: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar em yyyy-MM-dd")
    .optional(),
  /** Reprojeta e emite nova revisão, ignorando o curto-circuito de hash. */
  forcar: z.boolean().optional().default(false),
});

/** Limite conservador. Base64 infla ~33%, então 2 MB crus ≈ 2,7 MB no fio. */
const MAX_PDF_BYTES = 2 * 1024 * 1024;

/** Janela em que um envio in-flight ainda é considerado possivelmente vivo. */
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

  if (body.inicio && !isDataValida(body.inicio)) {
    return jsonError("Data de início inválida", 422);
  }

  const fonte = await loadPrescricaoFonte({
    propostaId: body.proposta_id,
    companyId: auth.user.companyId,
    inicioOverride: body.inicio,
  });
  if ("error" in fonte) return jsonError(fonte.error, fonte.status);

  const { plano, anterior } = fonte;
  const hash = planHash(plano);
  const avisos = avisosDoPlano(plano);

  const inalterado = anterior.hash === hash;

  // ── Curto-circuito de idempotência ──────────────────────────────────
  // Reclicar "Salvar e enviar contrato" não pode gerar um segundo anexo:
  // a Feegow não expõe delete nem replace.
  if (inalterado && anterior.feegowEm && !body.forcar) {
    return NextResponse.json({
      ok: true,
      feegow: "skipped_unchanged",
      revisao: anterior.revisao,
      hash,
      enviado_em: anterior.feegowEm,
      total_sessoes: plano.total_sessoes,
      inicio: plano.inicio,
      ultima_data: plano.ultima_data,
      avisos,
    });
  }

  // ── Guarda de envio in-flight ───────────────────────────────────────
  // Se um envio começou há pouco e não concluiu, o anexo PODE já existir
  // no prontuário — o lambda pode ter morrido entre o upload e o UPDATE.
  // Reenviar às cegas duplicaria. Exigimos confirmação explícita.
  if (
    inalterado &&
    !body.forcar &&
    anterior.envioIniciadoEm &&
    Date.now() - new Date(anterior.envioIniciadoEm).getTime() < INFLIGHT_MS
  ) {
    return NextResponse.json(
      {
        ok: false,
        feegow: "envio_em_andamento",
        error:
          "Um envio desta folha foi iniciado há pouco e não confirmou. Ela pode já estar no prontuário — confira antes de reenviar.",
        revisao: anterior.revisao,
      },
      { status: 409 },
    );
  }

  // Revisão definitiva: só agora, depois de saber se o conteúdo mudou.
  // (O hash canônico exclui `revisao` justamente para evitar circularidade.)
  const jaEmitiu = Boolean(anterior.geradaEm);
  const revisao = !jaEmitiu ? 0 : inalterado ? anterior.revisao : anterior.revisao + 1;
  const planoFinal = { ...plano, revisao };

  // ── PDF ──────────────────────────────────────────────────────────────
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generatePdfFromHtml(renderFolhaExecucao(planoFinal), {
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: footerTemplateFor(planoFinal),
      margin: { top: "12mm", right: "0mm", bottom: "14mm", left: "0mm" },
    });
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

  // Snapshot ANTES da Feegow — a folha existe mesmo se o upload falhar.
  try {
    await salvarSnapshot({
      propostaId: fonte.propostaId,
      companyId: fonte.companyId,
      plano: planoFinal,
      hash,
      revisao,
      userId: auth.user.id ?? null,
      inicio: planoFinal.inicio,
      revisoesAnteriores: anterior.revisoes,
    });
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Falha ao salvar a folha",
      500,
    );
  }

  const respostaBase = {
    ok: true as const,
    revisao,
    hash,
    total_sessoes: planoFinal.total_sessoes,
    inicio: planoFinal.inicio,
    ultima_data: planoFinal.ultima_data,
    avisos,
  };

  // `PDF_DISABLE=1` (usado para manter `next build` verde) devolve buffer
  // vazio. Sem esta guarda subiríamos um PDF de 0 byte a um prontuário real
  // caso a variável vazasse para produção.
  if (pdfBuffer.length === 0) {
    return NextResponse.json({
      ...respostaBase,
      feegow: "skipped_pdf_disabled",
    });
  }

  const creds = await getCompanyCredentials(auth.user.companyId);
  if (!creds?.feegow_token) {
    return NextResponse.json({ ...respostaBase, feegow: "skipped_sem_token" });
  }
  // Mesma condição já usada em envio-manual/route.ts: paciente digitado à
  // mão não tem prontuário na Feegow para receber anexo.
  if (!fonte.pacienteId || fonte.pacienteId === "manual") {
    return NextResponse.json({ ...respostaBase, feegow: "skipped_manual" });
  }

  // ── Upload ───────────────────────────────────────────────────────────
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
      err instanceof FeegowError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Erro desconhecido no upload";
    await marcarEnvioFalhou({
      propostaId: fonte.propostaId,
      companyId: fonte.companyId,
      erro: msg,
    });
    // 502 e erro PERSISTIDO — diferente do webhook Authentique, que engole
    // a falha do upload e devolve 200. A enfermagem confia no prontuário;
    // uma falha silenciosa aqui é pior que um erro visível.
    return NextResponse.json(
      { ...respostaBase, ok: false, feegow: "falhou", error: `Folha gerada, mas não foi anexada ao prontuário: ${msg}` },
      { status: 502 },
    );
  }

  const revisoesAtualizadas = [
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
    revisoes: revisoesAtualizadas,
  });

  return NextResponse.json({ ...respostaBase, feegow: "enviado" });
}
