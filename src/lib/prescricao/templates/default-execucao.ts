import "server-only";

import {
  renderBrandingCss,
  renderBrandingHeader,
  type DocumentBranding,
} from "@/lib/branding/document";
import { resolveDocPalette } from "@/lib/branding/palette";
import { VIA_CURTA } from "@/lib/prescricao/enums";
import type { PlanoExecucao } from "@/lib/prescricao/types";

/**
 * Folha de execução de enfermagem — HTML → PDF via Puppeteer.
 *
 * Espelho estrutural de `contracts/templates/default-system-contract.ts`:
 * CSS inline (Puppeteer não carrega folha externa) e `escapeHtml` em todo
 * dado interpolado.
 *
 * DUAS REGRAS ESTRUTURAIS, não estéticas:
 *
 * 1. **Zero `{{var}}`.** Este template é code-driven. `replaceContractVariables`
 *    substitui variável ausente por STRING VAZIA (contracts/render.ts:9-21):
 *    um campo clínico que some sem deixar rastro não é bug de layout, é
 *    falha de segurança. Aqui campo ausente vira "—" visível.
 *
 * 2. **A folha não carrega dinheiro.** Nenhum valor, nenhuma forma de
 *    pagamento, nenhum `formatBRL`. Este papel circula na sala de preparo;
 *    preço ali é ruído e risco.
 *
 * Sobre o NOME do documento: sob a COFEN 358/2009, "prescrição de
 * enfermagem" é o ato privativo do enfermeiro dentro do Processo de
 * Enfermagem — não é ordem médica. Por isso o documento se intitula
 * CRONOGRAMA DE APLICAÇÕES e o rodapé declara o que ele não é.
 *
 * ⚠️ DOSE (2026-08-07): a dose passou a ser OPCIONAL por item. Enquanto
 * nenhum item do plano tiver dose, o documento sai exatamente como antes
 * — inclusive o rodapé afirmando que não informa dose. Assim que qualquer
 * item tiver, a coluna DOSE aparece e o rodapé TROCA de texto, porque
 * aquela afirmação passaria a ser falsa. Diluente e velocidade de infusão
 * continuam fora de escopo, e o rodapé segue declarando isso nos dois
 * casos. Se dose virar rotina, revisitar a questão da assinatura do
 * prescritor — hoje ele consta como referência, não como signatário.
 */

