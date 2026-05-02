import { NextResponse } from "next/server";

import { jsonError } from "@/app/api/_lib/api-helpers";
import { requireUser } from "@/lib/auth";
import { getFuncionarioToolPermissions } from "@/lib/services/user-tools";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type RoleRow = Database["public"]["Tables"]["user_roles"]["Row"];

/**
 * Lê as permissões + ferramentas disponíveis para um funcionário.
 * Usado pelo dialog "Permissões" na listagem de funcionários.
 *
 * Auth: company_admin OU super_admin. Filtra estritamente pela empresa
 * do caller — se um company_admin tentar acessar funcionário de outra
 * empresa, devolve 404.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: targetUserId } = await ctx.params;
  const user = await requireUser();
  if (!user.isCompanyAdmin) return jsonError("Acesso restrito", 403);
  if (!user.companyId) return jsonError("Sem empresa associada", 403);

  const supabase = await createClient();
  const profileResult = await supabase
    .from("profiles")
    .select("user_id, company_id")
    .eq("user_id", targetUserId)
    .maybeSingle();
  const profile = profileResult.data as Pick<
    ProfileRow,
    "user_id" | "company_id"
  > | null;
  if (!profile || profile.company_id !== user.companyId) {
    return jsonError("Funcionário não encontrado", 404);
  }

  const rolesResult = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", targetUserId)
    .eq("company_id", user.companyId);
  const roles = (rolesResult.data ?? []) as Pick<RoleRow, "role">[];
  const isAdmin = roles.some((r) => r.role === "company_admin");

  const data = await getFuncionarioToolPermissions({
    userId: targetUserId,
    companyId: user.companyId,
    isAdmin,
  });

  return NextResponse.json({
    isAdmin,
    toolIds: data.toolIds,
    companyTools: data.companyTools,
  });
}
