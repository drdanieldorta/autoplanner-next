import "server-only";

import {
  feegow,
  FeegowError,
  type FeegowPatient,
  type FeegowProcedure,
  type FeegowProfessional,
} from "@/lib/integrations/feegow";
import { getCompanyCredentials } from "@/lib/integrations/credentials";
import {
  helena,
  HelenaError,
  type HelenaContact,
} from "@/lib/integrations/helena";
import { CRM_PATIENT_TAG, crmPhoneToDisplay } from "@/lib/crm/contacts";
import {
  parsePatientSource,
  resolvePatientSource,
  type PatientSource,
} from "@/lib/orcamento/patient-source";
import { listFuncionarios } from "@/lib/services/funcionarios";

export type OrcamentoProcedureOption = {
  id: string;
  name: string;
  value_cents: number;
  duration: string;
};

export type OrcamentoPatientOption = {
  id: string;
  name: string;
  email: string;
  phone: string;
  birth: string;
  neighborhood: string;
  /**
   * 11 dígitos ou "". Só o CRM traz CPF na listagem; na Feegow ele vem
   * depois, por paciente, via `/api/feegow/pacientes/[id]`.
   */
  cpf: string;
};

export type OrcamentoProfessionalOption = {
  id: string;
  name: string;
  email: string;
  cpf: string;
  crm: string;
  specialization: string;
  sys_user: string;
};

export type OrcamentoFormData = {
  /**
   * A empresa tem chave da Feegow: procedimentos e profissionais vêm de lá,
   * seja qual for a origem do paciente.
   */
  hasFeegow: boolean;
  /**
   * De onde vem o paciente neste formulário: a preferência da empresa
   * (Configurações) já resolvida contra as chaves configuradas. Só com
   * `"feegow"` o orçamento vira proposta na Feegow.
   */
  patientSource: PatientSource;
  /**
   * Origem `"crm"` e o CRM respondendo: o dropdown de paciente busca
   * contatos etiquetados "Paciente" no CRM. `patients` traz a primeira
   * página; a busca conforme digita vai a `GET /api/crm/pacientes`.
   */
  hasCrm: boolean;
  /** Falha ao consultar o CRM na abertura — a UI cai para os inputs manuais e avisa. */
  crmError: string | null;
  /** A primeira página do CRM tem continuação (o dropdown pede para refinar). */
  crmHasMore: boolean;
  procedures: OrcamentoProcedureOption[];
  patients: OrcamentoPatientOption[];
  professionals: OrcamentoProfessionalOption[];
  /** True quando alguma chamada Feegow falhou — UI exibe aviso. */
  feegowError: string | null;
};

/** Tamanho da página do dropdown de pacientes do CRM (máximo da API: 100). */
const CRM_PAGE_SIZE = 20;

function crmContactToPatientOption(c: HelenaContact): OrcamentoPatientOption {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    phone: crmPhoneToDisplay(c.phone),
    birth: c.nascimento,
    neighborhood: "",
    cpf: c.cpf,
  };
}

/**
 * Uma página de contatos etiquetados "Paciente" no CRM, já no shape do
 * dropdown. Usado na abertura da página (primeira página, sem filtro) e
 * pela busca conforme digita (`GET /api/crm/pacientes?q=`).
 */
export async function searchCrmPatients(
  crmToken: string,
  textFilter: string,
): Promise<{ items: OrcamentoPatientOption[]; hasMore: boolean }> {
  const page = await helena(crmToken).filterContacts({
    tagNames: [CRM_PATIENT_TAG],
    textFilter,
    pageSize: CRM_PAGE_SIZE,
  });
  return {
    items: page.items.map(crmContactToPatientOption),
    hasMore: page.hasMorePages,
  };
}

function feegowErrorMessage(reason: unknown, fallback: string): string {
  return reason instanceof FeegowError ? reason.message : fallback;
}

/**
 * Procedimentos e profissionais da Feegow e, só quando o paciente vem de
 * lá, a lista de pacientes — a chamada mais pesada das três, que não
 * precisa acontecer quando a origem é o CRM ou manual.
 */
