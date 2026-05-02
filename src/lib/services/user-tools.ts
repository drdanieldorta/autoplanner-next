import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type ToolRow = Database["public"]["Tables"]["tools"]["Row"];
type CompanyToolRow = Database["public"]["Tables"]["company_tools"]["Row"];

export type Tool = ToolRow;

/**
 * Lista as ferramentas que um usuário pode acessar:
 * - Admins de empresa (company_admin OU super_admin) veem TODAS as ferramentas
 *   habilitadas para a empresa.
 * - Demais funcionários veem só as ferramentas que constam em
 *   `user_tool_permissions` para o (user, company).
 *
 * RLS já protege os reads, mas o filtro explícito por `company_id` é o
 * cinto de segurança usual deste projeto.
 */
export async function listToolsForUser(args: {
  userId: string;
  companyId: string;
  isCompanyAdmin: boolean;
}): Promise<Tool[]> {
  const supabase = await createClient();

  if (args.isCompanyAdmin) {
    const result = await supabase
      .from("company_tools")
      .select("tool:tools(*)")
      .eq("company_id", args.companyId)
      .eq("enabled", true);
    if (result.error) throw new Error(result.error.message);
    type Joined = Pick<CompanyToolRow, never> & { tool: ToolRow | null };
    const rows = (result.data ?? []) as Joined[];
    return rows
      .map((r) => r.tool)
      .filter((t): t is ToolRow => Boolean(t))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }

  const result = await supabase
    .from("user_tool_permissions")
    .select("tool:tools(*)")
    .eq("user_id", args.userId)
    .eq("company_id", args.companyId);
  if (result.error) throw new Error(result.error.message);
  type Joined = { tool: ToolRow | null };
  const rows = (result.data ?? []) as Joined[];
  return rows
    .map((r) => r.tool)
    .filter((t): t is ToolRow => Boolean(t))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

/**
 * IDs das ferramentas para as quais um funcionário tem permissão explícita.
 * Usado pelo dialog de gerenciamento (admin marca/desmarca toolboxes).
 *
 * Para `isAdmin`, devolve todas as tool_ids habilitadas para a empresa
 * (acesso implícito — espelho do legacy).
 */
export async function getFuncionarioToolPermissions(args: {
  userId: string;
  companyId: string;
  isAdmin: boolean;
}): Promise<{ toolIds: string[]; companyTools: Tool[] }> {
  const supabase = await createClient();

  const companyToolsResult = await supabase
    .from("company_tools")
    .select("tool:tools(*)")
    .eq("company_id", args.companyId)
    .eq("enabled", true);
  if (companyToolsResult.error)
    throw new Error(companyToolsResult.error.message);
  type Joined = { tool: ToolRow | null };
  const companyTools = ((companyToolsResult.data ?? []) as Joined[])
    .map((r) => r.tool)
    .filter((t): t is ToolRow => Boolean(t))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  if (args.isAdmin) {
    return {
      toolIds: companyTools.map((t) => t.id),
      companyTools,
    };
  }

  const permsResult = await supabase
    .from("user_tool_permissions")
    .select("tool_id")
    .eq("user_id", args.userId)
    .eq("company_id", args.companyId);
  if (permsResult.error) throw new Error(permsResult.error.message);
  const toolIds = ((permsResult.data ?? []) as { tool_id: string }[]).map(
    (r) => r.tool_id,
  );

  return { toolIds, companyTools };
}
