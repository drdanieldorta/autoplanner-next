import "server-only";

import { createClient } from "@/lib/supabase/server";
import { listFuncionarios, type Funcionario } from "@/lib/services/funcionarios";
import { getCompanyById, type Company } from "@/lib/services/empresas";
import type { Database } from "@/lib/supabase/types";

type ToolRow = Database["public"]["Tables"]["tools"]["Row"];
type CompanyToolRow = Database["public"]["Tables"]["company_tools"]["Row"];
type CompanyCrmLinkRow =
  Database["public"]["Tables"]["company_crm_links"]["Row"];

export type Tool = ToolRow;
export type CompanyTool = CompanyToolRow & { tool: ToolRow | null };
export type CompanyCrmLink = CompanyCrmLinkRow;

export type EmpresaDetail = {
  company: Company;
  funcionarios: Funcionario[];
  availableTools: Tool[];
  assignedTools: CompanyTool[];
  crmLink: CompanyCrmLink | null;
};

/**
 * Carrega todos os dados necessários para a tela de detalhe da empresa
 * (super_admin). Faz as queries em paralelo, mas exige `requireSuperAdmin`
 * antes (RLS protege também).
 */
export async function loadEmpresaDetail(
  companyId: string,
): Promise<EmpresaDetail | null> {
  const supabase = await createClient();

  const [companyRes, funcionariosRes, toolsRes, companyToolsRes, crmLinkRes] =
    await Promise.all([
      getCompanyById(companyId),
      listFuncionarios({ companyId }),
      supabase.from("tools").select("*").order("name", { ascending: true }),
      supabase
        .from("company_tools")
        .select("*, tool:tools(*)")
        .eq("company_id", companyId),
      supabase
        .from("company_crm_links")
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle(),
    ]);

  if (!companyRes) return null;
  if (toolsRes.error) throw new Error(toolsRes.error.message);
  if (companyToolsRes.error) throw new Error(companyToolsRes.error.message);
  if (crmLinkRes.error && crmLinkRes.error.code !== "PGRST116") {
    throw new Error(crmLinkRes.error.message);
  }

  return {
    company: companyRes,
    funcionarios: funcionariosRes,
    availableTools: (toolsRes.data ?? []) as Tool[],
    assignedTools: (companyToolsRes.data ?? []) as CompanyTool[],
    crmLink: (crmLinkRes.data ?? null) as CompanyCrmLink | null,
  };
}
