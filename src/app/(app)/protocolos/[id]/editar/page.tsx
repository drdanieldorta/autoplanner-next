import { notFound } from "next/navigation";
import { FileText } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { getProtocolById } from "@/lib/services/protocols";
import { loadProtocolFormData } from "@/lib/services/protocol-form-data";
import { PageHeader } from "../../../_components/page-header";
import { ProtocolForm } from "../../_components/protocol-form";

export const metadata = { title: "Editar Protocolo · InfinitePlan" };
export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!user.companyId) notFound();

  const { id } = await params;
  const [protocol, formData] = await Promise.all([
    getProtocolById({ id, companyId: user.companyId }),
    loadProtocolFormData(user.companyId),
  ]);
  if (!protocol) notFound();

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 max-w-5xl">
      <PageHeader
        title="Editar Protocolo"
        description={protocol.name}
        icon={FileText}
        backHref="/protocolos"
      />
      <ProtocolForm
        mode="edit"
        initialId={protocol.id}
        hasFeegow={formData.hasFeegow}
        feegowError={formData.feegowError}
        procedures={formData.procedures}
        initialValues={{
          name: protocol.name,
          items: protocol.items.map((item) => ({
            procedure_id: item.procedure_id,
            procedure_name: item.procedure_name,
            quantity: item.quantity,
            interval_days: item.interval_days ?? 0,
            value_cents: item.value_cents,
            discount_percent: item.discount_percent ?? 0,
          })),
        }}
      />
    </div>
  );
}
