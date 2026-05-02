import { requireSuperAdmin } from "@/lib/auth";
import { ComingSoon } from "../_components/coming-soon";

export const metadata = { title: "Usuários · InfinitePlan" };

export default async function UsuariosPage() {
  await requireSuperAdmin();
  return (
    <ComingSoon
      title="Usuários"
      phase={3}
      description="Gestão global de usuários (super admin)."
    />
  );
}
