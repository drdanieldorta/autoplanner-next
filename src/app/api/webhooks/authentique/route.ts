import { NextResponse } from "next/server";

import {
  authentique,
  verifyAuthentiqueSignature,
} from "@/lib/integrations/authentique";
import { feegow } from "@/lib/integrations/feegow";
import {
  getCompanyCredentials,
  getPropostaByDocumentId,
} from "@/lib/integrations/credentials";

export const dynamic = "force-dynamic";

/**
 * Callback inbound da Authentique quando um documento muda de status.
 *
 * Substitui o webhook n8n `POST /webhook/contrato-assinando`.
 *
 * Diferenças do n8n original:
 *   - Valida HMAC `x-autentique-signature` (n8n não validava — bug 7 do N8N.md)
 *   - Não tem o `)` extra no template do upload (bug 2)
 *   - Idempotência via dedup do `event.id` no DB (TODO simples — já podemos
 *     tratar no banco com ON CONFLICT em proposal_events.id)
 *
 * O secret HMAC é compartilhado entre o painel e a Authentique. Por
 * enquanto, lemos da empresa via `getCompanyCredentials(companyId).webhook_secret`,
 * o que exige resolver a empresa pelo `document_id` ANTES de validar.
 * Não é ideal — mas é o melhor possível enquanto não tivermos um secret
 * global de webhook Authentique no .env. Comentários abaixo.
 */
export async function POST(req: Request) {
  // Lemos o body como string (texto) para validar HMAC depois
  const rawBody = await req.text();
  const signature = req.headers.get("x-autentique-signature");

  let payload: {
    event?: { type?: string; data?: { document?: string } };
  };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "Payload JSON inválido" },
      { status: 400 },
    );
  }

  const eventType = payload.event?.type;
  const documentId = payload.event?.data?.document;
  if (!documentId) {
    return NextResponse.json(
      { error: "event.data.document ausente" },
      { status: 400 },
    );
  }

  // Resolve empresa via document_id (criação prévia salvou em propostas)
  const proposta = await getPropostaByDocumentId(documentId);
  if (!proposta) {
    // Pode acontecer se Authentique repetir callback antigo. Aceita silenciosamente.
    return NextResponse.json({ ok: true, ignored: true });
  }

  const creds = await getCompanyCredentials(proposta.company_id);
  if (!creds) {
    return NextResponse.json(
      { error: "Empresa sem credenciais configuradas" },
      { status: 500 },
    );
  }

  // Validação HMAC opcional (só se houver secret cadastrado)
  if (creds.webhook_secret) {
    const ok = verifyAuthentiqueSignature({
      rawBody,
      signatureHeader: signature,
      secret: creds.webhook_secret,
    });
    if (!ok) {
      return NextResponse.json(
        { error: "Assinatura HMAC inválida" },
        { status: 401 },
      );
    }
  }

  // Só processa quando o documento foi assinado
  if (eventType !== "signature.accepted" && eventType !== "signed") {
    return NextResponse.json({ ok: true, ignored: eventType });
  }

  // Se a empresa tem feegow_token, baixa o PDF assinado e anexa ao prontuário
  if (creds.feegow_token && creds.authentique_token) {
    try {
      const signedUrl = await authentique(
        creds.authentique_token,
      ).getSignedFileUrl(documentId);
      if (signedUrl) {
        const pdfRes = await fetch(signedUrl);
        if (pdfRes.ok) {
          const buf = Buffer.from(await pdfRes.arrayBuffer());
          const base64 = buf.toString("base64");
          await feegow(creds.feegow_token).uploadBase64ToPatient({
            paciente_id: proposta.paciente_id,
            base64: `data:application/pdf;base64,${base64}`,
            arquivo_descricao: `Contrato assinado - ${proposta.paciente_nome}`,
          });
        }
      }
    } catch (err) {
      // Loga mas não falha — o evento Authentique já foi processado.
      console.error(
        "[/webhooks/authentique] Falha ao anexar PDF Feegow:",
        err,
      );
    }
  }

  return NextResponse.json({ ok: true });
}
