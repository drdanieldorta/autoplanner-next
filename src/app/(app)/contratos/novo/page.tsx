import { notFound } from "next/navigation";
import { FileSignature } from "lucide-react";

import { requireCompanyAdmin } from "@/lib/auth";
import {
  getDocumentBranding,
  renderBrandingCss,
  renderBrandingHeader,
} from "@/lib/branding/document";
import { PageHeader } from "../../_components/page-header";
import { ContratoForm } from "../_components/contrato-form";

export const metadata = { title: "Novo Contrato · InfinitePlan" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await requireCompanyAdmin();
  if (!user.companyId) notFound();

  // A prévia do editor usa a marca da empresa, como o PDF.
  const branding = await getDocumentBranding(user.companyId);
  const preview = {
    brandingHeaderHtml: renderBrandingHeader(branding),
    brandingCss: renderBrandingCss(branding),
  };

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 max-w-7xl">
      <PageHeader
        title="Novo Contrato"
        description="Crie um template de contrato para usar nos orçamentos"
        icon={FileSignature}
        backHref="/contratos"
      />
      <ContratoForm
        mode="create"
        initialValues={{ name: "", description: "", content: "" }}
        preview={preview}
      />
    </div>
  );
}
