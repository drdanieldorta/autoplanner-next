/**
 * Arquivo NEUTRO — importável de Server e Client Components.
 * NÃO adicionar `import "server-only"`.
 */

import type { PlanoExecucao } from "./types";

/**
 * JSON determinístico com chaves ordenadas, usado como base do hash de
 * idempotência do upload à Feegow.
 *
 * DOIS campos são excluídos, e ambos são load-bearing:
 *
 * - `gerado_em`: muda a cada geração. Incluí-lo faria o hash mudar sempre
 *   e a idempotência não valeria nada.
 *
 * - `revisao`: incluí-lo torna a comparação circular. Para comparar o hash
 *   novo com o armazenado seria preciso projetar já sabendo a revisão, mas
 *   a revisão só pode ser decidida DEPOIS de saber se o conteúdo mudou.
 *   Excluindo, a sequência fica: hash do conteúdo → compara → só então
 *   decide `revisao = anterior + 1`.
 *
 * Note que `inicio` está DENTRO do hash de propósito: mudar a data de
 * início muda o cronograma e é, legitimamente, uma nova revisão. Por isso
 * `propostas.prescricao_inicio` é persistido na primeira emissão e reusado
 * nas seguintes — se voltasse a defaultar para "hoje", o mesmo orçamento
 * geraria hash diferente a cada dia e criaria revisão espúria permanente
 * no prontuário (a Feegow não expõe delete de anexo).
 */
export function canonicalJson(plano: PlanoExecucao): string {
  const { gerado_em: _geradoEm, revisao: _revisao, ...resto } = plano;
  void _geradoEm;
  void _revisao;
  return JSON.stringify(ordenar(resto));
}

function ordenar(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(ordenar);
  if (value && typeof value === "object") {
    const src = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(src).sort()) {
      out[key] = ordenar(src[key]);
    }
    return out;
  }
  return value;
}