function buildCss(branding?: DocumentBranding): string {
  const palette = branding?.palette ?? resolveDocPalette(null, null);
  const branded = branding?.hasBranding ?? false;
  // Sem identidade configurada, o documento sai exatamente como saía antes.
  const secBg = branded ? palette.secondary : "#e5e7eb";
  const secFg = branded ? palette.onSecondary : "#111";
  const rule = branded ? palette.primary : "#111";
  return `
  /* NAO declarar "@page { margin: 0 }" aqui. Isso anula a caixa de margem que
     o Puppeteer usa para desenhar o footerTemplate, e o rodape passa a ser
     impresso POR CIMA do conteudo da pagina. As margens sao definidas em
     generatePdfFromHtml, e o padding do body fica zerado para nao somar. */
  body { font-family: Arial, sans-serif; font-size: 10.5px; line-height: 1.45; color: #111; padding: 0; }

  .head { border-bottom: 2px solid ${rule}; padding-bottom: 8px; margin-bottom: 12px; }
  .head .clinica { font-size: 10px; color: #555; text-align: center; margin-bottom: 6px; }
  .head h1 { text-align: center; font-size: 14px; font-weight: bold; letter-spacing: 0.05em; text-transform: uppercase; margin: 0; }
  .head .meta { text-align: center; font-size: 9.5px; color: #666; margin-top: 5px; }

  .supersede { border: 2px solid #111; padding: 6px 10px; margin-bottom: 12px; font-size: 10px; font-weight: bold; text-align: center; text-transform: uppercase; letter-spacing: 0.03em; }

  table.ident { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 10px; }
  table.ident td { vertical-align: top; width: 50%; border: 1px solid #d1d5db; padding: 7px 9px; }
  table.ident .lbl { font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.07em; color: #6b7280; margin-bottom: 3px; }
  table.ident .nome { font-weight: bold; font-size: 11.5px; }
  table.ident .linha { margin-top: 2px; }

  .alergias { padding: 8px 10px; margin-bottom: 12px; }
  .alergias.tem { background: #111; color: #fff; }
  .alergias.nao { border: 2px solid #111; }
  .alergias .t { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 3px; }
  .alergias .v { font-size: 13px; font-weight: bold; text-transform: uppercase; }
  .alergias .conf { margin-top: 7px; font-size: 9px; }

  .bloco { border-left: 3px solid #9ca3af; padding: 5px 0 5px 9px; margin-bottom: 9px; font-size: 10px; }
  .bloco.alerta { border-left-color: #111; }
  .bloco .t { font-weight: bold; text-transform: uppercase; font-size: 9px; letter-spacing: 0.06em; margin-bottom: 3px; }
  .bloco .c { white-space: pre-wrap; }

  /* page-break-after: um titulo de secao sozinho no fim da pagina nao
     significa nada — ele viaja junto com o que titula. */
  .sec { background: ${secBg}; color: ${secFg}; padding: 5px 10px; font-weight: bold; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; margin: 12px 0 7px 0; page-break-after: avoid; }

  table.grid { width: 100%; border-collapse: collapse; font-size: 10px; }
  table.grid thead { display: table-header-group; }
  table.grid tr { page-break-inside: avoid; }
  table.grid th { text-align: left; padding: 5px 6px; border-bottom: 2px solid #9ca3af; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; }
  table.grid td { padding: 5px 6px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  table.grid .n { width: 22px; color: #6b7280; }
  table.grid .cuid { color: #444; font-size: 9.5px; padding-top: 0; border-bottom: 1px solid #e5e7eb; }

  .dose { font-family: monospace; font-weight: bold; }
  .via { font-family: monospace; font-weight: bold; font-size: 11px; letter-spacing: 0.04em; }
  .via.falta { color: #111; background: #fde68a; padding: 1px 4px; }

  .blank { border-bottom: 1px solid #9ca3af; display: inline-block; }

  /* Lista de conduta assistencial: parte-la deixa órfãos soltos no topo da
     página seguinte, longe do título que dá sentido a eles. */
  .orient { font-size: 9px; margin: 4px 0 0 0; padding-left: 16px; page-break-inside: avoid;
            column-count: 2; column-gap: 14px; }
  .orient li { margin-bottom: 2px; break-inside: avoid; }
  /* Assinatura e disclaimer viajam juntos e nunca se separam. */
  .fecho { page-break-inside: avoid; }

  .assin { margin-top: 14px; font-size: 10px; }
  .assin .line { border-bottom: 1px solid #111; width: 62%; margin: 22px 0 4px 0; }
  .assin .who { font-weight: bold; }
  .assin .meta { font-size: 9px; color: #555; }

  .disclaimer { margin-top: 10px; padding-top: 6px; border-top: 1px solid #d1d5db; font-size: 8px; color: #555; line-height: 1.4; }

  .previa { position: fixed; top: 40%; left: 0; width: 100%; text-align: center; font-size: 54px; font-weight: bold; color: rgba(17,17,17,0.10); transform: rotate(-28deg); letter-spacing: 0.1em; }
${renderBrandingCss(branding ?? { companyName: "", logoDataUri: null, palette, hasBranding: false })}`;
}

/**
 * Conduta assistencial impressa em toda folha.
 *
 * ⚠️ ESTE TEXTO PRECISA DE APROVAÇÃO DO MÉDICO RESPONSÁVEL E DA ENFERMEIRA
 * RESPONSÁVEL TÉCNICA ANTES DE IR A PRODUÇÃO. É a única parte deste arquivo
 * que não é decisão técnica — orienta conduta à beira do paciente.
 */
