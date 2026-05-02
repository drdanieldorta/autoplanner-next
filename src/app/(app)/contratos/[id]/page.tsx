import { notFound } from "next/navigation";
import { FileSignature } from "lucide-react";

import { requireCompanyAdmin } from "@/lib/auth";
import { getContractById } from "@/lib/services/contratos";
import { PageHeader } from "../../_components/page-header";
import { ContratoForm } from "../_components/contrato-form";

export const metadata = { title: "Editar Contrato · InfinitePlan" };
export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireCompanyAdmin();
  if (!user.companyId) notFound();

  const { id } = await params;
  const contract = await getContractById({ id, companyId: user.companyId });
  if (!contract) notFound();

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 max-w-5xl">
      <PageHeader
        title="Editar Contrato"
        description={contract.name}
        icon={FileSignature}
        backHref="/contratos"
      />
      <ContratoForm
        mode="edit"
        initialId={contract.id}
        initialValues={{
          name: contract.name,
          description: contract.description ?? "",
          content: contract.content,
        }}
      />
    </div>
  );
}
