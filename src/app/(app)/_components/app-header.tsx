import { Layers } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { LogoutButton } from "./logout-button";
import { ThemeToggle } from "./theme-toggle";

type Props = {
  isSuperAdmin: boolean;
  companyId: string | null;
  displayName: string | null;
};

/**
 * Header server-side. Resolve o título do header (nome da empresa OU nome
 * do super admin) com uma única query Supabase.
 *
 * SidebarTrigger (client) coexiste fine — Next.js permite client components
 * dentro de server components.
 */
export async function AppHeader({
  isSuperAdmin,
  companyId,
  displayName,
}: Props) {
  let headerTitle = "InfinitePlan";

  if (isSuperAdmin) {
    headerTitle = displayName ?? "Super Admin";
  } else if (companyId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("companies")
      .select("name")
      .eq("id", companyId)
      .maybeSingle<{ name: string }>();
    headerTitle = data?.name ?? "Empresa";
  }

  return (
    <header className="h-14 md:h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-2 md:gap-3">
        <SidebarTrigger className="md:hidden" />
        <div className="p-1.5 md:p-2 bg-primary-blue/10 rounded-lg">
          <Layers className="h-4 w-4 md:h-5 md:w-5 text-primary-blue" />
        </div>
        <h1 className="text-base md:text-lg font-semibold text-foreground">
          {headerTitle}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <LogoutButton
          variant="ghost"
          size="icon"
          iconOnly
          title="Sair do sistema"
        />
        <ThemeToggle />
      </div>
    </header>
  );
}
