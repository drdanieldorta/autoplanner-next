import { notFound } from "next/navigation";
import { FileText } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { isVia } from "@/lib/prescricao/enums";
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
        // ⚠️ Este map é destrutivo por natureza: `updateProtocol` faz
        // delete-then-insert dos itens, então TODO campo novo de
        // protocol_items precisa ser repassado aqui. Um campo esquecido não
        // fica "sem aparecer no form" — ele é apagado do banco assim que
        // alguém salvar o protocolo, ainda que só tenha mudado o preço.
        initialValues={{
          name: protocol.name,
          cuidados_gerais: protocol.cuidados_gerais ?? "",
          sinais_alerta: protocol.sinais_alerta ?? "",
          items: protocol.items.map((item) => ({
            procedure_id: item.procedure_id,
            procedure_name: item.procedure_name,
            quantity: item.quantity,
            interval_days: item.interval_days ?? 0,
            value_cents: item.value_cents,
            discount_percent: item.discount_percent ?? 0,
            // `protocol_items.via` é TEXT no banco (CHECK, não enum PG), então
            // chega como `string | null`. Estreitamos aqui: um valor fora da
            // união vira null e o form pede para escolher, em vez de vazar
            // string arbitrária para dentro do schema.
            via: isVia(item.via) ? item.via : null,
            dose: item.dose ?? "",
            inicio_dias: item.inicio_dias ?? 0,
            cuidados: item.cuidados ?? "",
          })),
        }}
      />
    </div>
  );
}
