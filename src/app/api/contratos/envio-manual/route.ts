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
import { feegow } from "@/lib/integrations/feegow";
import { getCompanyCredentials } from "@/lib/integrations/credentials";
import { generatePdfFromHtml } from "@/lib/integrations/pdf";
import {
  formatBRL,
  formatCPF,
  formatDateExtenso,
  replaceContractVariables,
} from "@/lib/contracts/render";
import { renderDefaultSystemContract } from "@/lib/contracts/templates/default-system-contract";
import {
  getDocumentBranding,
  renderBrandingCss,
  renderBrandingHeader,
} from "@/lib/branding/document";
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

  // Endereço completo + nascimento vêm direto da Feegow no momento da
  // renderização — o paciente pode ter atualizado os dados depois da
  // criação da proposta. Modo manual (sem feegow_token) ou paciente_id
  // = "manual" pula isso e os campos saem vazios.
  type FeegowExtras = {
    nascimento: string;
    endereco: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
  let extras: FeegowExtras = {
    nascimento: "",
    endereco: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    cep: "",
  };
  const pacienteIdRaw = (proposta.paciente_id as string) ?? "";
  if (
    pacienteIdRaw &&
    pacienteIdRaw !== "manual" &&
    creds.feegow_token
  ) {
    try {
      const data = await feegow(creds.feegow_token).searchPatient(
        pacienteIdRaw,
      );
      if (data) {
        extras = {
          nascimento: data.nascimento,
          endereco: data.endereco,
          numero: data.numero,
          complemento: data.complemento,
          bairro: data.bairro,
          cidade: data.cidade,
          estado: data.estado,
          cep: data.cep,
        };
      }
    } catch {
      // Feegow indisponível: vai com o que estiver na proposta.
    }
  }

  const variables: Record<string, string> = {
    paciente_nome: (proposta.paciente_nome as string) ?? "",
    paciente_cpf: formatCPF((proposta.paciente_cpf as string) ?? ""),
    paciente_email: (proposta.paciente_email as string) ?? "",
    paciente_telefone: (proposta.paciente_telefone as string) ?? "",
    paciente_nascimento:
      extras.nascimento ||
      ((proposta.paciente_nascimento as string) ?? ""),
    paciente_endereco: extras.endereco,
    paciente_numero: extras.numero,
    paciente_complemento: extras.complemento,
    paciente_bairro:
      extras.bairro || ((proposta.paciente_bairro as string) ?? ""),
    paciente_cidade: extras.cidade,
    paciente_estado: extras.estado,
    paciente_cep: extras.cep,
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
  //   - Com contract_id: HTML do user (substitui {{vars}}).
  //   - Sem contract_id: template do sistema (TCLE completo, code-driven,
  //     com termos condicionais IM/EV/Implante). Não passa por replace
  //     porque já é renderizado direto com os dados.
  // Identidade visual da empresa (logo + cores). Empresa sem branding
  // configurado devolve hasBranding=false e o documento sai exatamente
  // como saía antes — cabeçalho e CSS de marca ficam vazios.
  const branding = await getDocumentBranding(auth.user.companyId);

  const fullHtml = contractContent
    ? `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Contrato</title><style>${renderBrandingCss(branding)}</style></head><body style="font-family:Arial,sans-serif;font-size:12px;line-height:1.55;color:#111;padding:20mm;">${renderBrandingHeader(branding)}${replaceContractVariables(contractContent, variables)}</body></html>`
    : renderDefaultSystemContract({
        branding,
        paciente_nome: (proposta.paciente_nome as string) ?? "",
        paciente_cpf: (proposta.paciente_cpf as string) ?? "",
        profissional_nome: (proposta.profissional_nome as string) ?? "",
        profissional_cpf: (proposta.profissional_cpf as string) ?? "",
        profissional_crm: (proposta.profissional_crm as string) ?? "",
        procedimentos: todosProcedimentos,
        subtotal_cents: valorTotal,
        total_cents: valorTotal,
        forma_pagamento: (proposta.payment_method as string | null) ?? null,
        custom_payment_method:
          (proposta.custom_payment_method as string | null) ?? null,
        installments,
        installment_value_cents: installmentValueCents,
      });

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

