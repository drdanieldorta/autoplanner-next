import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type Role = Database["public"]["Enums"]["user_role"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type CurrentUser = {
  id: string;
  email: string | null;
  profile: Profile | null;
  role: Role | null;
  companyId: string | null;
  loginMode: "super_admin" | "company" | null;
  isSuperAdmin: boolean;
  isCompanyAdmin: boolean;
  isAdmin: boolean;
  /** True quando o super_admin está "vestido" como uma empresa cliente. */
  isImpersonating: boolean;
  /** Id da empresa que está sendo impersonada (= companyId enquanto ativo). */
  impersonatingCompanyId: string | null;
};

/**
 * Resolve o usuário atual + profile + role + cookie login_mode.
 * Aplica a mesma lógica de precedência do auth-context do Vite:
 *   - login_mode=super_admin força role=super_admin (se houver)
 *   - login_mode=company filtra roles na empresa do profile
 *   - sem mode: super_admin precede company_admin precede company_user
 *
 * Devolve null se não houver sessão.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const cookieStore = await cookies();
  const loginMode = (cookieStore.get("login_mode")?.value ?? null) as
    | "super_admin"
    | "company"
    | null;

  const profileResult = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  const profile = profileResult.data as Profile | null;

  const profileCompanyId = profile?.company_id ?? null;

  const rolesResult = await supabase
    .from("user_roles")
    .select("role, company_id")
    .eq("user_id", user.id);
  const roles = rolesResult.data as
    | Array<{ role: Role; company_id: string | null }>
    | null;

  let role: Role | null = null;
  if (roles && roles.length > 0) {
    const superAdminRow = roles.find((r) => r.role === "super_admin");
    if (loginMode === "super_admin" && superAdminRow) {
      role = "super_admin";
    } else if (loginMode !== "company" && superAdminRow) {
      role = "super_admin";
    } else if (profileCompanyId) {
      const companyRoles = roles.filter(
        (r) => r.company_id === profileCompanyId,
      );
      const adminRow = companyRoles.find((r) => r.role === "company_admin");
      role = (adminRow ?? companyRoles[0])?.role ?? null;
    }
  }

  // Impersonation: super_admin pode "entrar" numa empresa cliente.
  // Cookie `impersonating_company_id` é setado pela Server Action
  // startImpersonation. Enquanto ativo, o user é apresentado como
  // company_admin daquela empresa — o painel inteiro reaproveita o
  // mesmo código sem precisar de variantes "super_admin only".
  // Cookie é ignorado se o user não for super_admin de fato.
  const impersonatingCompanyId =
    cookieStore.get("impersonating_company_id")?.value ?? null;
  const isImpersonating =
    !!impersonatingCompanyId && role === "super_admin";

  let effectiveRole: Role | null = role;
  let effectiveCompanyId = profileCompanyId;
  if (isImpersonating) {
    effectiveRole = "company_admin";
    effectiveCompanyId = impersonatingCompanyId;
  }

  const isSuperAdmin = effectiveRole === "super_admin";
  const isCompanyAdmin = effectiveRole === "company_admin" || isSuperAdmin;

  return {
    id: user.id,
    email: user.email ?? null,
    profile: profile ?? null,
    role: effectiveRole,
    companyId: effectiveCompanyId,
    loginMode,
    isSuperAdmin,
    isCompanyAdmin,
    isAdmin: isCompanyAdmin,
    isImpersonating,
    impersonatingCompanyId: isImpersonating ? impersonatingCompanyId : null,
  };
}

/**
 * Garante que existe sessão. Se não houver, redireciona para login.
 * Use no topo de Server Components / Layouts protegidos.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login-employee");
  return user;
}

/**
 * Como requireUser, mas só passa se for super_admin.
 */
export async function requireSuperAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.isSuperAdmin) redirect("/");
  return user;
}

/**
 * Como requireUser, mas só passa se for admin da empresa (company_admin OU super_admin).
 */
export async function requireCompanyAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.isCompanyAdmin) redirect("/");
  return user;
}
