/**
 * De onde o formulário de orçamento puxa o paciente (decisão 2026-10-22).
 *
 * A empresa escolhe em Configurações (`api_credentials.patient_source`); o
 * formulário usa a origem EFETIVA, que depende das chaves configuradas:
 *
 *   - `feegow` (padrão): Feegow; sem chave da Feegow, CRM; sem nenhuma das
 *     duas, manual. É exatamente o comportamento de antes da opção existir.
 *   - `crm`: CRM; sem chave do CRM, manual. Nunca cai para a Feegow: quem
 *     escolheu o CRM não quer proposta criada na Feegow sem saber.
 *   - `manual`: sempre manual.
 *
 * Só o PACIENTE muda de origem. Procedimentos e profissionais continuam
 * vindo da Feegow quando a empresa tem a chave. Consequência que não dá para
 * contornar: sem paciente da Feegow, o orçamento não vira proposta lá e o
 * contrato assinado não é anexado ao prontuário (`paciente_id: "manual"`).
 *
 * Módulo neutro (sem `server-only`): o loader do formulário resolve a origem
 * no servidor, e a tela de Configurações mostra a mesma resolução ao vivo.
 */

export const PATIENT_SOURCES = ["feegow", "crm", "manual"] as const;

export type PatientSource = (typeof PATIENT_SOURCES)[number];

export const DEFAULT_PATIENT_SOURCE: PatientSource = "feegow";

export function isPatientSource(value: unknown): value is PatientSource {
  return (
    typeof value === "string" &&
    (PATIENT_SOURCES as readonly string[]).includes(value)
  );
}

/** Valor do banco → preferência. Ausente ou desconhecido vira o padrão. */
export function parsePatientSource(value: unknown): PatientSource {
  return isPatientSource(value) ? value : DEFAULT_PATIENT_SOURCE;
}

/** Preferência + chaves configuradas → origem que o formulário usa. */
export function resolvePatientSource(
  preferencia: PatientSource,
  chaves: { hasFeegow: boolean; hasCrm: boolean },
): PatientSource {
  switch (preferencia) {
    case "feegow":
      if (chaves.hasFeegow) return "feegow";
      return chaves.hasCrm ? "crm" : "manual";
    case "crm":
      return chaves.hasCrm ? "crm" : "manual";
    case "manual":
      return "manual";
  }
}
