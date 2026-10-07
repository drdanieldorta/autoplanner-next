/**
 * Renderização do contrato do usuário — o modelo escrito em
 * `contracts.content`.
 *
 * Módulo neutro (sem `server-only`): o MESMO código roda no servidor, ao
 * montar o PDF, e no navegador, na prévia do editor de contrato. É isso que
 * garante que a prévia mostre exatamente o que o paciente vai assinar.
 *
 * O conteúdo é **Markdown** (decisão 2026-10-07). Antes era injetado como
 * HTML cru, sem nenhum tratamento de quebra de linha: um modelo colado em
 * texto puro saía num bloco só, e um modelo em Markdown saía com `#` e `**`
 * impressos. Nenhum contrato em produção continha HTML, então a troca é
 * segura: texto puro vira parágrafos e quebras de linha, e nada mais.
 */

import { marked } from "marked";

import { CONTRACT_VARIABLES } from "@/lib/contracts/variables";
import { formatCurrency } from "@/lib/currency";

/** Um documento do pacote, antes de virar página do PDF. */
export type Fragmento = {
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
 * emitido.
 */
export function montarShell(fragmentos: Fragmento[], brandingCss: string): string {
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

export const CUSTOM_DOC_CLASS = "doc-custom";

/**
 * CSS do contrato do usuário. A primeira regra é a que sempre existiu
 * (fonte, tamanho e o padding de página que antes vivia no `body`); as
 * demais só dão forma ao que o Markdown produz. Tudo escopado em
 * `.doc-custom` para não vazar para o TCLE padrão, que divide a folha de
 * estilo no mesmo PDF.
 */
export const CUSTOM_DOC_CSS = [
  ".doc-custom { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.55; color: #111; padding: 20mm; }",
  ".doc-custom h1, .doc-custom h2, .doc-custom h3, .doc-custom h4 { line-height: 1.25; margin: 18px 0 8px; page-break-after: avoid; }",
  ".doc-custom h1 { font-size: 20px; }",
  ".doc-custom h2 { font-size: 16px; }",
  ".doc-custom h3 { font-size: 13px; }",
  ".doc-custom h4 { font-size: 12px; }",
  ".doc-custom p { margin: 0 0 8px; }",
  ".doc-custom ul, .doc-custom ol { margin: 0 0 8px; padding-left: 22px; }",
  ".doc-custom li { margin: 2px 0; }",
  ".doc-custom table { border-collapse: collapse; width: 100%; margin: 8px 0 12px; }",
  ".doc-custom th, .doc-custom td { border: 1px solid #bbb; padding: 4px 8px; vertical-align: top; }",
  ".doc-custom th { background: #f1f1f1; font-weight: bold; }",
  // Alinhamento vem do Markdown (`:---`, `---:`) como atributo `align`;
  // estas regras só o tornam explícito, sem sobrescrever.
  ".doc-custom th:not([align]) { text-align: left; }",
  '.doc-custom [align="right"] { text-align: right; }',
  '.doc-custom [align="center"] { text-align: center; }',
  ".doc-custom tr { page-break-inside: avoid; }",
  ".doc-custom blockquote { margin: 8px 0 12px; padding: 6px 12px; border-left: 3px solid #999; background: #fafafa; }",
  ".doc-custom blockquote p { margin: 0; }",
  ".doc-custom hr { border: 0; border-top: 1px solid #999; margin: 14px 0; }",
].join("\n");

export type ProcedimentoLinha = {
  nome: string;
  quantidade: number;
  /** Centavos. `null` quando o item não tem valor (orçamento legado). */
  valor_unit_cents: number | null;
  desconto_percent: number;
};

export type CustomContractInput = {
  /** Markdown do modelo, como está em `contracts.content`. */
  content: string;
  /**
   * Variáveis simples (`{{paciente_nome}}`, `{{total}}`...). `procedimentos`
   * NÃO entra aqui: ela é estrutural e vem em `procedimentos`.
   */
  variables: Record<string, string>;
  procedimentos: ProcedimentoLinha[];
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Texto que vai ENTRAR no Markdown (antes do parse) não pode carregar
 * marcação: um procedimento chamado "Botox *premium*" sairia em itálico.
 */
function escapeMarkdownInline(value: string): string {
  return value.replace(/\s*\n\s*/g, " ").replace(/[\\`*_[\]|<>#~]/g, (c) => `\\${c}`);
}

/**
 * Linha feita só de `_` é linha de assinatura nos modelos antigos
 * ("___________" acima de "Paciente: ..."). Em Markdown, três ou mais `_`
 * sozinhos na linha são uma régua horizontal. Escapar preserva o traço.
 */
function protegerLinhasDeAssinatura(md: string): string {
  return md.replace(/^([ \t]*)(_{3,})([ \t]*)$/gm, (_m, antes: string, tracos: string, depois: string) =>
    `${antes}${tracos.replace(/_/g, "\\_")}${depois}`,
  );
}

function valorLinha(p: ProcedimentoLinha): number | null {
  if (p.valor_unit_cents === null) return null;
  return Math.round(p.quantidade * p.valor_unit_cents * (1 - (p.desconto_percent || 0) / 100));
}

/**
 * `{{procedimentos}}` sozinho numa linha vira uma tabela Markdown — assim
 * ela recebe o mesmo estilo que as tabelas que o usuário escreve no modelo.
 * Com valor por item, quatro colunas; num orçamento sem valores, só nome e
 * quantidade (o mesmo que o TCLE padrão mostra).
 */
function tabelaProcedimentos(procs: ProcedimentoLinha[]): string {
  if (procs.length === 0) return "—";
  const comValores = procs.some((p) => p.valor_unit_cents !== null);
  const cel = (s: string) => escapeMarkdownInline(s);
  if (!comValores) {
    return [
      "| Procedimento | Qtd |",
      "| :--- | ---: |",
      ...procs.map((p) => `| ${cel(p.nome)} | ${p.quantidade} |`),
    ].join("\n");
  }
  const linhas = procs.map((p) => {
    const unit = p.valor_unit_cents === null ? "—" : formatCurrency(p.valor_unit_cents);
    const sub = valorLinha(p);
    return `| ${cel(p.nome)} | ${p.quantidade} | ${unit} | ${sub === null ? "—" : formatCurrency(sub)} |`;
  });
  return [
    "| Procedimento | Qtd | Valor unitário | Subtotal |",
    "| :--- | ---: | ---: | ---: |",
    ...linhas,
  ].join("\n");
}

/** `{{procedimentos}}` no meio de uma frase: lista em texto, como sempre foi. */
function listaProcedimentosInline(procs: ProcedimentoLinha[]): string {
  if (procs.length === 0) return "—";
  return procs
    .map((p) => `${escapeMarkdownInline(p.nome)} (Qtd: ${p.quantidade})`)
    .join(", ");
}

const RE_PROCEDIMENTOS_LINHA = /^[ \t]*\{\{procedimentos\}\}[ \t]*$/gm;
const RE_PROCEDIMENTOS = /\{\{procedimentos\}\}/g;

/**
 * Markdown → HTML, com as variáveis preenchidas. Ordem importa:
 *
 * 1. `{{procedimentos}}` é resolvida ANTES do parse, porque produz
 *    Markdown (uma tabela ou uma lista em texto).
 * 2. O Markdown vira HTML. `breaks: true` faz uma quebra de linha simples
 *    virar `<br>` — é o que todo modelo colado em texto puro espera.
 * 3. As demais variáveis entram DEPOIS do parse, escapadas como HTML. Um
 *    `*` ou `|` no nome de um paciente não pode mexer no layout.
 */
export function renderCustomContract(input: CustomContractInput): string {
  let md = protegerLinhasDeAssinatura(input.content);
  md = md.replace(
    RE_PROCEDIMENTOS_LINHA,
    () => `\n${tabelaProcedimentos(input.procedimentos)}\n`,
  );
  md = md.replace(RE_PROCEDIMENTOS, () => listaProcedimentosInline(input.procedimentos));

  let html = marked.parse(md, { gfm: true, breaks: true }) as string;

  for (const { key } of CONTRACT_VARIABLES) {
    const name = key.replace(/[{}]/g, "");
    if (name === "procedimentos") continue;
    const value = escapeHtml(input.variables[name] ?? "");
    html = html.replace(new RegExp(`\\{\\{${name}\\}\\}`, "g"), () => value);
  }
  return html;
}

/** "7 de outubro de 2026" — o mesmo formato de `formatDateExtenso` (servidor). */
function dataExtensoHoje(): string {
  return new Date().toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Dados fictícios para a prévia do editor. Coerentes entre si (2 × 1.500 +
 * 3 × 200 = 3.600; 10% de desconto = 3.240) para a tabela de procedimentos
 * e o quadro de valores baterem.
 */
export function previewSample(): {
  variables: Record<string, string>;
  procedimentos: ProcedimentoLinha[];
} {
  return {
    variables: {
      paciente_nome: "Maria Aparecida da Silva",
      paciente_cpf: "123.456.789-09",
      paciente_email: "maria.silva@exemplo.com",
      paciente_telefone: "(11) 98765-4321",
      paciente_nascimento: "20/05/1985",
      paciente_endereco: "Rua das Acácias",
      paciente_numero: "123",
      paciente_complemento: "Apto 45",
      paciente_bairro: "Jardim Primavera",
      paciente_cidade: "Guarulhos",
      paciente_estado: "SP",
      paciente_cep: "07000-000",
      profissional_nome: "Dra. Exemplo de Souza",
      profissional_cpf: "987.654.321-00",
      profissional_crm: "123456",
      profissional_especialidade: "Dermatologia",
      subtotal: formatCurrency(360000),
      desconto: `${formatCurrency(36000)} (10%)`,
      total: formatCurrency(324000),
      data_contrato: dataExtensoHoje(),
      forma_pagamento: "CRÉDITO",
      parcelas: `3x de ${formatCurrency(108000)}`,
      valor_parcela: formatCurrency(108000),
    },
    procedimentos: [
      { nome: "Toxina botulínica (face completa)", quantidade: 2, valor_unit_cents: 150000, desconto_percent: 0 },
      { nome: "Laser fracionado", quantidade: 3, valor_unit_cents: 20000, desconto_percent: 0 },
    ],
  };
}
