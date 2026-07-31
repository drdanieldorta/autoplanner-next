import "server-only";

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
import { feegow } from "@/lib/integrations/feegow";
import { getCompanyCredentials } from "@/lib/integrations/credentials";
import { createAdminClient } from "@/lib/supabase/admin";

export type BuiltContract = {
  html: string;
  /** Nome do documento, usado na Authentique e no filename do download. */
  docName: string;
  proposta: Record<string, unknown>;
};

export type BuildContractResult =
  | { ok: true; value: BuiltContract }
  | { ok: false; error: string; status: number };

type LineProc = { procedure_name?: string; quantity?: number };

/**
 * Monta o HTML do contrato de uma proposta.
 *
 * Extraído de `/api/contratos/envio-manual` para ser compartilhado com
 * `/api/contratos/[propostaId]/pdf` — os dois precisam produzir
 * exatamente o mesmo documento, senão o que o usuário imprime diverge do
 * que o paciente assinou.
 *
 * Dois caminhos de render, herdados do n8n:
 *   - com `contract_id`: HTML do usuário, com `{{variáveis}}` substituídas
 *   - sem `contract_id`: TCLE padrão do sistema, code-driven
 */
export async function buildContractHtml(args: {
  propostaId: string;
  companyId: string;
}): Promise<BuildContractResult> {
  const admin = createAdminClient();
  const creds = await getCompanyCredentials(args.companyId);

  const propostaResult = await admin
    .from("propostas")
    .select("*")
    .eq("id", args.propostaId)
    .maybeSingle();
  const proposta = propostaResult.data as Record<string, unknown> | null;
  if (!proposta) return { ok: false, error: "Proposta não encontrada", status: 404 };
  if (proposta.company_id !== args.companyId) {
    return { ok: false, error: "Acesso negado a esta proposta", status: 403 };
  }

  // Contrato custom (se a proposta apontar para um)
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

  // Procedimentos: itens do protocolo base (se houver) + adicionais.
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
    .map((p) => `${p.procedure_name ?? "Procedimento"} (Qtd: ${p.quantity ?? 1})`)
    .join(", ");

  const valorTotal = (proposta.valor_total_cents as number) ?? 0;
  const installments = (proposta.installments as number | null) ?? null;
  const installmentValueCents =
    (proposta.installment_value_cents as number | null) ?? null;
  const parcelasTexto =
    installments && installments > 1
      ? `${installments}x${
          installmentValueCents ? ` de ${formatBRL(installmentValueCents)}` : ""
        }`
      : "";

  // Endereço completo + nascimento vêm direto da Feegow na hora do
  // render — o paciente pode ter atualizado os dados depois da criação
  // da proposta. Modo manual ou Feegow fora do ar deixa os campos vazios.
  let extras = {
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
  if (pacienteIdRaw && pacienteIdRaw !== "manual" && creds?.feegow_token) {
    try {
      const data = await feegow(creds.feegow_token).searchPatient(pacienteIdRaw);
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
      extras.nascimento || ((proposta.paciente_nascimento as string) ?? ""),
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
    valor_parcela: installmentValueCents ? formatBRL(installmentValueCents) : "",
  };

  const branding = await getDocumentBranding(args.companyId);

  const html = contractContent
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

  const docName = `Contrato - ${variables.paciente_nome} - ${formatDateExtenso()} - Proposta - ${
    proposta.id_proposta_api ?? args.propostaId
  }`;

  return { ok: true, value: { html, docName, proposta } };
}
