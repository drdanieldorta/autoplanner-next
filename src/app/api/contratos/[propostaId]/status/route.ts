import { NextResponse } from "next/server";
import { z } from "zod";

import {
  jsonError,
  requireUserWithCompanyOr401,
} from "@/app/api/_lib/api-helpers";
import {
  authentique,
  type DocumentSignatureStatus,
} from "@/lib/integrations/authentique";
import { registrarAssinatura } from "@/lib/contracts/assinatura";
import { pacienteDaFeegow, situacaoDoAnexo } from "@/lib/contracts/feegow-anexo";
import { getCompanyCredentials } from "@/lib/integrations/credentials";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Situação do contrato de uma proposta, para o card do orçamento.
 *
 * O que vem do nosso banco (data do envio, link guardado, se há PDF
 * arquivado) é sempre confiável. O que depende da Authentique (assinado
 * ou não) é best-effort: se a consulta falhar, devolvemos `signed: null`
 * e a UI mostra "não foi possível consultar" em vez de quebrar.
 */
export async function GET(
  _req: Request,
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

  const documentId = (proposta.document_id as string | null) ?? null;
  const storedLink = (proposta.contract_signing_link as string | null) ?? null;
  const sentAt = (proposta.contract_sent_at as string | null) ?? null;
  const signedAt = (proposta.contract_signed_at as string | null) ?? null;
  const hasArchive = !!(proposta.contract_pdf_path as string | null);

  // Fonte primária: o carimbo do webhook, disparado por um evento real de
  // assinatura. É definitivo, instantâneo e não depende da Autentique
  // estar de pé.
  let status: DocumentSignatureStatus | null = signedAt ? "signed" : null;
  let effectiveSignedAt = signedAt;
  let viewedAt: string | null = null;
  let rejectedAt: string | null = null;
  let rejectedReason: string | null = null;
  let signingLink = storedLink;

  // Consulta ao vivo quando o banco ainda não sabe o desfecho — contrato
  // pendente, recusado, ou assinado antes da coluna existir. Também
  // quando falta o link (contratos anteriores ao acervo).
  const needsLiveCheck = !signedAt && !!documentId;
  const creds = documentId
    ? await getCompanyCredentials(auth.user.companyId)
    : null;
  if (needsLiveCheck || (documentId && !storedLink)) {
    if (creds?.authentique_token) {
      try {
        const info = await authentique(
          creds.authentique_token,
        ).getDocumentInfo(documentId);
        if (needsLiveCheck) {
          status = info.status;
          effectiveSignedAt = info.signedAt;
          viewedAt = info.viewedAt;
          rejectedAt = info.rejectedAt;
          rejectedReason = info.rejectedReason;
        }
        signingLink = storedLink ?? info.signingLink;

        // Assinatura confirmada agora: grava, para a listagem e as próximas
        // aberturas não dependerem da Autentique (nem do webhook chegar).
        if (needsLiveCheck && info.status === "signed" && info.signedAt) {
          await registrarAssinatura({
            propostaId,
            documentId: documentId!,
            signedAt: info.signedAt,
          }).catch(() => {
            // Best-effort: a tela já mostra "Assinado" pela consulta.
          });
        }
      } catch {
        // Mantém `status` como null: a UI mostra "não foi possível
        // consultar" em vez de afirmar que está pendente.
      }
    }
  }

  // Anexo do contrato assinado no prontuário da Feegow
  // (`lib/contracts/feegow-anexo.ts`). `aplicavel` = a empresa tem Feegow E
  // o paciente é de lá; senão a tela explica por que não há anexo.
  const empresaTemFeegow = !!creds?.feegow_token;
  const pacienteComProntuario = !!pacienteDaFeegow(
    proposta.paciente_id as string | null,
  );
  const feegow = {
    empresaTemFeegow,
    pacienteComProntuario,
    aplicavel: empresaTemFeegow && pacienteComProntuario && !!creds?.authentique_token,
    ...situacaoDoAnexo({
      contract_feegow_em: (proposta.contract_feegow_em as string | null) ?? null,
      contract_feegow_iniciado_em:
        (proposta.contract_feegow_iniciado_em as string | null) ?? null,
      contract_feegow_erro: (proposta.contract_feegow_erro as string | null) ?? null,
    }),
  };

  return NextResponse.json({
    documentId,
    sentAt,
    feegow,
    status,
    signedAt: effectiveSignedAt,
    viewedAt,
    rejectedAt,
    rejectedReason,
    signingLink,
    hasArchive,
  });
}
