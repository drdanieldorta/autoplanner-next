import { Eye, LogOut } from "lucide-react";

import { stopImpersonation } from "@/lib/impersonation";
import { createAdminClient } from "@/lib/supabase/admin";

type Props = {
  companyId: string;
};

/**
 * Banner persistente exibido no topo do app enquanto o super_admin
 * estiver impersonando uma empresa. Lê o nome da empresa via admin
 * client (RLS bloquearia super_admin "vestido" de company_admin).
 */
export async function ImpersonationBanner({ companyId }: Props) {
  const admin = createAdminClient();
  const result = await admin
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .maybeSingle();
  const companyName = (result.data as { name?: string } | null)?.name ?? companyId;

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/40 text-amber-900 dark:text-amber-200 px-4 py-2 flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <Eye className="h-4 w-4 shrink-0" />
        <span className="truncate">
          Você está agindo como <strong>{companyName}</strong>. Tudo o que
          criar, editar ou enviar fica registrado nessa empresa.
        </span>
      </div>
      <form action={stopImpersonation}>
        <button
          type="submit"
          className="flex items-center gap-1.5 rounded border border-amber-500/40 px-2 py-1 hover:bg-amber-500/20 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair
        </button>
      </form>
    </div>
  );
}
