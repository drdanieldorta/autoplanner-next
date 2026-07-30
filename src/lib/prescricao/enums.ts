/**
 * Arquivo NEUTRO — pode ser importado tanto de Server Components quanto de
 * Client Components. Mesmo precedente de `lib/contracts/variables.ts`.
 * NÃO adicionar `import "server-only"` aqui.
 */

/** Vias de administração. Espelha o CHECK de `protocol_items.via`. */
export const VIAS = [
  "EV",
  "IM",
  "SC",
  "ID",
  "VO",
  "TOP",
  "INAL",
  "OUTRA",
] as const;

export type Via = (typeof VIAS)[number];

export const VIA_LABEL: Record<Via, string> = {
  EV: "EV — Endovenosa",
  IM: "IM — Intramuscular",
  SC: "SC — Subcutânea",
  ID: "ID — Intradérmica",
  VO: "VO — Via oral",
  TOP: "TOP — Tópica",
  INAL: "INAL — Inalatória",
  OUTRA: "Outra",
};

/** Forma curta, usada no badge da folha impressa. */
export const VIA_CURTA: Record<Via, string> = {
  EV: "EV",
  IM: "IM",
  SC: "SC",
  ID: "ID",
  VO: "VO",
  TOP: "TÓPICA",
  INAL: "INAL",
  OUTRA: "OUTRA",
};

export function isVia(value: unknown): value is Via {
  return typeof value === "string" && (VIAS as readonly string[]).includes(value);
}

/**
 * Heurístico de fallback para protocolos legados, onde `via` é nula.
 *
 * Reproduz deliberadamente a detecção que já existe em
 * `lib/contracts/templates/default-system-contract.ts` (usada lá para
 * escolher qual termo de consentimento anexar), para que contrato e folha
 * de execução nunca discordem sobre a via de um mesmo item.
 *
 * Retorna `null` quando não há sinal claro — nesse caso a folha imprime
 * "—" com marca de conferência, em vez de chutar.
 */
export function inferVia(procedureName: string): Via | null {
  const upper = (procedureName ?? "").toUpperCase();
  if (/\bEV\b/.test(upper)) return "EV";
  if (/\bIM\b/.test(upper)) return "IM";
  if (/\bSC\b/.test(upper)) return "SC";
  if (/\bVO\b/.test(upper)) return "VO";
  // "IMPLANTE" é um procedimento subcutâneo na prática da clínica, mas o
  // termo não determina a via com segurança — deixamos para conferência.
  return null;
}
