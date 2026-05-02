import "server-only";

import {
  feegow,
  FeegowError,
  type FeegowPatient,
  type FeegowProcedure,
  type FeegowProfessional,
} from "@/lib/integrations/feegow";
import { getCompanyCredentials } from "@/lib/integrations/credentials";
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
  procedures: OrcamentoProcedureOption[];
  patients: OrcamentoPatientOption[];
  professionals: OrcamentoProfessionalOption[];
  /** True quando alguma chamada Feegow falhou — UI exibe aviso. */
  feegowError: string | null;
};

/**
 * Carrega os dados auxiliares para o form de Orçamento com base no
 * modo da empresa.
 *
 * - Modo automático (Feegow configurado): puxa procedimentos/pacientes/
 *   profissionais da API Feegow via factory server-side.
 * - Modo manual (sem Feegow): procedimentos vazios (digitados na hora),
 *   pacientes vazios (digitados na hora), profissionais vêm de profiles.
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
    const funcionarios = await listFuncionarios({ companyId });
    return {
      hasFeegow: false,
      procedures: [],
      patients: [],
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
