import "server-only";

import {
  CUSTOM_DOC_CLASS,
  CUSTOM_DOC_CSS,
  montarShell,
  renderCustomContract,
  type Fragmento,
  type ProcedimentoLinha,
} from "@/lib/contracts/custom-doc";
import { formatBRL, formatCPF, formatDateExtenso } from "@/lib/contracts/render";
import {
  buildDefaultContractCss,
  renderDefaultSystemContract,
} from "@/lib/contracts/templates/default-system-contract";
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

type LineProc = {
  procedure_name?: string;
  quantity?: number;
  value_cents?: number | null;
  discount_percent?: number | null;
};

/**
 * Monta o HTML dos documentos de uma proposta, num PDF só.
 *
 * Compartilhado por `/api/contratos/envio-manual` e
 * `/api/contratos/[propostaId]/pdf` — os dois precisam produzir
 * exatamente o mesmo documento, senão o que o usuário imprime diverge do
 * que o paciente assinou.
 *
 * A seleção vem de `proposta_contracts` (modelos, em ordem) e de
 * `propostas.incluir_tcle_padrao` (o TCLE code-driven, que não é linha em
 * `contracts`). O TCLE, quando marcado, entra por ÚLTIMO — ele fecha o
 * pacote, e é assim que a tela de seleção o apresenta.
 *
 * `propostas.contract_id` NÃO é mais lida: a migration de
 * `proposta_contracts` fez o backfill dela. A coluna segue na tabela,
 * marcada como legada.
 */
