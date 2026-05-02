import "server-only";

import { NextResponse } from "next/server";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";

/**
 * Helpers compartilhados pelos Route Handlers em `app/api/*`.
 *
 * Auth: Route Handlers reusam a sessão do cookie via `getCurrentUser()`.
 * Não funcionam para callers externos (n8n, terceiros). Para webhooks
 * inbound de terceiros (ex: Authentique), validar via assinatura HMAC.
 */

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireUserOr401(): Promise<
  | { ok: true; user: CurrentUser }
  | { ok: false; response: ReturnType<typeof jsonError> }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, response: jsonError("Unauthorized", 401) };
  return { ok: true, user };
}

export async function requireUserWithCompanyOr401(): Promise<
  | { ok: true; user: CurrentUser & { companyId: string } }
  | { ok: false; response: ReturnType<typeof jsonError> }
> {
  const auth = await requireUserOr401();
  if (!auth.ok) return auth;
  if (!auth.user.companyId) {
    return {
      ok: false,
      response: jsonError("Sua conta não está associada a uma empresa.", 403),
    };
  }
  return {
    ok: true,
    user: auth.user as CurrentUser & { companyId: string },
  };
}
