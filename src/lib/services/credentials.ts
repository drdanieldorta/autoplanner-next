import "server-only";

import {
  DEFAULT_PATIENT_SOURCE,
  parsePatientSource,
  type PatientSource,
} from "@/lib/orcamento/patient-source";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type ApiCredentialsRow =
  Database["public"]["Tables"]["api_credentials"]["Row"];

/**
 * Versão "saneada" das credenciais — não vaza tokens, apenas booleans
 * indicando presença. Use no UI de configuração.
 */
export type CredentialsStatus = {
  hasFeegow: boolean;
  hasAuthentique: boolean;
  hasCrm: boolean;
  hasCrmAdmin: boolean;
  /** Preferência salva (não a resolvida — quem resolve é quem usa). */
  patientSource: PatientSource;
};

export async function getCredentialsStatus(args: {
  companyId: string;
}): Promise<CredentialsStatus | null> {
  const supabase = await createClient();
  const result = await supabase
    .from("api_credentials")
    .select(
      "feegow_token, authentique_token, crm_token, crm_admin_token, patient_source",
    )
    .eq("company_id", args.companyId)
    .maybeSingle();

  if (result.error && result.error.code !== "PGRST116") {
    throw new Error(result.error.message);
  }
  const cred = result.data as Pick<
    ApiCredentialsRow,
    | "feegow_token"
    | "authentique_token"
    | "crm_token"
    | "crm_admin_token"
    | "patient_source"
  > | null;
  if (!cred) {
    return {
      hasFeegow: false,
      hasAuthentique: false,
      hasCrm: false,
      hasCrmAdmin: false,
      patientSource: DEFAULT_PATIENT_SOURCE,
    };
  }
  return {
    hasFeegow: !!cred.feegow_token,
    hasAuthentique: !!cred.authentique_token,
    hasCrm: !!cred.crm_token,
    hasCrmAdmin: !!cred.crm_admin_token,
    patientSource: parsePatientSource(cred.patient_source),
  };
}
