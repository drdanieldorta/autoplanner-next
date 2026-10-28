import { NextResponse } from "next/server";

import {
  jsonError,
  requireUserWithCompanyOr401,
} from "@/app/api/_lib/api-helpers";
import { registrarAssinatura } from "@/lib/contracts/assinatura";
import { authentique } from "@/lib/integrations/authentique";
import { getCompanyCredentials } from "@/lib/integrations/credentials";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Só os enviados recentemente: o resto o card consulta quando é aberto. */
const JANELA_DIAS = 30;
/** A Autentique limita a 60 consultas por minuto por conta. */
const MAX_POR_RODADA = 15;
const PARALELO = 5;
const INTERVALO_MS = 60_000;

/**
 * Última rodada por empresa. Em `globalThis` pelo mesmo motivo do cache de
 * pacientes da Feegow: cada bundle do Next recebe a sua cópia do módulo.
 */
const rodadas: Map<string, number> = ((
  globalThis as { __sincronizacaoAssinaturas?: Map<string, number> }
).__sincronizacaoAssinaturas ??= new Map());

/**
 * Confere na Autentique os contratos ainda sem assinatura registrada e grava
 * as que já aconteceram. Chamada pela listagem de orçamentos ao abrir, para a
 * assinatura aparecer mesmo sem o webhook chegar (clínica que ainda não
 * cadastrou a URL na Autentique). Só carimba; anexar ao prontuário fica com o
 * webhook e o botão do card (ver `registrarAssinatura`).
 */
export async function POST() {
  const auth = await requireUserWithCompanyOr401();
  if (!auth.ok) return auth.response;
  const companyId = auth.user.companyId;

  const ultima = rodadas.get(companyId) ?? 0;
  if (Date.now() - ultima < INTERVALO_MS) {
    return NextResponse.json({ ok: true, verificados: 0, assinados: 0 });
  }
  rodadas.set(companyId, Date.now());

  const creds = await getCompanyCredentials(companyId);
  if (!creds?.authentique_token) {
    return NextResponse.json({ ok: true, verificados: 0, assinados: 0 });
  }

  const desde = new Date(Date.now() - JANELA_DIAS * 86_400_000).toISOString();
  const result = await createAdminClient()
    .from("propostas")
    .select("id, document_id")
    .eq("company_id", companyId)
    .not("document_id", "is", null)
    .is("contract_signed_at", null)
    .gte("contract_sent_at", desde)
    .order("contract_sent_at", { ascending: false })
    .limit(MAX_POR_RODADA);
  if (result.error) return jsonError(result.error.message, 500);
  const pendentes = (result.data ?? []) as {
    id: string;
    document_id: string;
  }[];

  const api = authentique(creds.authentique_token);
  let assinados = 0;
  for (let i = 0; i < pendentes.length; i += PARALELO) {
    await Promise.all(
      pendentes.slice(i, i + PARALELO).map(async (p) => {
        const info = await api.getDocumentInfo(p.document_id);
        if (info.status !== "signed" || !info.signedAt) return;
        const gravou = await registrarAssinatura({
          propostaId: p.id,
          documentId: p.document_id,
          signedAt: info.signedAt,
        }).catch(() => false);
        if (gravou) assinados++;
      }),
    );
  }

  return NextResponse.json({
    ok: true,
    verificados: pendentes.length,
    assinados,
  });
}
