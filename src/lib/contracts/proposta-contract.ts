import "server-only";

import type { Proposta } from "@/lib/services/propostas";
import { feegow } from "@/lib/integrations/feegow";
import {
  formatBRL,
  formatCPF,
  formatDateExtenso,
  replaceContractVariables,
} from "@/lib/contracts/render";
import { renderDefaultSystemContract } from "@/lib/contracts/templates/default-system-contract";
import { createAdminClient } from "@/lib/supabase/admin";

type LineProc = { procedure_name?: string; quantity?: number };

export type PropostaContract = {
  html: string;
  /** Variáveis resolvidas — usadas p/ nome do doc e signers na Authentique. */
  variables: Record<string, string>;
};

/**
 * Monta o HTML do contrato de uma proposta — EXATAMENTE o mesmo HTML que
 * `envio-manual` converte em PDF e envia à Authentique. Extraído daquele
 * route handler para poder ser reusado pelo download/impressão do contrato
 * (`GET /api/propostas/:id/pdf?tipo=contrato`) sem duplicar a lógica.
 *
 *   - Com `contract_id`: usa o template custom (substitui `{{vars}}`).
 *   - Sem: usa o template do sistema (TCLE completo, code-driven, com
 *     termos condicionais IM/EV/Implante).
 *
 * Lê `contracts.content` e `protocol_items` via admin client (mesmo padrão
 * do envio-manual). Endereço/nascimento vêm da Feegow quando há token —
 * o paciente pode ter atualizado os dados depois de criada a proposta.
 */
export async function buildContractHtmlForProposta(
  proposta: Proposta,
  opts: { feegowToken?: string | null } = {},
): Promise<PropostaContract> {
  const admin = createAdminClient();

  // 1. Contract custom (se houver)
  let contractContent: string | null = null;
  if (proposta.contract_id) {
    const contractResult = await admin
      .from("contracts")
      .select("content")
      .eq("id", proposta.contract_id)
      .maybeSingle();
    const contract = contractResult.data as { content?: string } | null;
    contractContent = contract?.content ?? null;
  }

  // 2. Procedimentos: itens do protocolo base (se houver) + adicionais.
  const protocolItems: LineProc[] = await (async () => {
    if (!proposta.protocolo_id) return [];
    const r = await admin
      .from("protocol_items")
      .select("procedure_name, quantity")
      .eq("protocol_id", proposta.protocolo_id);
    if (r.error) return [];
    return (r.data ?? []) as LineProc[];
  })();
  const adicionais = Array.isArray(proposta.procedimentos_adicionais)
    ? (proposta.procedimentos_adicionais as LineProc[])
    : [];
  const todosProcedimentos = [...protocolItems, ...adicionais];
  const procedimentosTexto = todosProcedimentos
    .map(
      (p) => `${p.procedure_name ?? "Procedimento"} (Qtd: ${p.quantity ?? 1})`,
    )
    .join(", ");

  const valorTotal = proposta.valor_total_cents ?? 0;
  const installments = proposta.installments ?? null;
  const installmentValueCents = proposta.installment_value_cents ?? null;
  const parcelasTexto =
    installments && installments > 1
      ? `${installments}x${
          installmentValueCents
            ? ` de ${formatBRL(installmentValueCents)}`
            : ""
        }`
      : "";

  // 3. Endereço completo + nascimento vêm direto da Feegow no momento da
  //    renderização. Modo manual (paciente_id === "manual") ou sem token
  //    pula isso e os campos saem vazios (ou caem no que há na proposta).
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
  const pacienteIdRaw = proposta.paciente_id || "";
  if (pacienteIdRaw && pacienteIdRaw !== "manual" && opts.feegowToken) {
    try {
      const data = await feegow(opts.feegowToken).searchPatient(pacienteIdRaw);
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
    paciente_nome: proposta.paciente_nome ?? "",
    paciente_cpf: formatCPF(proposta.paciente_cpf ?? ""),
    paciente_email: proposta.paciente_email ?? "",
    paciente_telefone: proposta.paciente_telefone ?? "",
    paciente_nascimento: extras.nascimento || (proposta.paciente_nascimento ?? ""),
    paciente_endereco: extras.endereco,
    paciente_numero: extras.numero,
    paciente_complemento: extras.complemento,
    paciente_bairro: extras.bairro || (proposta.paciente_bairro ?? ""),
    paciente_cidade: extras.cidade,
    paciente_estado: extras.estado,
    paciente_cep: extras.cep,
    profissional_nome: proposta.profissional_nome ?? "",
    profissional_cpf: formatCPF(proposta.profissional_cpf ?? ""),
    profissional_crm: proposta.profissional_crm ?? "",
    profissional_especialidade: proposta.profissional_especialidade ?? "",
    procedimentos: procedimentosTexto || "—",
    subtotal: formatBRL(valorTotal),
    desconto: "R$ 0,00",
    total: formatBRL(valorTotal),
    data_contrato: formatDateExtenso(),
    forma_pagamento: (proposta.payment_method ?? "—").toString().toUpperCase(),
    parcelas: parcelasTexto,
    valor_parcela: installmentValueCents ? formatBRL(installmentValueCents) : "",
  };

  // 4. Renderiza HTML
  //   - Com contract_id: HTML do user (substitui {{vars}}).
  //   - Sem contract_id: template do sistema (renderizado direto).
  const html = contractContent
    ? `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Contrato</title></head><body style="font-family:Arial,sans-serif;font-size:12px;line-height:1.55;color:#111;padding:20mm;">${replaceContractVariables(contractContent, variables)}</body></html>`
    : renderDefaultSystemContract({
        paciente_nome: proposta.paciente_nome ?? "",
        paciente_cpf: proposta.paciente_cpf ?? "",
        profissional_nome: proposta.profissional_nome ?? "",
        profissional_cpf: proposta.profissional_cpf ?? "",
        profissional_crm: proposta.profissional_crm ?? "",
        procedimentos: todosProcedimentos,
        subtotal_cents: valorTotal,
        total_cents: valorTotal,
        forma_pagamento: proposta.payment_method ?? null,
        custom_payment_method: proposta.custom_payment_method ?? null,
        installments,
        installment_value_cents: installmentValueCents,
      });

  return { html, variables };
}
