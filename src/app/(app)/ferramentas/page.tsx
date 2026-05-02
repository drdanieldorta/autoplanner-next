import { requireSuperAdmin } from "@/lib/auth";
import { ComingSoon } from "../_components/coming-soon";

export const metadata = { title: "Ferramentas · InfinitePlan" };

export default async function FerramentasPage() {
  await requireSuperAdmin();
  return (
    <ComingSoon
      title="Ferramentas"
      phase={3}
      description="Gestão de tools e atribuição a empresas entra junto com as mutations."
    />
  );
}
