"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const COOKIE_NAME = "impersonating_company_id";

/**
 * Inicia uma sessão de impersonation. Só super_admin pode chamar — o
 * cookie é HttpOnly então não é falsificável pelo client.
 *
 * Importante: a verificação de super_admin lê a sessão REAL (sem
 * impersonation já ativa), então um super_admin já impersonando outra
 * empresa pode trocar pra uma terceira sem precisar sair primeiro.
 * Para isso, leio user_roles direto via admin client.
 */
export async function startImpersonation(companyId: string) {
  const me = await getCurrentUser();
  if (!me) redirect("/login-employee");

  // Confirma super_admin via DB (ignora qualquer impersonation ativa).
  const admin = createAdminClient();
  const result = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", me.id)
    .eq("role", "super_admin")
    .limit(1);
  const isReallySuperAdmin = (result.data ?? []).length > 0;
  if (!isReallySuperAdmin) {
    throw new Error("Apenas super_admin pode impersonar empresas");
  }

  // Confirma que a company existe (defesa contra cookie com id arbitrário).
  const companyCheck = await admin
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .maybeSingle();
  if (!companyCheck.data) {
    throw new Error("Empresa não encontrada");
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, companyId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8, // 8h — sessões longas exigem re-entrar
    path: "/",
  });

  redirect("/");
}

/**
 * Encerra a impersonation atual. Sempre seguro de chamar — se não
 * houver cookie, vira no-op.
 */
export async function stopImpersonation() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  redirect("/empresas");
}
