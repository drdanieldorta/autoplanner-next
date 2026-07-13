import "server-only";

import { formatBRL, formatCPF, formatDateExtenso } from "@/lib/contracts/render";

/**
 * Templates HTML → PDF dos "resumos" de um orçamento (proposta):
 *   - `renderOrcamentoResumoHtml`  → documento com paciente, profissional e
 *      procedimentos detalhados (a proposta impressa).
 *   - `renderFinanceiroResumoHtml` → demonstrativo de valores e condições
 *      de pagamento.
 *
 * São convertidos em PDF por Puppeteer em `GET /api/propostas/:id/pdf`.
 * Puppeteer não carrega CSS externo, então todo estilo é inline / <style>.
 */

export type ResumoLineItem = {
  procedure_name: string;
  quantity: number;
  /** valor unitário em centavos */
  value_cents: number;
  discount_percent: number;
  interval_days: number;
  source: "protocolo" | "adicional";
};

export type OrcamentoResumoData = {
  paciente_nome: string;
  paciente_cpf: string | null;
  paciente_email: string | null;
  paciente_telefone: string | null;
  profissional_nome: string;
  profissional_especialidade: string | null;
  profissional_crm: string | null;
  profissional_email: string | null;
  protocolo_nome: string | null;
  items: ResumoLineItem[];
  valor_total_cents: number;
  discount_percent: number;
  status: string | null;
  observacoes: string | null;
  created_at: string;
  payment_method: string | null;
  custom_payment_method: string | null;
  installments: number | null;
  installment_value_cents: number | null;
};

const PAYMENT_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  transferencia: "Transferência Bancária",
  debito: "Cartão de Débito",
  credito: "Cartão de Crédito",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Valor líquido de uma linha (unitário × qtd, menos desconto do item). */
function lineNetCents(item: ResumoLineItem): number {
  return Math.round(
    item.value_cents * item.quantity * (1 - (item.discount_percent ?? 0) / 100),
  );
}

function paymentLabel(data: OrcamentoResumoData): string {
  if (data.payment_method) {
    return PAYMENT_LABELS[data.payment_method] ?? data.payment_method;
  }
  if (data.custom_payment_method) return data.custom_payment_method;
  return "—";
}