export const ORIENTACOES_ENFERMAGEM: string[] = [
  "Conferir dois identificadores do paciente (nome completo e data de nascimento) antes de qualquer aplicação.",
  "Confirmar alergias com o paciente a cada sessão, mesmo que esta folha as declare.",
  "Conferir item, via e cuidados contra esta folha e contra a prescrição médica de registro antes do preparo.",
  "Não administrar item cuja via esteja em branco ou marcada para conferência sem confirmar com o profissional responsável.",
  "Registrar lote e validade dos produtos utilizados no prontuário do paciente.",
  "Manter técnica asséptica em todo o preparo e na administração.",
  "Observar o paciente durante a aplicação e por, no mínimo, 15 minutos após o término.",
  "Em qualquer intercorrência: interromper imediatamente, prestar assistência e comunicar o profissional responsável.",
  "Registrar data, hora, executante e COREN na grade de aplicações desta folha.",
  "Em caso de dúvida sobre qualquer item, NÃO administrar — esclarecer antes.",
];

/**
 * Orientações da folha. A menção a "dose" entra apenas quando o plano tem
 * dose: uma clínica que não usa a feature não pode ver o texto do documento
 * dela mudar sozinho.
 */
function orientacoesPara(temDose: boolean): string[] {
  if (!temDose) return ORIENTACOES_ENFERMAGEM;
  return ORIENTACOES_ENFERMAGEM.map((o) =>
    o.startsWith("Conferir item, via e cuidados")
      ? o.replace("Conferir item, via e cuidados", "Conferir item, via, dose e cuidados")
      : o,
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Campo ausente é visível, nunca silencioso. */
function ou(valor: string | null | undefined, fallback = "—"): string {
  const v = (valor ?? "").trim();
  return v ? escapeHtml(v) : fallback;
}

/** "2026-07-30" → "30/07/2026" */
function br(yyyyMmDd: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd)) return yyyyMmDd || "—";
  const [y, m, d] = yyyyMmDd.split("-");
  return `${d}/${m}/${y}`;
}

