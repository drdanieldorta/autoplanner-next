import "server-only";

import { feegow, FeegowError } from "@/lib/integrations/feegow";
import { getCompanyCredentials } from "@/lib/integrations/credentials";

export type ProtocolProcedureOption = {
  id: string;
  name: string;
  value_cents: number;
  duration: string;
};

export type ProtocolFormData = {
  /** True quando a empresa tem `feegow_token` em `api_credentials`. */
  hasFeegow: boolean;
  procedures: ProtocolProcedureOption[];
  /** Preenchido quando a empresa tem token mas a chamada falhou. */
  feegowError: string | null;
};

/**
 * Carrega o catálogo de procedimentos para o form de Protocolo.
 *
 * - Empresa com token Feegow: puxa `/procedures/list` (valor já em centavos)
 *   e o form usa combobox — mesmo modo automático do form de Orçamento.
 * - Sem token: lista vazia, o form cai no modo manual (nome digitado).
 *
 * Falha de Feegow vira `feegowError` em vez de throw: o form exibe o aviso
 * e libera o modo manual, para que uma indisponibilidade da API não impeça
 * o cadastro de protocolos.
 */
export async function loadProtocolFormData(
  companyId: string,
): Promise<ProtocolFormData> {
  const creds = await getCompanyCredentials(companyId);
  if (!creds?.feegow_token) {
    return { hasFeegow: false, procedures: [], feegowError: null };
  }

  try {
    const procedures = await feegow(creds.feegow_token).listProcedures();
    return {
      hasFeegow: true,
      procedures: procedures
        .map((p) => ({
          id: p.procedimento_id,
          name: p.nome,
          value_cents: Math.round(p.valor),
          duration: p.tempo,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
      feegowError: null,
    };
  } catch (err) {
    return {
      hasFeegow: true,
      procedures: [],
      feegowError:
        err instanceof FeegowError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Falha ao carregar procedimentos da Feegow",
    };
  }
}
