"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type AuthResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Envia OTP por email. Usado pelos 3 fluxos de login.
 * Não diferencia tipo de usuário ainda — só dispara o magic link.
 */
export async function sendOtp(email: string): Promise<AuthResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Verifica o OTP e cria a sessão.
 * `mode` é persistido em cookie HttpOnly (substituindo localStorage do Vite).
 * Se for super_admin login, chama RPC bootstrap_super_admin (legado mantido).
 *
 * Em sucesso, redireciona para `from` (originador do redirect) ou /.
 */
export async function verifyOtp(args: {
  email: string;
  token: string;
  mode: "super_admin" | "company" | null;
  from?: string | null;
}): Promise<AuthResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: args.email,
    token: args.token,
    type: "email",
  });

  if (error) return { ok: false, error: error.message };
  if (!data.session) return { ok: false, error: "Sessão não criada." };

  if (args.mode === "super_admin") {
    const { error: bootstrapError } = await supabase.rpc(
      "bootstrap_super_admin",
    );
    if (bootstrapError) {
      console.error("bootstrap_super_admin error:", bootstrapError);
      // não bloqueia — pode já existir super admin
    }
  }

  // Persistir login_mode em cookie HttpOnly (substitui localStorage do Vite).
  const cookieStore = await cookies();
  if (args.mode) {
    cookieStore.set("login_mode", args.mode, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30 dias
      path: "/",
    });
  } else {
    cookieStore.delete("login_mode");
  }

  return { ok: true };
}

/**
 * Logout: limpa sessão Supabase e o cookie login_mode.
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const cookieStore = await cookies();
  cookieStore.delete("login_mode");

  redirect("/login-employee");
}
