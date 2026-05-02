import { requireUser } from "@/lib/auth";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./_components/app-sidebar";
import { AppHeader } from "./_components/app-header";
import { PendingApproval } from "./_components/pending-approval";
import { ImpersonationBanner } from "./_components/impersonation-banner";

/**
 * Layout do grupo (app) — toda rota dentro deste grupo:
 *   1. Exige sessão (middleware já redireciona, mas garantimos aqui também)
 *   2. Bloqueia acesso se profile.status != 'approved'
 *   3. Renderiza sidebar (filtrada por role) + header + conteúdo
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  if (user.profile && user.profile.status !== "approved") {
    return (
      <PendingApproval
        email={user.profile.email ?? user.email}
        status={user.profile.status}
      />
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar
        isAdmin={user.isAdmin}
        isSuperAdmin={user.isSuperAdmin}
        isCompanyAdmin={user.isCompanyAdmin}
      />
      <div className="flex-1 flex flex-col min-h-screen w-full bg-background">
        {user.isImpersonating && user.impersonatingCompanyId && (
          <ImpersonationBanner companyId={user.impersonatingCompanyId} />
        )}
        <AppHeader
          isSuperAdmin={user.isSuperAdmin}
          companyId={user.companyId}
          displayName={user.profile?.display_name ?? user.profile?.name ?? null}
        />
        <main className="flex-1 bg-background">
          <div className="animate-fade-in">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
