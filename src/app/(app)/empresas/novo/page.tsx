import { Building2 } from "lucide-react";

import { requireSuperAdmin } from "@/lib/auth";

import { PageHeader } from "../../_components/page-header";
import { EmpresaForm } from "../_components/empresa-form";

export const metadata = { title: "Nova Empresa · InfinitePlan" };

export default async function NovaEmpresaPage() {
  await requireSuperAdmin();
  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 max-w-4xl">
      <PageHeader
        title="Nova Empresa"
        description="Cadastrar nova empresa no sistema"
        icon={Building2}
        backHref="/empresas"
      />
      <EmpresaForm mode="create" />
    </div>
  );
}