function dataHoraBr(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** CPF parcialmente mascarado — LGPD art. 6 (necessidade). */
function cpfMascarado(raw: string): string {
  const dig = (raw ?? "").replace(/\D/g, "");
  if (dig.length !== 11) return "—";
  return `***.${dig.slice(3, 6)}.${dig.slice(6, 9)}-**`;
}

function cpfCompleto(raw: string): string {
  const dig = (raw ?? "").replace(/\D/g, "");
  if (dig.length !== 11) return raw ? escapeHtml(raw) : "—";
  return `${dig.slice(0, 3)}.${dig.slice(3, 6)}.${dig.slice(6, 9)}-${dig.slice(9)}`;
}

function plural(n: number, singular: string, plural_: string): string {
  return n === 1 ? singular : plural_;
}

/**
 * `profissional_crm` vem de `documento_conselho` da Feegow, que às vezes já
 * traz o prefixo do conselho ("CRM/SP 123456") e às vezes só o número.
 * Prefixar cegamente produzia "CRM CRM/SP 123456".
 */
function registroConselho(crm: string): string {
  const v = (crm ?? "").trim();
  if (!v) return "Registro de conselho não informado";
  return /^[A-Za-z]{2,}/.test(v)
    ? escapeHtml(v)
    : `CRM ${escapeHtml(v)}`;
}

/**
 * Evita "Vitamina C 15g EV EV" na agenda: se o nome do procedimento já
 * termina com a sigla da via, não repete.
 */
function viaSufixo(procedureName: string, via: string | null): string {
  if (!via) return "";
  const sigla = VIA_CURTA[via as keyof typeof VIA_CURTA] ?? via;
  const nome = (procedureName ?? "").trim().toUpperCase();
  return new RegExp(`\\b${sigla}\\s*$`).test(nome) ? "" : ` ${sigla}`;
}

function viaHtml(via: string | null, inferida: boolean): string {
  if (!via) {
    return `<span class="via falta">— CONFERIR</span>`;
  }
  const label = VIA_CURTA[via as keyof typeof VIA_CURTA] ?? via;
  return inferida
    ? `<span class="via falta">${escapeHtml(label)} ?</span>`
    : `<span class="via">${escapeHtml(label)}</span>`;
}

export type RenderExecucaoOptions = {
  /** Marca d'água "PRÉVIA" — usada no preview, nunca no que vai à Feegow. */
  previa?: boolean;
  /**
   * Identidade visual da empresa. Ausente ⇒ a folha sai neutra (preto/cinza),
   * exatamente como saía antes da feature de branding existir.
   */
  branding?: DocumentBranding;
};

export function renderFolhaExecucao(
  plano: PlanoExecucao,
  opts: RenderExecucaoOptions = {},
): string {
  const temAlergias = Boolean(plano.paciente.alergias?.trim());

  const alergiasHtml = temAlergias
    ? `<div class="alergias tem">
         <div class="t">Alergias relatadas</div>
         <div class="v">${escapeHtml(plano.paciente.alergias!.trim())}</div>
       </div>`
    : `<div class="alergias nao">
         <div class="t">Alergias</div>
         <div class="v">Não informadas — conferir antes de administrar</div>
         <div class="conf">Conferidas por: <span class="blank" style="width:200px"></span>
           &nbsp;&nbsp;COREN: <span class="blank" style="width:90px"></span></div>
       </div>`;

  const blocos = [
    plano.protocolo.cuidados_gerais?.trim()
      ? `<div class="bloco"><div class="t">Cuidados gerais de enfermagem</div><div class="c">${escapeHtml(plano.protocolo.cuidados_gerais.trim())}</div></div>`
      : "",
    plano.protocolo.sinais_alerta?.trim()
      ? `<div class="bloco alerta"><div class="t">Sinais de alerta — suspender e comunicar</div><div class="c">${escapeHtml(plano.protocolo.sinais_alerta.trim())}</div></div>`
      : "",
    plano.observacoes?.trim()
      ? `<div class="bloco"><div class="t">Observações</div><div class="c">${escapeHtml(plano.observacoes.trim())}</div></div>`
      : "",
  ].join("");

  // ── Tabela 1: o que aplicar ──────────────────────────────────────────
  // Coluna de dose só existe quando alguém preencheu alguma. Coluna vazia
  // em todas as linhas é ruído num documento de bancada.
  const temDose = plano.itens.some((i) => Boolean(i.dose));

  const itensRows = plano.itens.length
    ? plano.itens
        .map((item, i) => {
          const sessoesTxt =
            item.interval_days === 0
              ? `1 sessão${item.quantity > 1 ? ` (${item.quantity} aplicações)` : ""}`
              : `${item.quantity} ${plural(item.quantity, "sessão", "sessões")} · a cada ${item.interval_days} ${plural(item.interval_days, "dia", "dias")}`;
          const cuid = item.cuidados
            ? `<tr><td class="cuid"></td><td class="cuid" colspan="${temDose ? 4 : 3}">↳ ${escapeHtml(item.cuidados)}</td></tr>`
            : "";
          return `<tr>
              <td class="n">${i + 1}</td>
              <td>${escapeHtml(item.procedure_name)}</td>
              <td>${viaHtml(item.via, item.via_inferida)}</td>
              ${temDose ? `<td class="dose">${item.dose ? escapeHtml(item.dose) : "—"}</td>` : ""}
              <td>${escapeHtml(sessoesTxt)}</td>
            </tr>${cuid}`;
        })
        .join("")
    : `<tr><td colspan="${temDose ? 5 : 4}" style="text-align:center;color:#9ca3af;font-style:italic;padding:10px 0;">Nenhum item</td></tr>`;

  // ── Tabela 2: quando fazer (com colunas em branco para a execução) ───
  const agendaRows = plano.agenda.length
    ? plano.agenda
        .map((dia) => {
          const lista = dia.itens
            .map((it) => {
              const rep = it.repeticoes > 1 ? ` ×${it.repeticoes}` : "";
              const via = viaSufixo(it.procedure_name, it.via);
              const dose = it.dose ? ` ${it.dose}` : "";
              return `${escapeHtml(it.procedure_name)}${escapeHtml(via)}${escapeHtml(dose)}${rep} <span style="color:#6b7280">(${escapeHtml(it.sessao)})</span>`;
            })
            .join("<br/>");
          return `<tr>
              <td style="white-space:nowrap"><strong>${br(dia.data)}</strong></td>
              <td style="white-space:nowrap;color:#6b7280">${escapeHtml(dia.rotulo)}</td>
              <td>${lista}</td>
              <td><span class="blank" style="width:70px"></span></td>
              <td><span class="blank" style="width:150px"></span></td>
            </tr>`;
        })
        .join("")
    : `<tr><td colspan="5" style="text-align:center;color:#9ca3af;font-style:italic;padding:10px 0;">Sem aplicações projetadas</td></tr>`;

  // Aviso de substituição no CORPO do documento, não só no nome do
  // arquivo: a Feegow não expõe delete de anexo, então revisões coexistem
  // no prontuário. O papel que a enfermeira leva para a bancada precisa se
  // autoidentificar sem depender da listagem de arquivos.
  const supersede =
    plano.revisao > 0
      ? `<div class="supersede">Revisão ${plano.revisao} — substitui as revisões anteriores. Descartar cópias impressas anteriores.</div>`
      : "";

  const orientacoesHtml = orientacoesPara(temDose).map(
    (o) => `<li>${escapeHtml(o)}</li>`,
  ).join("");

  const idade = (() => {
    const n = plano.paciente.nascimento;
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(n ?? "");
    if (!m) return "";
    const nasc = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    const ref = new Date(plano.gerado_em);
    if (Number.isNaN(nasc.getTime()) || Number.isNaN(ref.getTime())) return "";
    let anos = ref.getFullYear() - nasc.getFullYear();
    const antes =
      ref.getMonth() < nasc.getMonth() ||
      (ref.getMonth() === nasc.getMonth() && ref.getDate() < nasc.getDate());
    if (antes) anos -= 1;
    return anos > 0 && anos < 130 ? ` (${anos}a)` : "";
  })();

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Cronograma de aplicações</title><style>${buildCss(opts.branding)}</style></head>
<body>
${opts.previa ? `<div class="previa">PRÉVIA</div>` : ""}
${opts.branding ? renderBrandingHeader(opts.branding) : ""}

<div class="head">
  ${
    // O cabeçalho de marca só é emitido quando há LOGO, e desde eec43ab ele
    // mostra apenas a logo (sem o nome). Então só suprimimos o nome aqui
    // quando a logo de fato vai ser impressa — senão uma empresa que
    // configurou só a cor perderia o nome do documento inteiro.
    // O CNPJ continua sempre, porque é o identificador legal.
    opts.branding?.hasBranding && opts.branding.logoDataUri
      ? plano.clinica.cnpj
        ? `<div class="clinica">CNPJ ${escapeHtml(plano.clinica.cnpj)}</div>`
        : ""
      : `<div class="clinica">${ou(plano.clinica.nome, "&nbsp;")}${plano.clinica.cnpj ? ` · CNPJ ${escapeHtml(plano.clinica.cnpj)}` : ""}</div>`
  }
  <h1>Cronograma de aplicações<br/>Folha de execução de enfermagem</h1>
  <div class="meta">
    Protocolo: ${ou(plano.protocolo.nome)} ·
    Emitida em ${dataHoraBr(plano.gerado_em)} ·
    Revisão ${plano.revisao} ·
    Ref. ${ou(plano.proposta_ref)}
  </div>
</div>

${supersede}

<table class="ident"><tr>
  <td>
    <div class="lbl">Paciente</div>
    <div class="nome">${ou(plano.paciente.nome)}</div>
    <div class="linha">CPF ${cpfCompleto(plano.paciente.cpf)}</div>
    <div class="linha">Nasc. ${ou(plano.paciente.nascimento)}${idade}</div>
    ${plano.paciente.feegow_id ? `<div class="linha">Prontuário ${escapeHtml(plano.paciente.feegow_id)}</div>` : ""}
  </td>
  <td>
    <div class="lbl">Profissional responsável</div>
    <div class="nome">${ou(plano.profissional.nome)}</div>
    <div class="linha">${registroConselho(plano.profissional.crm)}</div>
    <div class="linha">${ou(plano.profissional.especialidade, "&nbsp;")}</div>
  </td>
</tr></table>

${alergiasHtml}
${blocos}

<div class="sec">Aplicações — o que preparar</div>
<table class="grid">
  <thead><tr><th class="n">#</th><th>Item</th><th style="width:110px">Via</th>${temDose ? `<th style="width:110px">Dose</th>` : ""}<th style="width:190px">Sessões</th></tr></thead>
  <tbody>${itensRows}</tbody>
</table>

<div class="sec">Agenda — ${plano.total_sessoes} ${plural(plano.total_sessoes, "sessão", "sessões")} · ${br(plano.inicio)} a ${br(plano.ultima_data)}</div>
<table class="grid">
  <thead><tr>
    <th style="width:76px">Data</th><th style="width:48px">Dia</th><th>Aplicar</th>
    <th style="width:82px">Realizada</th><th style="width:162px">Executante / COREN</th>
  </tr></thead>
  <tbody>${agendaRows}</tbody>
</table>

<div class="sec">Orientações de enfermagem</div>
<ul class="orient">${orientacoesHtml}</ul>

<div class="fecho">
<div class="assin">
  <div class="line"></div>
  <div class="who">${ou(plano.profissional.nome)}</div>
  <div class="meta">${registroConselho(plano.profissional.crm)} — profissional responsável pelo plano terapêutico</div>
</div>

<div class="disclaimer">
  Documento gerado automaticamente a partir do protocolo contratado.
  <strong>Não constitui prescrição médica nem prescrição de enfermagem</strong>
  e não substitui a avaliação clínica à beira do paciente.
  ${
    temDose
      ? `As doses indicadas foram definidas pelo profissional responsável e devem ser conferidas contra a prescrição de registro antes do preparo. Não informa diluição nem velocidade de infusão.`
      : `Não informa dose, diluição ou velocidade de infusão: conferir a prescrição de registro do paciente antes de qualquer preparo ou administração.`
  }
  Paciente ${ou(plano.paciente.nome)} · CPF ${cpfMascarado(plano.paciente.cpf)} · Ref. ${ou(plano.proposta_ref)} · rev. ${plano.revisao}
</div>
</div>

</body></html>`;
}

/** Rodapé por página. `headerTemplate` vazio é obrigatório — ver pdf.ts. */
export function footerTemplateFor(plano: PlanoExecucao): string {
  const ref = escapeHtml(plano.proposta_ref);
  const nome = escapeHtml(plano.paciente.nome);
  const cpf = cpfMascarado(plano.paciente.cpf);
  return `<div style="font-size:7px;width:100%;padding:0 12mm;color:#666;display:flex;justify-content:space-between;">
    <span>${nome} · CPF ${cpf} · Ref. ${ref} · rev. ${plano.revisao}</span>
    <span>pág <span class="pageNumber"></span>/<span class="totalPages"></span></span>
  </div>`;
}
