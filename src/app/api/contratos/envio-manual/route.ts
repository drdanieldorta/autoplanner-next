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
import { formatDateExtenso } from "@/lib/contracts/render";
import { buildContractHtmlForProposta } from "@/lib/contracts/proposta-contract";
import type { Proposta } from "@/lib/services/propostas";
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
 *   1. Carrega proposta do Supabase
 *   2. Renderiza HTML do contrato (buildContractHtmlForProposta — a mesma
 *      função usada pelo download/impressão em GET /api/propostas/:id/pdf)
 *   3. Converte HTML → PDF (Puppeteer)
 *   4. Cria documento na Authentique com WhatsApp signing
 *   5. Atualiza propostas.document_id com o ID retornado
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

  const admin = createAdminClient();

  // 1. Carrega proposta
  const propostaResult = await admin
    .from("propostas")
    .select("*")
    .eq("id", body.proposta_id)
    .maybeSingle();
  const proposta = propostaResult.data as Proposta | null;
  if (!proposta) return jsonError("Proposta não encontrada", 404);
  if (proposta.company_id !== auth.user.companyId) {
    return jsonError("Acesso negado a esta proposta", 403);
  }

  // 2. Renderiza o HTML do contrato (template do sistema ou custom).
  const { html: fullHtml, variables } = await buildContractHtmlForProposta(
    proposta,
    { feegowToken: creds.feegow_token },
  );

  // 3. PDF
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generatePdfFromHtml(fullHtml);
  } catch (err) {
    return jsonError(
      `Falha ao gerar PDF: ${err instanceof Error ? err.message : String(err)}`,
      500,
    );
  }

  // 4. Authentique
  try {
    const docName = `Contrato - ${variables.paciente_nome} - ${formatDateExtenso()} - Proposta - ${proposta.id_proposta_api ?? body.proposta_id}`;
    const result = await authentique(creds.authentique_token).createDocument({
      name: docName,
      file: {
        content: pdfBuffer,
        filename: `${docName}.pdf`,
        mimeType: "application/pdf",
      },
      signers: [
        {
          name: variables.paciente_nome,
          phone: variables.paciente_telefone,
          email: variables.paciente_email || undefined,
          action: "SIGN",
        },
      ],
    });

    // Salva document_id + promove status para "enviado" (se ainda rascunho).
    // Mantém status_id intacto — o usuário ainda pode mover entre 1..5 no
    // StatusSelector. A promoção é só para refletir que o contrato saiu.
    const updateResult = await admin
      .from("propostas")
      .update({
        document_id: result.id,
        status: "enviado",
      } as never)
      .eq("id", body.proposta_id);
    if (updateResult.error) {
      return jsonError(updateResult.error.message, 500);
    }

    return NextResponse.json({
      ok: true,
      document_id: result.id,
      signing_link: result.signatures[0]?.link?.short_link ?? null,
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
