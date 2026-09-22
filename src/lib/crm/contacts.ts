/**
 * Leitura dos campos de um contato do CRM (Helena / WTS Chat).
 *
 * Módulo neutro (sem `server-only`): só funções puras sobre o payload, para
 * o parse ser testável fora do Next e importável de Server e Client
 * Components.
 */

import { formatPhoneNumber } from "@/lib/masks";

/** Etiqueta que marca um contato como paciente no CRM. */
export const CRM_PATIENT_TAG = "Paciente";

/**
 * Chave de `customFields` sem acento, caixa ou pontuação: "Data de
 * Nascimento", "data_nascimento" e "DataNascimento" viram
 * "datadenascimento" / "datanascimento". O nome do campo é criado por cada
 * conta do CRM, então não dá para casar literal.
 */
export function normalizeFieldKey(key: string): string {
  return key
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function customFieldValue(
  customFields: unknown,
  match: (normalizedKey: string) => boolean,
): string {
  if (
    !customFields ||
    typeof customFields !== "object" ||
    Array.isArray(customFields)
  ) {
    return "";
  }
  for (const [key, value] of Object.entries(
    customFields as Record<string, unknown>,
  )) {
    if (!match(normalizeFieldKey(key))) continue;
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

/** CPF do contato: só os 11 dígitos, ou "" se ausente ou incompleto. */
export function cpfFromCustomFields(customFields: unknown): string {
  const digits = customFieldValue(customFields, (k) => k === "cpf").replace(
    /\D/g,
    "",
  );
  return digits.length === 11 ? digits : "";
}

/**
 * Nascimento em `dd/mm/aaaa` (padrão do resto do projeto), ou "".
 * Aceita `dd/mm/aaaa`, `dd-mm-aaaa` e ISO `aaaa-mm-dd[T...]`.
 */
export function nascimentoFromCustomFields(customFields: unknown): string {
  return normalizeNascimento(
    customFieldValue(customFields, (k) => k.includes("nascimento")),
  );
}

export function normalizeNascimento(raw: string): string {
  const br = raw.trim().match(/^(\d{2})[/-](\d{2})[/-](\d{4})/);
  if (br) return `${br[1]}/${br[2]}/${br[3]}`;
  const iso = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return "";
}

/**
 * Telefone como o CRM devolve (E.164 sem "+", ex.: 5511999999999) no
 * formato que o campo do formulário usa e que `phoneToE164` entende:
 *   - celular BR      → "(11) 99999-9999" (a máscara do campo)
 *   - fixo BR         → "+551133334444"  (a máscara só serve para celular,
 *                        e `phoneToE164` só prefixa 55 em 11 dígitos)
 *   - qualquer outro  → "+<dígitos>"
 */
export function crmPhoneToDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const national =
    digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
  if (national.length === 11) return formatPhoneNumber(national);
  if (national.length === 10) return `+55${national}`;
  return `+${digits}`;
}
