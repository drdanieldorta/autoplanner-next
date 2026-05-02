import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type RoleRow = Pick<
  Database["public"]["Tables"]["user_roles"]["Row"],
  "user_id" | "role" | "company_id"
>;

export type Funcionario = ProfileRow & {
  roles: Database["public"]["Enums"]["user_role"][];
  isAdmin: boolean;
};

/**
 * Lista funcionários (profiles) da empresa + roles correspondentes.
 *
 * Importante: profiles e user_roles não têm FK direto entre si — são
 * unidos manualmente via user_id (mesmo padrão do Vite legacy).
 */
export async function listFuncionarios(args: {
  companyId: string;
}): Promise<Funcionario[]> {
  const supabase = await createClient();
  const profilesResult = await supabase
    .from("profiles")
    .select("*")
    .eq("company_id", args.companyId);
  if (profilesResult.error) throw new Error(profilesResult.error.message);
  const profiles = (profilesResult.data ?? []) as ProfileRow[];

  const userIds = profiles.map((p) => p.user_id).filter(Boolean);
  if (userIds.length === 0) return [];

  const rolesResult = await supabase
    .from("user_roles")
    .select("user_id, role, company_id")
    .eq("company_id", args.companyId)
    .in("user_id", userIds);
  if (rolesResult.error) throw new Error(rolesResult.error.message);
  const allRoles = (rolesResult.data ?? []) as RoleRow[];

  const rolesByUser = allRoles.reduce<
    Record<string, Database["public"]["Enums"]["user_role"][]>
  >((acc, r) => {
    if (!acc[r.user_id]) acc[r.user_id] = [];
    acc[r.user_id].push(r.role);
    return acc;
  }, {});

  return profiles.map((p) => {
    const roles = rolesByUser[p.user_id] ?? [];
    return {
      ...p,
      roles,
      isAdmin: roles.includes("company_admin"),
    };
  });
}