async function loadFeegowData(
  token: string,
  withPatients: boolean,
): Promise<{
  procedures: FeegowProcedure[];
  patients: FeegowPatient[];
  professionals: FeegowProfessional[];
  errors: string[];
}> {
  const client = feegow(token);
  const [procedures, patients, professionals] = await Promise.allSettled([
    client.listProcedures(),
    withPatients ? client.listPatients() : Promise.resolve([]),
    client.listProfessionals(),
  ]);
  const errors: string[] = [];
  const valueOr = <T,>(r: PromiseSettledResult<T[]>, fallback: string): T[] => {
    if (r.status === "fulfilled") return r.value;
    errors.push(feegowErrorMessage(r.reason, fallback));
    return [];
  };
  return {
    procedures: valueOr(procedures, "Falha ao carregar procedimentos"),
    patients: valueOr(patients, "Falha ao carregar pacientes"),
    professionals: valueOr(professionals, "Falha ao carregar profissionais"),
    errors,
  };
}

/**
 * Carrega os dados auxiliares para o form de Orçamento.
 *
 * Duas decisões independentes:
 *
 * - **Catálogo** (procedimentos e profissionais): da Feegow quando a
 *   empresa tem a chave; senão procedimentos são digitados na hora e
 *   profissionais vêm de profiles.
 * - **Paciente**: a origem escolhida em Configurações, resolvida contra as
 *   chaves (`resolvePatientSource`). Feegow → lista de pacientes da Feegow;
 *   CRM → primeira página dos contatos "Paciente"; manual → nada.
 *
 * Falhas não derrubam a página: Feegow vira `feegowError`, CRM vira
 * `crmError` (e o formulário volta a ser o manual de sempre).
 */
export async function loadOrcamentoFormData(
  companyId: string,
): Promise<OrcamentoFormData> {
  const creds = await getCompanyCredentials(companyId);
  const feegowToken = creds?.feegow_token || null;
  const crmToken = creds?.crm_token || null;
  const hasFeegow = !!feegowToken;
  const patientSource = resolvePatientSource(
    parsePatientSource(creds?.patient_source),
    { hasFeegow, hasCrm: !!crmToken },
  );

  const [feegowData, crm, funcionarios] = await Promise.all([
    feegowToken
      ? loadFeegowData(feegowToken, patientSource === "feegow")
      : Promise.resolve(null),
    patientSource === "crm" && crmToken
      ? searchCrmPatients(crmToken, "").then(
          (page) => ({ ok: true as const, page }),
          (err: unknown) => ({
            ok: false as const,
            error:
              err instanceof HelenaError
                ? err.message
                : "Falha ao consultar o CRM",
          }),
        )
      : Promise.resolve(null),
    feegowToken ? Promise.resolve(null) : listFuncionarios({ companyId }),
  ]);

  const patients: OrcamentoPatientOption[] =
    patientSource === "feegow"
      ? (feegowData?.patients ?? []).map((p) => ({
          id: p.paciente_id,
          name: p.nome,
          email: p.email,
          phone: p.celular,
          birth: p.nascimento,
          neighborhood: p.bairro,
          cpf: "",
        }))
      : crm?.ok === true
        ? crm.page.items
        : [];

  const professionals: OrcamentoProfessionalOption[] = feegowData
    ? feegowData.professionals.map((p) => ({
        id: p.profissional_id,
        name: p.nome,
        email: p.email,
        cpf: p.cpf,
        crm: p.crm,
        specialization: p.especialidade,
        sys_user: p.sys_user,
      }))
    : (funcionarios ?? []).map((f) => ({
        id: f.id,
        name: f.name ?? f.email ?? "",
        email: f.email ?? "",
        cpf: f.cpf ?? "",
        crm: "",
        specialization: f.role ?? "",
        sys_user: "",
      }));

  return {
    hasFeegow,
    patientSource,
    hasCrm: crm?.ok === true,
    crmError: crm && !crm.ok ? crm.error : null,
    crmHasMore: crm?.ok === true ? crm.page.hasMore : false,
    procedures: (feegowData?.procedures ?? []).map((p) => ({
      id: p.procedimento_id,
      name: p.nome,
      value_cents: Math.round(p.valor),
      duration: p.tempo,
    })),
    patients,
    professionals,
    feegowError:
      feegowData && feegowData.errors.length > 0
        ? feegowData.errors.join(" · ")
        : null,
  };
}
