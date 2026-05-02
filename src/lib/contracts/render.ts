import "server-only";

import { CONTRACT_VARIABLES } from "@/lib/contracts/variables";

/**
 * Substitui variáveis `{{var}}` no template do contrato.
 * Espelha a função `replaceContractVariables` do Vite legacy + n8n.
 */
export function replaceContractVariables(
  content: string,
  data: Record<string, string | undefined>,
): string {
  let result = content;
  for (const { key } of CONTRACT_VARIABLES) {
    const name = key.replace(/[{}]/g, "");
    const value = data[name] ?? "";
    const re = new RegExp(`\\{\\{${name}\\}\\}`, "g");
    result = result.replace(re, value);
  }
  return result;
}

const meses = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** "1 de maio de 2026" — padrão extenso usado no n8n. */
export function formatDateExtenso(d: Date = new Date()): string {
  return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}

/** Formata centavos como `R$ 800,00`. */
export function formatBRL(cents: number): string {
  return `R$ ${(cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** CPF `XXX.XXX.XXX-XX`. */
export function formatCPF(raw: string | null | undefined): string {
  if (!raw) return "";
  const d = raw.replace(/\D/g, "");
  if (d.length !== 11) return raw;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}
