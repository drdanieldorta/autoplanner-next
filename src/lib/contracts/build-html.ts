import "server-only";

import {
  formatBRL,
  formatCPF,
  formatDateExtenso,
  replaceContractVariables,
} from "@/lib/contracts/render";
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

type LineProc = { procedure_name?: string; quantity?: number };

/** Um documento do pacote, antes de virar página do PDF. */
type Fragmento = {
  /** Classe do wrapper — também escopa o CSS deste tipo de documento. */
  classe: string;
  css: string;
  body: string;
};

/**
 * Junta os fragmentos num `<html>` só.
 *
 * Por que um documento só: `createDocument` da Authentique recebe
 * `$file: Upload!` — SINGULAR. Uma assinatura para vários papéis só existe
 * concatenando os papéis num PDF. Isso é sorte, não limitação: tudo abaixo
 * do PDF (document_id, webhook, acervo, anexo no prontuário) segue 1:1.
 *
 * ⚠️ NÃO resetar a margem do `body`. Ela é a margem default do navegador
 * (8px) e sempre esteve valendo — zerá-la deslocaria ~2mm todo contrato já
 * emitido, e a garantia aqui é que um pacote de um documento só saia
 * idêntico ao de antes desta feature.
 */
function montarShell(fragmentos: Fragmento[], brandingCss: string): string {
  // Dedup por classe: três contratos custom compartilham uma regra só.
  const cssPorClasse = new Map<string, string>();
  for (const f of fragmentos) cssPorClasse.set(f.classe, f.css);

  const css = [
    // Quebra ANTES de cada documento exceto o primeiro. Com um documento
    // só, não produz efeito nenhum.
    ".doc + .doc { page-break-before: always; }",
    brandingCss,
    ...cssPorClasse.values(),
  ].join("\n");

  const corpo = fragmentos
    .map((f) => `<div class="doc ${f.classe}">${f.body}</div>`)
    .join("");

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Contrato</title><style>${css}</style></head><body>${corpo}</body></html>`;
}

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

  const fragmentos: Fragmento[] = [];

  // Modelos do usuário. O estilo do wrapper é o que antes estava no
  // `<body style="...">` — mesmo offset, agora numa classe, porque o body
  // é compartilhado por todos os documentos do pacote.
  for (const contrato of contratos) {
    fragmentos.push({
      classe: "doc-custom",
      css: ".doc-custom { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.55; color: #111; padding: 20mm; }",
      body: `${renderBrandingHeader(branding)}${replaceContractVariables(contrato.content, variables)}`,
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
        subtotal_cents: valorTotal,
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
