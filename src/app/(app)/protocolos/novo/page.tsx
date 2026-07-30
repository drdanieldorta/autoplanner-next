import { FileText } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { loadProtocolFormData } from "@/lib/services/protocol-form-data";
import { PageHeader } from "../../_components/page-header";
import { ProtocolForm } from "../_components/protocol-form";

export const metadata = { title: "Novo Protocolo · InfinitePlan" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await requireUser();

  const formData = user.companyId
    ? await loadProtocolFormData(user.companyId)
    : { hasFeegow: false, procedures: [], feegowError: null };

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 max-w-5xl">
      <PageHeader
        title="Novo Protocolo"
        description="Cadastre um modelo de plano de procedimentos"
        icon={FileText}
        backHref="/protocolos"
      />
      <ProtocolForm
        mode="create"
        hasFeegow={formData.hasFeegow}
        feegowError={formData.feegowError}
        procedures={formData.procedures}
        initialValues={{
          name: "",
          items: [],
        }}
      />
    </div>
  );
}
