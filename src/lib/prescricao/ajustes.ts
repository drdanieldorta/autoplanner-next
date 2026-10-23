/**
 * Arquivo NEUTRO — importável de Server e Client Components.
 * NÃO adicionar `import "server-only"`.
 */

import type { AjusteItem, PlanoExecucao, PrescricaoAjustes } from "./types";

/**
 * Descarta do delta tudo que não ajusta nada.
 *
 * Um ajuste vazio polui o JSONB e — pior — pode fazer o hash mudar sem o
 * documento mudar, o que criaria revisão espúria num prontuário onde anexo
 * não se apaga.
 *
 * A regra por campo segue o que `projetarPlano` de fato aplica:
 *
 * - `via`, `dose`, `cuidados`: vazio/nulo é NO-OP na projeção (cai no valor
 *   do protocolo), então guardar seria peso morto. Some.
 * - `inicio_dias`: **`0` é significativo**. Num item que o protocolo manda
 *   começar em D+14, gravar `0` é dizer "neste paciente, começa junto com a
 *   primeira sessão". Só `null`/`undefined` some. Quem quer voltar ao
 *   protocolo remove o campo — é o que "Voltar ao protocolo" faz, e só quem
 *   conhece o valor do protocolo pode decidir isso.
 */
export function limparAjustes(
  bruto: Record<string, AjusteItem | undefined>,
): PrescricaoAjustes {
  const limpos: PrescricaoAjustes = {};

  for (const [ref, aj] of Object.entries(bruto)) {
    if (!aj) continue;

    const via = aj.via || null;
    const dose = (aj.dose ?? "").trim();
    const cuidados = (aj.cuidados ?? "").trim();
    const inicio =
      typeof aj.inicio_dias === "number" && Number.isFinite(aj.inicio_dias)
        ? Math.max(0, Math.trunc(aj.inicio_dias))
        : null;
    const sessoes = aj.sessoes ?? {};
    const temSessoes = Object.keys(sessoes).length > 0;

    if (!via && !dose && !cuidados && inicio === null && !temSessoes) continue;

    limpos[ref] = {
      ...(via ? { via } : {}),
      ...(dose ? { dose } : {}),
      ...(cuidados ? { cuidados } : {}),
      ...(inicio !== null ? { inicio_dias: inicio } : {}),
      ...(temSessoes ? { sessoes } : {}),
    };
  }

  return limpos;
}

/**
 * Tira do delta as sessões gravadas na própria data padrão do plano.
 *
 * `setSessao` e `empurrarDaqui` gravam offsets absolutos, e um offset igual
 * ao padrão não aparece como ajustado (sem borda, sem "Voltar ao padrão").
 * Se a data padrão mudar, como ao ligar ou desligar o dia de atendimento,
 * ele viraria remarcação manual invisível, presa na data do modo anterior.
 * Podar antes da troca e ao salvar não muda a projeção nem o hash.
 */
export function semSessoesNoPadrao(
  ajustes: PrescricaoAjustes,
  plano: PlanoExecucao,
): PrescricaoAjustes {
  let mudou = false;
  const out: PrescricaoAjustes = { ...ajustes };
  for (const item of plano.itens) {
    const atual = out[item.ref];
    if (!atual?.sessoes) continue;
    const sessoes = { ...atual.sessoes };
    for (const s of item.sessoes) {
      if (!s.ajustada && String(s.n) in sessoes) {
        delete sessoes[String(s.n)];
        mudou = true;
      }
    }
    const { sessoes: _antigas, ...resto } = atual;
    void _antigas;
    if (Object.keys(sessoes).length) out[item.ref] = { ...resto, sessoes };
    // Sem nada além das sessões podadas, o item sai do delta: um `{}` faria o
    // editor oferecer "Voltar ao protocolo" sem haver ajuste.
    else if (Object.keys(resto).length) out[item.ref] = resto;
    else delete out[item.ref];
  }
  return mudou ? out : ajustes;
}
