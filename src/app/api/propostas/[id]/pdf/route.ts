import { NextResponse } from "next/server";

import {
  jsonError,
  requireUserWithCompanyOr401,
} from "@/app/api/_lib/api-helpers";
import { getPropostaById } from "@/lib/services/propostas";
import { getProtocolById } from "@/lib/services/protocols";
import { getCompanyCredentials } from "@/lib/integrations/credentials";
import { generatePdfFromHtml } from "@/lib/integrations/pdf";
import { buildContractHtmlForProposta } from "@/lib/contracts/proposta-contract";
import {
  renderFinanceiroResumoHtml,
  renderOrcamentoResumoHtml,
  type OrcamentoResumoData,
  type ResumoLineItem,
} from "@/lib/orcamentos/pdf-templates";

export const dynamic = "force-dynamic";
// Puppeteer cold start + Chromium excede os 10s default da Vercel Hobby.
// 60s é o teto do plano Hobby; em Pro pode ir até 300s.
export const maxDuration = 60;

const TIPOS = ["contrato", "financeiro", "orcamento"] as const;
type Tipo = (typeof TIPOS)[number];

type AdicionalRaw = {
  procedure_name?: string;
  quantity?: number;
  value_cents?: number;
  discount_percent?: number;
  interval_days?: number;
};

/** Slug seguro p/ nome de arquivo (sem acentos, minúsculo). */
function slug(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "documento"
  );
}

/**
 * Gera o PDF de um documento do orçamento (proposta) para download ou
 * impressão pelo browser.
 *
 *   GET /api/propostas/:id/pdf?tipo=contrato|financeiro|orcamento
 *
 * Sempre responde `Content-Disposition: inline` — o client decide entre
 * abrir p/ imprimir ou forçar o download (via `a.download`). O contrato
 * reusa exatamente a renderização enviada à Authentique.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUserWithCompanyOr401();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const tipoParam = new URL(req.url).searchParams.get("tipo");
  if (!tipoParam || !TIPOS.includes(tipoParam as Tipo)) {
    return jsonError("tipo inválido (use contrato|financeiro|orcamento)", 422);
  }
  const tipo = tipoParam as Tipo;

  const proposta = await getPropostaById({
    id,
    companyId: auth.user.companyId,
  });
  if (!proposta) return jsonError("Orçamento não encontrado", 404);

  let html: string;
  let filenameBase: string;
  const nomeSlug = slug(proposta.paciente_nome);

  if (tipo === "contrato") {
    const creds = await getCompanyCredentials(auth.user.companyId);
    const built = await buildContractHtmlForProposta(proposta, {
      feegowToken: creds?.feegow_token ?? null,
    });
    html = built.html;
    filenameBase = `contrato-${nomeSlug}`;
  } else {
    const items = await buildResumoItems(proposta.protocolo_id, auth.user.companyId, proposta.procedimentos_adicionais);
    const data: OrcamentoResumoData = {
      paciente_nome: proposta.paciente_nome,
      paciente_cpf: proposta.paciente_cpf,
      paciente_email: proposta.paciente_email,
      paciente_telefone: proposta.paciente_telefone,
      profissional_nome: proposta.profissional_nome,
      profissional_especialidade: proposta.profissional_especialidade,
      profissional_crm: proposta.profissional_crm,
      profissional_email: proposta.profissional_email,
      protocolo_nome: proposta.protocolo_nome,
      items,
      valor_total_cents: proposta.valor_total_cents,
      discount_percent: proposta.discount_percent,
      status: proposta.status,
      observacoes: proposta.observacoes,
      created_at: proposta.created_at,
      payment_method: proposta.payment_method,
      custom_payment_method: proposta.custom_payment_method,
      installments: proposta.installments,
      installment_value_cents: proposta.installment_value_cents,
    };
    if (tipo === "orcamento") {
      html = renderOrcamentoResumoHtml(data);
      filenameBase = `orcamento-${nomeSlug}`;
    } else {
      html = renderFinanceiroResumoHtml(data);
      filenameBase = `resumo-financeiro-${nomeSlug}`;
    }
  }

  let pdf: Buffer;
  try {
    pdf = await generatePdfFromHtml(html);
  } catch (err) {
    return jsonError(
      `Falha ao gerar PDF: ${err instanceof Error ? err.message : String(err)}`,
      500,
    );
  }

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filenameBase}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Junta itens do protocolo base (com valores) + procedimentos adicionais. */
async function buildResumoItems(
  protocoloId: string | null,
  companyId: string,
  adicionaisRaw: unknown,
): Promise<ResumoLineItem[]> {
  const items: ResumoLineItem[] = [];

  if (protocoloId) {
    const protocol = await getProtocolById({
      id: protocoloId,
      companyId,
    }).catch(() => null);
    if (protocol) {
      for (const it of protocol.items) {
        items.push({
          procedure_name: it.procedure_name,
          quantity: it.quantity,
          value_cents: it.value_cents,
          discount_percent: it.discount_percent,
          interval_days: it.interval_days,
          source: "protocolo",
        });
      }
    }
  }

  const adicionais = Array.isArray(adicionaisRaw)
    ? (adicionaisRaw as AdicionalRaw[])
    : [];
  for (const p of adicionais) {
    items.push({
      procedure_name: p.procedure_name ?? "Procedimento",
      quantity: p.quantity ?? 1,
      value_cents: p.value_cents ?? 0,
      discount_percent: p.discount_percent ?? 0,
      interval_days: p.interval_days ?? 0,
      source: "adicional",
    });
  }

  return items;
}
