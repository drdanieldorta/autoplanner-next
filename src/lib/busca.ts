/**
 * Arquivo NEUTRO — importável de Server e Client Components.
 * NÃO adicionar `import "server-only"`.
 *
 * Busca por texto digitado nas listas do painel (procedimentos, protocolos).
 */

/** Sem acento, sem caixa, espaços colapsados. */
export function normalizarBusca(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Pontua `texto` contra o que foi digitado: 0 não casa, 1 casa, 2 casa e
 * começa pelo que foi digitado (vem primeiro na lista). Casar é ter TODAS as
 * palavras da busca, em qualquer ordem e sem acento: "vit c" acha
 * "Vitamina C", "aplicacao" acha "Aplicação". Busca vazia casa tudo.
 */
export function pontuarBusca(texto: string, consulta: string): number {
  const busca = normalizarBusca(consulta);
  if (!busca) return 1;
  const alvo = normalizarBusca(texto);
  if (!busca.split(" ").every((palavra) => alvo.includes(palavra))) return 0;
  return alvo.startsWith(busca) ? 2 : 1;
}