function formatDateBR(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

const BASE_CSS = `
  /* As margens da página são aplicadas por generatePdfFromHtml (20mm/15mm);
     não repetir padding aqui para não desperdiçar altura e empurrar o
     rodapé para uma página em branco. */
  body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.5; color: #111; margin: 0; }
  .header-wrap { text-align: center; border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 20px; }
  h1.header { font-size: 15px; font-weight: bold; letter-spacing: 0.05em; text-transform: uppercase; margin: 0; }
  .header-meta { margin-top: 6px; font-size: 10px; color: #666; }
  .section-title { background: #e5e7eb; padding: 6px 12px; font-weight: bold; font-size: 11px; margin: 18px 0 10px; text-transform: uppercase; letter-spacing: 0.04em; }
  .kv { margin-bottom: 4px; }
  .kv .label { color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
  .kv .value { font-size: 12px; font-weight: 600; }
  .cols { display: flex; gap: 24px; }
  .cols > div { flex: 1; }
  table.proc { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 12px; }
  table.proc th { text-align: left; padding: 6px 4px; border-bottom: 2px solid #9ca3af; font-weight: bold; }
  table.proc th.num, table.proc td.num { text-align: right; }
  table.proc td { padding: 6px 4px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  table.proc .src { color: #9ca3af; font-size: 9px; text-transform: uppercase; letter-spacing: 0.04em; }
  .values { font-size: 12px; margin-top: 8px; }
  .values .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
  .values .row.total { font-weight: bold; font-size: 15px; padding-top: 8px; border-top: 2px solid #111; margin-top: 8px; }
  .muted { color: #6b7280; }
  .obs { font-size: 11px; white-space: pre-wrap; background: #fafafa; border: 1px solid #e5e7eb; border-radius: 4px; padding: 10px; }
  .footer { margin-top: 28px; font-size: 9px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 10px; }
`;

function shell(title: string, subtitle: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<style>${BASE_CSS}</style>
</head>
<body>
  <div class="header-wrap">
    <h1 class="header">${escapeHtml(title)}</h1>
    <div class="header-meta">${escapeHtml(subtitle)}</div>
  </div>
  ${bodyHtml}
  <div class="footer">Documento gerado por InfinitePlan em ${escapeHtml(formatDateExtenso())}.</div>
</body>
</html>`;
}

function procRows(items: ResumoLineItem[], withValues: boolean): string {
  if (items.length === 0) {
    return `<tr><td colspan="${withValues ? 4 : 2}" style="text-align:center;color:#9ca3af;font-style:italic;padding:10px 0;">Nenhum procedimento adicionado</td></tr>`;
  }
  return items
    .map((it) => {
      const nome = escapeHtml(it.procedure_name || "Procedimento");
      const src =
        it.source === "protocolo"
          ? `<div class="src">Protocolo</div>`
          : `<div class="src">Adicional</div>`;
      if (!withValues) {
        return `<tr><td>${nome}${src}</td><td class="num">${it.quantity}</td></tr>`;
      }
      const desc =
        it.discount_percent > 0 ? `${it.discount_percent}%` : "—";
      return `<tr>
        <td>${nome}${src}</td>
        <td class="num">${it.quantity}</td>
        <td class="num">${desc}</td>
        <td class="num">${formatBRL(lineNetCents(it))}</td>
      </tr>`;
    })
    .join("");
}

/** Resumo completo do orçamento — paciente, profissional e procedimentos. */
export function renderOrcamentoResumoHtml(data: OrcamentoResumoData): string {
  const cpf = data.paciente_cpf ? formatCPF(data.paciente_cpf) : "—";

  const pacienteBlock = `
    <div>
      <div class="kv"><div class="label">Paciente</div><div class="value">${escapeHtml(data.paciente_nome || "—")}</div></div>
      <div class="kv"><div class="label">CPF</div><div class="value">${cpf}</div></div>
      ${data.paciente_email ? `<div class="kv"><div class="label">E-mail</div><div class="value">${escapeHtml(data.paciente_email)}</div></div>` : ""}
      ${data.paciente_telefone ? `<div class="kv"><div class="label">Telefone</div><div class="value">${escapeHtml(data.paciente_telefone)}</div></div>` : ""}
    </div>`;

  const profissionalBlock = `
    <div>
      <div class="kv"><div class="label">Profissional</div><div class="value">${escapeHtml(data.profissional_nome || "—")}</div></div>
      ${data.profissional_especialidade ? `<div class="kv"><div class="label">Especialidade</div><div class="value">${escapeHtml(data.profissional_especialidade)}</div></div>` : ""}
      ${data.profissional_crm ? `<div class="kv"><div class="label">CRM</div><div class="value">${escapeHtml(data.profissional_crm)}</div></div>` : ""}
      ${data.profissional_email ? `<div class="kv"><div class="label">E-mail</div><div class="value">${escapeHtml(data.profissional_email)}</div></div>` : ""}
    </div>`;

  const statusTxt = data.status ? escapeHtml(data.status) : "—";

  const body = `
    <div class="section-title">Dados</div>
    <div class="cols">${pacienteBlock}${profissionalBlock}</div>

    ${
      data.protocolo_nome
        ? `<div class="kv" style="margin-top:12px"><div class="label">Protocolo base</div><div class="value">${escapeHtml(data.protocolo_nome)}</div></div>`
        : ""
    }

    <div class="section-title">Procedimentos</div>
    <table class="proc">
      <thead>
        <tr><th>Procedimento</th><th class="num">Qtd</th><th class="num">Desc.</th><th class="num">Valor</th></tr>
      </thead>
      <tbody>${procRows(data.items, true)}</tbody>
    </table>

    <div class="values">
      <div class="row total"><span>Valor total</span><span>${formatBRL(data.valor_total_cents)}</span></div>
      ${data.discount_percent > 0 ? `<div class="row muted"><span>Desconto aplicado</span><span>${data.discount_percent}%</span></div>` : ""}
    </div>

    <div class="section-title">Informações</div>
    <div class="cols">
      <div class="kv"><div class="label">Criado em</div><div class="value">${formatDateBR(data.created_at)}</div></div>
      <div class="kv"><div class="label">Status</div><div class="value">${statusTxt}</div></div>
    </div>
    ${
      data.observacoes
        ? `<div class="kv" style="margin-top:12px"><div class="label">Observações</div><div class="obs">${escapeHtml(data.observacoes)}</div></div>`
        : ""
    }
  `;

  return shell(
    "Resumo do Orçamento",
    `Paciente: ${data.paciente_nome || "—"}`,
    body,
  );
}

/** Resumo financeiro — valores e condições de pagamento. */
export function renderFinanceiroResumoHtml(data: OrcamentoResumoData): string {
  const somaItens = data.items.reduce((acc, it) => acc + lineNetCents(it), 0);
  const total = data.valor_total_cents;
  const descontoValor =
    data.discount_percent > 0 && somaItens > total ? somaItens - total : 0;

  const isCredito = data.payment_method === "credito";
  const parcelamento =
    isCredito && data.installments && data.installments > 1
      ? `${data.installments}x${
          data.installment_value_cents
            ? ` de ${formatBRL(data.installment_value_cents)}`
            : ""
        }`
      : null;

  const body = `
    <div class="section-title">Partes</div>
    <div class="cols">
      <div class="kv"><div class="label">Paciente</div><div class="value">${escapeHtml(data.paciente_nome || "—")}</div></div>
      <div class="kv"><div class="label">Profissional</div><div class="value">${escapeHtml(data.profissional_nome || "—")}</div></div>
    </div>

    <div class="section-title">Procedimentos</div>
    <table class="proc">
      <thead>
        <tr><th>Procedimento</th><th class="num">Qtd</th><th class="num">Desc.</th><th class="num">Valor</th></tr>
      </thead>
      <tbody>${procRows(data.items, true)}</tbody>
    </table>

    <div class="values">
      <div class="row"><span>Subtotal dos procedimentos</span><span>${formatBRL(somaItens)}</span></div>
      ${descontoValor > 0 ? `<div class="row muted"><span>Desconto${data.discount_percent > 0 ? ` (${data.discount_percent}%)` : ""}</span><span>- ${formatBRL(descontoValor)}</span></div>` : ""}
      <div class="row total"><span>Total a pagar</span><span>${formatBRL(total)}</span></div>
    </div>

    <div class="section-title">Condições de pagamento</div>
    <div class="kv"><div class="label">Forma de pagamento</div><div class="value">${escapeHtml(paymentLabel(data))}</div></div>
    ${parcelamento ? `<div class="kv"><div class="label">Parcelamento</div><div class="value">${escapeHtml(parcelamento)}</div></div>` : ""}
    ${
      data.custom_payment_method && !data.payment_method
        ? `<div class="kv" style="margin-top:8px"><div class="label">Detalhes</div><div class="obs">${escapeHtml(data.custom_payment_method)}</div></div>`
        : ""
    }
  `;

  return shell(
    "Resumo Financeiro",
    `Paciente: ${data.paciente_nome || "—"} · Emitido em ${formatDateBR(data.created_at)}`,
    body,
  );
}
