import { NextResponse } from "next/server";
import { z } from "zod";

import {
  jsonError,
  requireUserWithCompanyOr401,
} from "@/app/api/_lib/api-helpers";
import { authentique } from "@/lib/integrations/authentique";
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
  const hasArchive = !!(proposta.contract_pdf_path as string | null);

  let signed: boolean | null = null;
  let signingLink = storedLink;

  if (documentId) {
    const creds = await getCompanyCredentials(auth.user.companyId);
    if (creds?.authentique_token) {
      try {
        const info = await authentique(
          creds.authentique_token,
        ).getDocumentInfo(documentId);
        signed = info.signed;
        // Contratos anteriores a esta feature não têm link guardado —
        // nesses, o que a Authentique devolver é a única fonte.
        signingLink = storedLink ?? info.signingLink;
      } catch {
        signed = null;
      }
    }
  }

  return NextResponse.json({
    documentId,
    sentAt,
    signingLink,
    signed,
    hasArchive,
  });
}
