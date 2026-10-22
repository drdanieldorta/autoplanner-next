import { NextResponse } from "next/server";

import {
  authentique,
  verifyAuthentiqueSignature,
} from "@/lib/integrations/authentique";
import {
  AUTENTIQUE_SIGNED_EVENT_TYPES,
  parseAutentiqueEvent,
} from "@/lib/integrations/authentique-webhook";
import { anexarContratoAssinadoNaFeegow } from "@/lib/contracts/feegow-anexo";
import {
  getCompanyCredentials,
  getPropostaByDocumentId,
} from "@/lib/integrations/credentials";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Callback inbound da Autentique (o código chama de "Authentique") quando um
 * documento muda de status. A URL é mostrada em /configuracao; cada clínica
 * cadastra na própria conta da Autentique.
 *
 * Substitui o webhook n8n `POST /webhook/contrato-assinando`.
 *
 * **Payload real** (lido por `parseAutentiqueEvent`):
 *   `{ event: { id, type, data } }`, com o recurso em `event.data.object`
 *   quando é objeto, senão no próprio `event.data`.
 *     - `signature.accepted`: recurso é a assinatura → `document` = id do documento
 *     - `document.finished`:  recurso é o documento  → `id` = id do documento
 *   O formato antigo `event.data.document` continua aceito.
 *
 * **Respostas.** A Autentique manda muitos tipos de evento para a mesma URL;
 * responder 4xx para os que não interessam está errado. Por isso: JSON
 * inválido → 400; tipo que não interessa, sem id de documento ou documento
 * que não é nosso (a conta é dividida com outros sistemas) → 200 `ignored`.
 * 503 só quando a consulta à Autentique falha, para ela reenviar.
 *
 * **O evento é gatilho, não prova.** Antes de carimbar, a rota confirma na
 * API da Autentique (`getDocumentInfo`) que TODOS os signatários assinaram.
 * Nenhuma empresa tem `webhook_secret` cadastrado, então o HMAC (opcional,
 * header `X-Autentique-Signature`) hoje não roda: sem a confirmação ao vivo,
 * quem soubesse um id de documento marcaria o contrato como assinado e
 * dispararia um anexo irreversível no prontuário Feegow.
 *
 * **Carimbo idempotente, anexo único.** `contract_signed_at` só é gravado se
 * ainda estiver nulo. O anexo na Feegow tem estado próprio
 * (`lib/contracts/feegow-anexo.ts`): uma trava impede anexar duas vezes
 * quando `signature.accepted` e `document.finished` chegam juntos (a Feegow
 * não expõe delete de anexo), e uma falha fica registrada para o evento
 * seguinte ou o botão da tela tentarem de novo.
 *
 * O secret HMAC é por empresa (`api_credentials.webhook_secret`), o que
 * exige resolver a empresa pelo `document_id` ANTES de validar. A rota é
 * pública no middleware (`/api/webhooks/*`): a Autentique não manda cookie.
 *
 * Diferenças do n8n original:
 *   - Valida HMAC `x-autentique-signature` quando há secret (bug 7 do N8N.md)
 *   - Não tem o `)` extra no template do upload (bug 2)
 */
export async function POST(req: Request) {
  // Lemos o body como string (texto) para validar HMAC depois
  const rawBody = await req.text();
  const signature = req.headers.get("x-autentique-signature");

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "Payload JSON inválido" },
      { status: 400 },
    );
  }

  // Filtra ANTES de tocar no banco: a maioria dos eventos não interessa.
  const { type: eventType, documentId } = parseAutentiqueEvent(payload);
  if (!eventType || !AUTENTIQUE_SIGNED_EVENT_TYPES.has(eventType)) {
    return NextResponse.json({
      ok: true,
      ignored: `evento não tratado: ${eventType ?? "sem tipo"}`,
    });
  }
  if (!documentId) {
    return NextResponse.json({
      ok: true,
      ignored: "evento sem id de documento",
    });
  }

  // Resolve empresa via document_id (criação prévia salvou em propostas)
  const proposta = await getPropostaByDocumentId(documentId);
  if (!proposta) {
    // Documento de outro sistema na mesma conta, ou callback antigo.
    return NextResponse.json({
      ok: true,
      ignored: "documento desconhecido",
    });
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

  // Confirmação ao vivo: sem token não há como confirmar, e sem confirmar
  // não carimbamos.
  if (!creds.authentique_token) {
    console.warn(
      "[/webhooks/authentique] Empresa sem token da Autentique; evento ignorado:",
      { companyId: proposta.company_id, documentId, eventType },
    );
    return NextResponse.json({
      ok: true,
      ignored: "empresa sem token da Autentique",
    });
  }
  const info = await authentique(creds.authentique_token).getDocumentInfo(
    documentId,
  );
  if (info.status === null) {
    // A consulta falhou: 503 faz a Autentique reenviar o evento.
    return NextResponse.json(
      { error: "Não foi possível confirmar a assinatura na Autentique" },
      { status: 503 },
    );
  }
  if (info.status !== "signed") {
    // `signature.accepted` de um signatário quando ainda falta outro.
    return NextResponse.json({
      ok: true,
      ignored: "documento ainda não assinado",
    });
  }

  // Carimba a assinatura ANTES de qualquer coisa que possa falhar: o
  // upload pra Feegow abaixo é best-effort, mas o fato da assinatura já
  // é definitivo neste ponto. Se a ordem fosse inversa, uma Feegow fora
  // do ar deixaria o painel sem saber que o contrato foi assinado.
  //
  // `.is(null)` mantém idempotente: a Autentique repete o callback e manda
  // `signature.accepted` e `document.finished` para o mesmo documento. O
  // `.select("id")` diz se foi ESTA requisição que carimbou.
  const stamp = await createAdminClient()
    .from("propostas")
    .update({
      contract_signed_at: info.signedAt ?? new Date().toISOString(),
    } as never)
    .eq("document_id", documentId)
    .is("contract_signed_at", null)
    .select("id");
  if (stamp.error) {
    // 503 para a Autentique reenviar; o anexo abaixo depende do carimbo.
    console.error(
      "[/webhooks/authentique] Falha ao carimbar contract_signed_at:",
      stamp.error,
    );
    return NextResponse.json(
      { error: "Falha ao registrar a assinatura" },
      { status: 503 },
    );
  }
  const carimbouAgora = ((stamp.data ?? []) as { id: string }[]).length > 0;

  // Anexo no prontuário da Feegow, com estado próprio
  // (`lib/contracts/feegow-anexo.ts`). Não depende de ESTA requisição ter
  // carimbado: se o anexo falhou no `signature.accepted`, o
  // `document.finished` que vem depois tenta de novo. A trava lá dentro
  // impede anexo duplo quando os dois eventos chegam juntos. Paciente
  // digitado ou do CRM (`paciente_id: "manual"`) e empresa sem Feegow
  // voltam `nao_aplicavel`.
  //
  // Sempre 200: falha do anexo fica registrada no orçamento (a tela mostra e
  // oferece "Tentar de novo"). Responder 5xx faria a Autentique reenviar, mas
  // uma falha permanente (paciente inexistente na Feegow) viraria uma fila de
  // reenvios e poderia levar a Autentique a desativar o webhook da clínica.
  const anexo = await anexarContratoAssinadoNaFeegow({
    propostaId: proposta.id,
    companyId: proposta.company_id,
    assinaturaConfirmada: true,
  });

  return NextResponse.json({
    ok: true,
    stamped: carimbouAgora,
    feegow: anexo.status,
  });
}
