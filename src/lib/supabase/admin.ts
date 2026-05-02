import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Admin Supabase client (service_role).
 *
 * BYPASSA RLS — use somente em Route Handlers, Server Actions
 * e Edge Functions onde permissão já foi validada.
 *
 * NUNCA importe isto de Client Components ou expose ao bundle do browser.
 * O `import "server-only"` no topo é a salvaguarda — qualquer import
 * acidental de client-side gera erro de build.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL env vars",
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