export async function buildContractsHtml(args: {
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

  // Modelos escolhidos neste orçamento, na ordem definida.
  const vinculosResult = await admin
    .from("proposta_contracts")
    .select("contract_id, ordem")
    .eq("proposta_id", args.propostaId)
    .order("ordem", { ascending: true });
  const vinculos = (vinculosResult.data ?? []) as Array<{
    contract_id: string;
    ordem: number;
  }>;

  const contratos: Array<{ id: string; name: string; content: string }> = [];
  if (vinculos.length > 0) {
    const contratosResult = await admin
      .from("contracts")
      .select("id, name, content")
      .in(
        "id",
        vinculos.map((v) => v.contract_id),
      );
    const porId = new Map(
      ((contratosResult.data ?? []) as Array<{
        id: string;
        name: string;
        content: string | null;
      }>).map((c) => [c.id, c]),
    );
    // Percorre `vinculos` (ordenado), não o resultado do `.in()`, que o
    // Postgres devolve em ordem arbitrária.
    for (const v of vinculos) {
      const c = porId.get(v.contract_id);
      if (c?.content) contratos.push({ id: c.id, name: c.name, content: c.content });
    }
  }

  const incluirTcle = Boolean(proposta.incluir_tcle_padrao);

  // Guarda: nada selecionado. Consequência direta de o TCLE ter deixado de
  // ser pré-marcado — melhor um erro claro no envio do que um PDF em branco
  // chegando ao paciente para assinar.
  if (contratos.length === 0 && !incluirTcle) {
    return {
      ok: false,
      error:
        "Nenhum documento selecionado para este orçamento. Escolha ao menos um modelo ou marque o contrato padrão do sistema.",
      status: 422,
    };
  }

  // Procedimentos: itens do protocolo base (se houver) + adicionais.
  const protocolItems: LineProc[] = await (async () => {
    if (!proposta.protocolo_id) return [];
    const r = await admin
      .from("protocol_items")
      .select("procedure_name, quantity, value_cents, discount_percent")
      .eq("protocol_id", proposta.protocolo_id as string);
    if (r.error) return [];
    return (r.data ?? []) as LineProc[];
  })();
  const adicionais = Array.isArray(proposta.procedimentos_adicionais)
    ? (proposta.procedimentos_adicionais as LineProc[])
    : [];
  const todosProcedimentos = [...protocolItems, ...adicionais];
  const procedimentos: ProcedimentoLinha[] = todosProcedimentos.map((p) => ({
    nome: p.procedure_name ?? "Procedimento",
    quantidade: p.quantity ?? 1,
    valor_unit_cents: typeof p.value_cents === "number" ? p.value_cents : null,
    desconto_percent: p.discount_percent ?? 0,
  }));

  // `valor_total_cents` é o valor FINAL do orçamento (depois do desconto
  // global). O subtotal é a soma dos itens — a mesma conta do formulário de
  // orçamento, desconto por item incluído. Antes, subtotal e total eram o
  // mesmo número e o desconto saía fixo em R$ 0,00 em todo contrato.
  const valorTotal = (proposta.valor_total_cents as number) ?? 0;
  const temValoresPorItem = procedimentos.some((p) => p.valor_unit_cents !== null);
  const somaItens = procedimentos.reduce((acc, p) => {
    if (p.valor_unit_cents === null) return acc;
    return (
      acc +
      Math.round(p.quantidade * p.valor_unit_cents * (1 - p.desconto_percent / 100))
    );
  }, 0);
  // Orçamento legado sem valor por item: não há como saber o subtotal, então
  // ele é o total e o desconto é zero — exatamente o que sempre foi impresso.
  const subtotal = temValoresPorItem ? Math.max(somaItens, valorTotal) : valorTotal;
  const desconto = subtotal - valorTotal;
  const descontoPercent = (proposta.discount_percent as number | null) ?? 0;
  const descontoTexto =
    desconto > 0 && descontoPercent > 0
      ? `${formatBRL(desconto)} (${descontoPercent}%)`
      : formatBRL(desconto);
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
    subtotal: formatBRL(subtotal),
    desconto: descontoTexto,
    total: formatBRL(valorTotal),
    data_contrato: formatDateExtenso(),
    forma_pagamento: ((proposta.payment_method as string) ?? "—")
      .toString()
      .toUpperCase(),
    parcelas: parcelasTexto,
    valor_parcela: installmentValueCents ? formatBRL(installmentValueCents) : "",
  };

  const branding = await getDocumentBranding(args.companyId);

  const fragmentos: Fragmento[] = [];

  // Modelos do usuário: Markdown → HTML, variáveis preenchidas, com a tabela
  // de procedimentos estruturada. Mesmo renderizador da prévia do editor.
  for (const contrato of contratos) {
    fragmentos.push({
      classe: CUSTOM_DOC_CLASS,
      css: CUSTOM_DOC_CSS,
      body: `${renderBrandingHeader(branding)}${renderCustomContract({
        content: contrato.content,
        variables,
        procedimentos,
      })}`,
    });
  }

  // TCLE padrão do sistema, por último.
  if (incluirTcle) {
    fragmentos.push({
      classe: "doc-tcle",
      css: buildDefaultContractCss(".doc-tcle", branding),
      body: renderDefaultSystemContract({
        branding,
        paciente_nome: (proposta.paciente_nome as string) ?? "",
        paciente_cpf: (proposta.paciente_cpf as string) ?? "",
        profissional_nome: (proposta.profissional_nome as string) ?? "",
        profissional_cpf: (proposta.profissional_cpf as string) ?? "",
        profissional_crm: (proposta.profissional_crm as string) ?? "",
        procedimentos: todosProcedimentos,
        subtotal_cents: subtotal,
        total_cents: valorTotal,
        forma_pagamento: (proposta.payment_method as string | null) ?? null,
        custom_payment_method:
          (proposta.custom_payment_method as string | null) ?? null,
        installments,
        installment_value_cents: installmentValueCents,
      }),
    });
  }

  const html = montarShell(fragmentos, renderBrandingCss(branding));

  const docName = `Contrato - ${variables.paciente_nome} - ${formatDateExtenso()} - Proposta - ${
    proposta.id_proposta_api ?? args.propostaId
  }`;

  return { ok: true, value: { html, docName, proposta } };
}
