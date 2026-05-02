import { FileSignature } from "lucide-react";

import { requireCompanyAdmin } from "@/lib/auth";
import { PageHeader } from "../../_components/page-header";
import { ContratoForm } from "../_components/contrato-form";

export const metadata = { title: "Novo Contrato · InfinitePlan" };

export default async function Page() {
  await requireCompanyAdmin();

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 max-w-5xl">
      <PageHeader
        title="Novo Contrato"
        description="Crie um template de contrato para usar nos orçamentos"
        icon={FileSignature}
        backHref="/contratos"
      />
      <ContratoForm
        mode="create"
        initialValues={{ name: "", description: "", content: "" }}
      />
    </div>
  );
}
