import { notFound } from "next/navigation";
import { CalendarDays } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { loadPrescricaoFonte } from "@/lib/services/prescricoes";
import { PageHeader } from "../../../_components/page-header";
import { CronogramaEditor } from "../../_components/cronograma-editor";

export const metadata = { title: "Cronograma de aplicações · InfinitePlan" };
export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!user.companyId) notFound();

  const { id } = await params;
  const fonte = await loadPrescricaoFonte({
    propostaId: id,
    companyId: user.companyId,
  });
  if ("error" in fonte) notFound();

  const { plano, itens, ajustes, alinharSemana, anterior } = fonte;

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 max-w-5xl">
      <PageHeader
        title="Cronograma de aplicações"
        description={`${plano.paciente.nome} · ${plano.protocolo.nome}`}
        icon={CalendarDays}
        backHref={`/orcamentos/${id}`}
      />
      <CronogramaEditor
        propostaId={id}
        itens={itens}
        contexto={{
          clinica: plano.clinica,
          paciente: {
            nome: plano.paciente.nome,
            cpf: plano.paciente.cpf,
            nascimento: plano.paciente.nascimento,
            telefone: plano.paciente.telefone,
            feegow_id: plano.paciente.feegow_id,
          },
          profissional: plano.profissional,
          protocolo: plano.protocolo,
          proposta_ref: plano.proposta_ref,
          revisao: anterior.revisao,
        }}
        inicial={{
          inicio: plano.inicio,
          observacoes: plano.observacoes ?? "",
          alergias: plano.paciente.alergias ?? "",
          ajustes,
          alinharSemana,
        }}
        jaEnviada={Boolean(anterior.hashEnviado)}
      />
    </div>
  );
}
