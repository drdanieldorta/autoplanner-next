import { NextResponse } from "next/server";
import { z } from "zod";

import {
  jsonError,
  requireUserWithCompanyOr401,
} from "@/app/api/_lib/api-helpers";
import {
  authentique,
  AuthentiqueError,
} from "@/lib/integrations/authentique";
import { getCompanyCredentials } from "@/lib/integrations/credentials";
import { generatePdfFromHtml } from "@/lib/integrations/pdf";
import { buildContractHtml } from "@/lib/contracts/build-html";
import { storeContractPdf } from "@/lib/contracts/archive";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
// PDF gen (Puppeteer cold start + Chromium) + Authentique upload fica
// facilmente acima dos 10s default da Vercel Hobby. 60s é o teto do
// plano Hobby; em Pro pode ir até 300s.
export const maxDuration = 60;

const BodySchema = z.object({
  proposta_id: z.string().uuid(),
});

/**
 * Substitui o webhook n8n `POST /webhook/modo-manual-autentique`.
 *
 * Pipeline:
 *   1. Monta o HTML do contrato (lib/contracts/build-html — compartilhado
 *      com o endpoint de visualização, para o que se imprime ser
 *      idêntico ao que o paciente assina)
 *   2. Converte HTML → PDF (Puppeteer)
 *   3. Cria documento na Authentique com assinatura via WhatsApp
 *   4. Arquiva o PDF no bucket `contracts`
 *   5. Grava document_id + link + data do envio em `propostas`
 *
 * Diferenças em relação ao n8n original:
 *   - PDF gerado server-side em vez de mandar HTML pra Authentique
 *   - Bug do `)` extra no upload Feegow não existe aqui
 *   - Suporta `contract_id` custom (n8n manual não suportava — bug 5 do N8N.md)
 */
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

  const creds = await getCompanyCredentials(auth.user.companyId);
  if (!creds?.authentique_token) {
    return jsonError("Authentique não configurada para esta empresa", 400);
  }

  const built = await buildContractHtml({
    propostaId: body.proposta_id,
    companyId: auth.user.companyId,
  });
  if (!built.ok) return jsonError(built.error, built.status);
  const { html, docName, proposta } = built.value;

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generatePdfFromHtml(html);
  } catch (err) {
    return jsonError(
      `Falha ao gerar PDF: ${err instanceof Error ? err.message : String(err)}`,
      500,
    );
  }

  const admin = createAdminClient();

  try {
    const result = await authentique(creds.authentique_token).createDocument({
      name: docName,
      file: {
        content: pdfBuffer,
        filename: `${docName}.pdf`,
        mimeType: "application/pdf",
      },
      signers: [
        {
          name: (proposta.paciente_nome as string) ?? "",
          phone: (proposta.paciente_telefone as string) ?? "",
          email: (proposta.paciente_email as string) || undefined,
          action: "SIGN",
        },
      ],
    });

    const signingLink = result.signatures[0]?.link?.short_link ?? null;

    // Arquiva o PDF só depois do envio dar certo — se a Authentique
    // recusar, não queremos lixo no bucket.
    const pdfPath = await storeContractPdf({
      companyId: auth.user.companyId,
      propostaId: body.proposta_id,
      pdf: pdfBuffer,
    });

    // Salva document_id + promove status para "enviado" (se ainda rascunho).
    // Mantém status_id intacto — o usuário ainda pode mover entre 1..5 no
    // StatusSelector. A promoção é só para refletir que o contrato saiu.
    const updateResult = await admin
      .from("propostas")
      .update({
        document_id: result.id,
        status: "enviado",
        contract_pdf_path: pdfPath,
        contract_sent_at: new Date().toISOString(),
        contract_signing_link: signingLink,
      } as never)
      .eq("id", body.proposta_id);
    if (updateResult.error) {
      return jsonError(updateResult.error.message, 500);
    }

    return NextResponse.json({
      ok: true,
      document_id: result.id,
      signing_link: signingLink,
    });
  } catch (err) {
    if (err instanceof AuthentiqueError) {
      return jsonError(`Falha na Authentique: ${err.message}`, 502);
    }
    return jsonError(
      err instanceof Error ? err.message : "Erro Authentique",
      500,
    );
  }
}
