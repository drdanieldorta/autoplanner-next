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
  hasFeegow: boolean;
  /**
   * Sem Feegow, com `crm_token` e o CRM respondendo: o dropdown de paciente
   * busca contatos etiquetados "Paciente" no CRM. `patients` traz a primeira
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

/**
 * Carrega os dados auxiliares para o form de Orçamento com base no
 * modo da empresa.
 *
 * - Modo automático (Feegow configurado): puxa procedimentos/pacientes/
 *   profissionais da API Feegow via factory server-side.
 * - Modo manual (sem Feegow): procedimentos vazios (digitados na hora),
 *   profissionais vêm de profiles. Pacientes: se a empresa tem `crm_token`,
 *   a primeira página dos contatos "Paciente" do CRM; senão vazios
 *   (digitados na hora). Falha do CRM não derruba a página — vira
 *   `crmError`, e o form volta a ser o manual de sempre.
 *
 * Erros de Feegow são reportados via `feegowError` em vez de jogar —
 * o user ainda consegue ver o form (mesmo que sem dados externos)
 * e a página decide como exibir o aviso.
 */
export async function loadOrcamentoFormData(
  companyId: string,
): Promise<OrcamentoFormData> {
  const creds = await getCompanyCredentials(companyId);
  const hasFeegow = !!creds?.feegow_token;

  if (!hasFeegow) {
    const crmToken = creds?.crm_token ?? null;
    const [funcionarios, crm] = await Promise.all([
      listFuncionarios({ companyId }),
      crmToken
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
    ]);
    return {
      hasFeegow: false,
      hasCrm: crm?.ok === true,
      crmError: crm && !crm.ok ? crm.error : null,
      crmHasMore: crm?.ok === true ? crm.page.hasMore : false,
      procedures: [],
      patients: crm?.ok === true ? crm.page.items : [],
      professionals: funcionarios.map((f) => ({
        id: f.id,
        name: f.name ?? f.email ?? "",
        email: f.email ?? "",
        cpf: f.cpf ?? "",
        crm: "",
        specialization: f.role ?? "",
        sys_user: "",
      })),
      feegowError: null,
    };
  }

  const client = feegow(creds!.feegow_token!);
  const results = await Promise.allSettled([
    client.listProcedures(),
    client.listPatients(),
    client.listProfessionals(),
  ]);

  const errors: string[] = [];
  const proceduresRaw =
    results[0].status === "fulfilled"
      ? (results[0].value as FeegowProcedure[])
      : (errors.push(
          results[0].reason instanceof FeegowError
            ? results[0].reason.message
            : "Falha ao carregar procedimentos",
        ),
        []);
  const patientsRaw =
    results[1].status === "fulfilled"
      ? (results[1].value as FeegowPatient[])
      : (errors.push(
          results[1].reason instanceof FeegowError
            ? results[1].reason.message
            : "Falha ao carregar pacientes",
        ),
        []);
  const professionalsRaw =
    results[2].status === "fulfilled"
      ? (results[2].value as FeegowProfessional[])
      : (errors.push(
          results[2].reason instanceof FeegowError
            ? results[2].reason.message
            : "Falha ao carregar profissionais",
        ),
        []);

  return {
    hasFeegow: true,
    hasCrm: false,
    crmError: null,
    crmHasMore: false,
    procedures: proceduresRaw.map((p) => ({
      id: p.procedimento_id,
      name: p.nome,
      value_cents: Math.round(p.valor),
      duration: p.tempo,
    })),
    patients: patientsRaw.map((p) => ({
      id: p.paciente_id,
      name: p.nome,
      email: p.email,
      phone: p.celular,
      birth: p.nascimento,
      neighborhood: p.bairro,
      cpf: "",
    })),
    professionals: professionalsRaw.map((p) => ({
      id: p.profissional_id,
      name: p.nome,
      email: p.email,
      cpf: p.cpf,
      crm: p.crm,
      specialization: p.especialidade,
      sys_user: p.sys_user,
    })),
    feegowError: errors.length > 0 ? errors.join(" · ") : null,
  };
}
