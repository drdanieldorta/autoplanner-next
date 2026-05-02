import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./types";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Refresca a sessão do usuário a cada request e cuida do redirect de auth.
 *
 * Padrão oficial @supabase/ssr — chamado pelo middleware.ts da raiz.
 *
 * Regras:
 *   - Rotas públicas: /login-* (super-admin, company, employee)
 *   - Tudo o resto exige sessão válida.
 *   - Sem sessão → redireciona para /login-employee.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE: chamar getUser() aqui é o que renova o cookie quando expira.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isPublicRoute =
    pathname.startsWith("/login-super-admin") ||
    pathname.startsWith("/login-company") ||
    pathname.startsWith("/login-employee") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth"); // endpoints públicos de auth

  if (!user && !isPublicRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login-employee";
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Se autenticado e tentando acessar página de login, manda pra raiz.
  if (user && pathname.startsWith("/login-")) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  return response;
}
