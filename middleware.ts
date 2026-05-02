import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Middleware raiz Next.js. Roda em toda request que bate o matcher abaixo.
 * Delega a updateSession() — que renova a sessão Supabase e cuida do redirect
 * para login quando necessário.
 *
 * Substituto direto do <ProtectedRoute> + auth-context do projeto Vite.
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match em tudo, EXCETO:
     * - assets estáticos (_next/static, _next/image)
     * - favicon
     * - imagens, fontes, ícones e outros estáticos comuns
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|ttf|otf)$).*)",
  ],
};
