import { Calculator } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { isVia } from "@/lib/prescricao/enums";
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

  // ⚠️ Este map já foi um funil que descartava a camada clínica.
  //
  // `item.id` é o `ref` do delta em `propostas.prescricao_ajustes` — sem ele
  // o formulário não tem como gravar ajuste nenhum. E via/dose/inicio_dias/
  // cuidados são o que o protocolo PROPÕE: sem eles a grade clínica do
  // orçamento nasceria vazia mesmo num protocolo todo preenchido.
  // Qualquer coluna clínica nova em `protocol_items` precisa passar por aqui.
  const protocols = protocolsRaw.map((p) => ({
    id: p.id,
    name: p.name,
    total_value_cents: p.total_value_cents,
    // Documentos que este protocolo propõe — o orçamento nasce com eles
    // marcados e pode ajustar sem alterar o protocolo.
    contractIds: p.contractIds,
    incluirTcle: p.incluir_tcle_padrao,
    items: p.items.map((item) => ({
      id: item.id,
      procedure_id: item.procedure_id,
      procedure_name: item.procedure_name,
      quantity: item.quantity,
      interval_days: item.interval_days,
      value_cents: item.value_cents,
      discount_percent: item.discount_percent,
      via: isVia(item.via) ? item.via : null,
      dose: item.dose,
      inicio_dias: item.inicio_dias ?? 0,
      cuidados: item.cuidados,
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
        patientSource={formData.patientSource}
        feegowError={formData.feegowError}
        hasCrm={formData.hasCrm}
        crmError={formData.crmError}
        crmHasMore={formData.crmHasMore}
        procedures={formData.procedures}
        patients={formData.patients}
        professionals={formData.professionals}
        protocols={protocols}
        contracts={contracts}
      />
    </div>
  );
}
