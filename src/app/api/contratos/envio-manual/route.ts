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
import {
  formatBRL,
  formatCPF,
  formatDateExtenso,
  replaceContractVariables,
} from "@/lib/contracts/render";
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
 *   1. Carrega proposta + contrato custom (se houver) do Supabase
 *   2. Renderiza HTML substituindo variáveis {{paciente_nome}} etc
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
  const proposta = propostaResult.data as Record<string, unknown> | null;
  if (!proposta) return jsonError("Proposta não encontrada", 404);
  if (proposta.company_id !== auth.user.companyId) {
    return jsonError("Acesso negado a esta proposta", 403);
  }

  // 2. Carrega contract custom (se houver)
  let contractContent: string | null = null;
  if (proposta.contract_id) {
    const contractResult = await admin
      .from("contracts")
      .select("content")
      .eq("id", proposta.contract_id as string)
      .maybeSingle();
    const contract = contractResult.data as { content?: string } | null;
    contractContent = contract?.content ?? null;
  }

  // 3. Procedimentos: itens do protocolo base (se houver) + adicionais.
  //    Os do protocolo vivem em `protocol_items`, não em `propostas`.
  type LineProc = { procedure_name?: string; quantity?: number };
  const protocolItems: LineProc[] = await (async () => {
    if (!proposta.protocolo_id) return [];
    const r = await admin
      .from("protocol_items")
      .select("procedure_name, quantity")
      .eq("protocol_id", proposta.protocolo_id as string);
    if (r.error) return [];
    return (r.data ?? []) as LineProc[];
  })();
  const adicionais = Array.isArray(proposta.procedimentos_adicionais)
    ? (proposta.procedimentos_adicionais as LineProc[])
    : [];
  const todosProcedimentos = [...protocolItems, ...adicionais];
  const procedimentosTexto = todosProcedimentos
    .map(
      (p) =>
        `${p.procedure_name ?? "Procedimento"} (Qtd: ${p.quantity ?? 1})`,
    )
    .join(", ");

  const valorTotal = (proposta.valor_total_cents as number) ?? 0;
  const installments = (proposta.installments as number | null) ?? null;
  const installmentValueCents =
    (proposta.installment_value_cents as number | null) ?? null;
  const parcelasTexto =
    installments && installments > 1
      ? `${installments}x${
          installmentValueCents
            ? ` de ${formatBRL(installmentValueCents)}`
            : ""
        }`
      : "";

  const variables: Record<string, string> = {
    paciente_nome: (proposta.paciente_nome as string) ?? "",
    paciente_cpf: formatCPF((proposta.paciente_cpf as string) ?? ""),
    paciente_email: (proposta.paciente_email as string) ?? "",
    paciente_telefone: (proposta.paciente_telefone as string) ?? "",
    profissional_nome: (proposta.profissional_nome as string) ?? "",
    profissional_cpf: formatCPF((proposta.profissional_cpf as string) ?? ""),
    profissional_crm: (proposta.profissional_crm as string) ?? "",
    profissional_especialidade:
      (proposta.profissional_especialidade as string) ?? "",
    procedimentos: procedimentosTexto || "—",
    subtotal: formatBRL(valorTotal),
    desconto: "R$ 0,00",
    total: formatBRL(valorTotal),
    data_contrato: formatDateExtenso(),
    forma_pagamento: ((proposta.payment_method as string) ?? "—")
      .toString()
      .toUpperCase(),
    parcelas: parcelasTexto,
    valor_parcela: installmentValueCents
      ? formatBRL(installmentValueCents)
      : "",
  };

  // 4. Renderiza HTML
  // Por enquanto: se houver contractContent, usa direto; senão, usa um
  // template padrão simples. Os 3 templates HTML completos do n8n
  // (padrão + wrapper custom + termos clínicos IM/EV/IMPLANTE) viram
  // arquivos próprios em fases futuras (lib/contracts/templates/*.html).
  const innerHtml = contractContent ?? defaultContractTemplate();
  const fullHtml = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Contrato</title></head><body style="font-family:Arial,sans-serif;font-size:12px;line-height:1.55;color:#111;padding:20mm;">${replaceContractVariables(innerHtml, variables)}</body></html>`;

  // 5. PDF
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generatePdfFromHtml(fullHtml);
  } catch (err) {
    return jsonError(
      `Falha ao gerar PDF: ${err instanceof Error ? err.message : String(err)}`,
      500,
    );
  }

  // 6. Authentique
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

function defaultContractTemplate(): string {
  return `
<h1>Contrato de Prestação de Serviços em Saúde</h1>
<p>Por este instrumento particular, eu, <strong>{{paciente_nome}}</strong>, CPF <strong>{{paciente_cpf}}</strong>, declaro estar ciente do plano de tratamento abaixo, prestado pelo profissional <strong>{{profissional_nome}}</strong> (CRM {{profissional_crm}}, CPF {{profissional_cpf}}, {{profissional_especialidade}}).</p>
<h2>Procedimentos</h2>
<p>{{procedimentos}}</p>
<h2>Valor</h2>
<p>Subtotal: {{subtotal}}<br/>Desconto: {{desconto}}<br/><strong>Total: {{total}}</strong></p>
<p>Forma de pagamento: {{forma_pagamento}}</p>
<p>São Paulo, {{data_contrato}}.</p>
<p style="margin-top:60px;border-top:1px solid #000;padding-top:8px;">{{paciente_nome}}<br/>CPF: {{paciente_cpf}}</p>
`;
}
