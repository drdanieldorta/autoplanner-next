import { Calculator } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { listProtocolsWithItems } from "@/lib/services/protocols";
import { listContracts } from "@/lib/services/contratos";
import { loadOrcamentoFormData } from "@/lib/services/orcamento-form-data";

import { PageHeader } from "../../_components/page-header";
import { OrcamentoForm } from "../_components/orcamento-form";

export const metadata = { title: "Novo Orçamento · InfinitePlan" };
export const dynamic = "force-dynamic";

export default async function NovoOrcamentoPage() {
  const user = await requireUser();
  if (!user.companyId) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">
          Sua conta não está associada a uma empresa.
        </p>
      </div>
    );
  }

  const [formData, protocolsRaw, contractsRaw] = await Promise.all([
    loadOrcamentoFormData(user.companyId),
    listProtocolsWithItems({ companyId: user.companyId }),
    listContracts({ companyId: user.companyId }),
  ]);

  const protocols = protocolsRaw.map((p) => ({
    id: p.id,
    name: p.name,
    total_value_cents: p.total_value_cents,
    items: p.items.map((item) => ({
      procedure_id: item.procedure_id,
      procedure_name: item.procedure_name,
      quantity: item.quantity,
      interval_days: item.interval_days,
      value_cents: item.value_cents,
      discount_percent: item.discount_percent,
    })),
  }));

  const contracts = contractsRaw.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      <PageHeader
        title="Novo Orçamento"
        description="Crie uma proposta com base em protocolos ou procedimentos extras"
        icon={Calculator}
        iconColor="text-accent-gold"
        iconBg="bg-accent-gold/10"
        backHref="/orcamentos"
      />
      <OrcamentoForm
        hasFeegow={formData.hasFeegow}
        feegowError={formData.feegowError}
        procedures={formData.procedures}
        patients={formData.patients}
        professionals={formData.professionals}
        protocols={protocols}
        contracts={contracts}
      />
    </div>
  );
}
