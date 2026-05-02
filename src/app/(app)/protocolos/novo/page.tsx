import { FileText } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { PageHeader } from "../../_components/page-header";
import { ProtocolForm } from "../_components/protocol-form";

export const metadata = { title: "Novo Protocolo · InfinitePlan" };

export default async function Page() {
  await requireUser();

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
        initialValues={{
          name: "",
          items: [],
        }}
      />
    </div>
  );
}
