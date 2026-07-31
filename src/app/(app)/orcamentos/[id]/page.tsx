import { notFound } from "next/navigation";
import { Calculator } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { getCredentialsStatus } from "@/lib/services/credentials";
import { getPropostaById } from "@/lib/services/propostas";
import { getProtocolById } from "@/lib/services/protocols";
import { formatCurrency } from "@/lib/currency";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { PageHeader } from "../../_components/page-header";
import { DeleteButton } from "../../_components/delete-button";
import { StatusSelector } from "../_components/status-selector";
import { ContractActions } from "../_components/contract-actions";
import { PrescricaoActions } from "../_components/prescricao-actions";
import { deleteOrcamentoFromForm } from "../actions";

export const metadata = { title: "Orçamento · InfinitePlan" };
export const dynamic = "force-dynamic";

const PAYMENT_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  transferencia: "Transferência Bancária",
  debito: "Cartão de Débito",
  credito: "Cartão de Crédito",
};

type Procedure = {
  procedure_name: string;
  quantity: number;
  value_cents: number;
  discount_percent: number;
  interval_days: number;
};

export default async function OrcamentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const proposta = await getPropostaById({ id, companyId: user.companyId });
  if (!proposta) notFound();

  // RLS de `api_credentials` bloqueia company_user, então isto pode voltar
  // null mesmo com a empresa tendo Feegow configurada. Nesse caso assumimos
  // que existe: dizer "empresa sem token" para quem só não pode ler a tabela
  // seria mentira. Quem decide de fato é a rota, que lê via service_role.
  const credStatus = await getCredentialsStatus({ companyId: user.companyId });
  const temFeegow = credStatus?.hasFeegow ?? true;

  const protocol = proposta.protocolo_id
    ? await getProtocolById({
        id: proposta.protocolo_id,
        companyId: user.companyId,
      }).catch(() => null)
    : null;

  const procedimentosAdicionais = (proposta.procedimentos_adicionais ??
    []) as Procedure[];

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR");

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      <PageHeader
        title="Detalhes do Orçamento"
        description={`Paciente: ${proposta.paciente_nome}`}
        icon={Calculator}
        iconColor="text-accent-gold"
        iconBg="bg-accent-gold/10"
        backHref="/orcamentos"
        actions={
          <DeleteButton
            action={deleteOrcamentoFromForm}
            id={proposta.id}
            label="Excluir"
            title="Excluir orçamento?"
            description={`O orçamento de ${proposta.paciente_nome} será removido permanentemente. Não cancela contratos já enviados ao Authentique.`}
            successMessage="Orçamento excluído"
          />
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Informações */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Paciente</p>
              <p className="font-medium">{proposta.paciente_nome}</p>
              {proposta.paciente_email && (
                <p className="text-sm text-muted-foreground">
                  {proposta.paciente_email}
                </p>
              )}
              {proposta.paciente_telefone && (
                <p className="text-sm text-muted-foreground">
                  {proposta.paciente_telefone}
                </p>
              )}
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Profissional</p>
              <p className="font-medium">{proposta.profissional_nome}</p>
              {proposta.profissional_especialidade && (
                <p className="text-sm text-muted-foreground">
                  {proposta.profissional_especialidade}
                </p>
              )}
              {proposta.profissional_email && (
                <p className="text-sm text-muted-foreground">
                  {proposta.profissional_email}
                </p>
              )}
            </div>

            {proposta.protocolo_nome && (
              <div>
                <p className="text-sm text-muted-foreground">Protocolo base</p>
                <p className="font-medium">{proposta.protocolo_nome}</p>
              </div>
            )}

            <div>
              <p className="text-sm text-muted-foreground">Valor total</p>
              <p className="text-2xl font-bold text-accent-gold">
                {formatCurrency(proposta.valor_total_cents)}
              </p>
              {(proposta.discount_percent ?? 0) > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Desconto aplicado: {proposta.discount_percent}%
                </p>
              )}
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Criado em</p>
              <p>{formatDate(proposta.created_at)}</p>
            </div>

            {(proposta.payment_method || proposta.custom_payment_method) && (
              <div className="pt-3 border-t">
                <p className="text-sm text-muted-foreground">
                  Forma de pagamento
                </p>
                <p className="font-medium">
                  {proposta.payment_method
                    ? PAYMENT_LABELS[proposta.payment_method] ??
                      proposta.payment_method
                    : proposta.custom_payment_method}
                </p>
                {proposta.payment_method === "credito" &&
                  proposta.installments && (
                    <div className="text-sm text-muted-foreground mt-1">
                      <p>Parcelas: {proposta.installments}x</p>
                      {proposta.installment_value_cents && (
                        <p>
                          Valor por parcela:{" "}
                          {formatCurrency(proposta.installment_value_cents)}
                        </p>
                      )}
                    </div>
                  )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status + procedimentos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status e procedimentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Status atual
              </p>
              <StatusSelector
                propostaId={proposta.id}
                initialStatus={proposta.status}
                initialStatusId={proposta.status_id}
              />
            </div>

            {protocol && protocol.items.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Procedimentos do protocolo base
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {protocol.items.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-muted/30 rounded-lg border-l-4 border-primary"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{item.procedure_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Quantidade: {item.quantity} | Intervalo:{" "}
                            {item.interval_days} dias
                          </p>
                          {item.discount_percent > 0 && (
                            <p className="text-sm text-muted-foreground">
                              Desconto: {item.discount_percent}%
                            </p>
                          )}
                        </div>
                        <p className="font-semibold">
                          {formatCurrency(
                            item.value_cents *
                              item.quantity *
                              (1 - item.discount_percent / 100),
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t">
              <p className="text-sm text-muted-foreground mb-2">Contrato</p>
              <ContractActions
                propostaId={proposta.id}
                documentId={proposta.document_id ?? null}
              />
            </div>

            <div className="pt-3 border-t">
              <p className="text-sm text-muted-foreground mb-2">
                Cronograma de aplicações (enfermagem)
              </p>
              <PrescricaoActions
                propostaId={proposta.id}
                geradaEm={proposta.prescricao_gerada_em ?? null}
                feegowEm={proposta.prescricao_feegow_em ?? null}
                erro={proposta.prescricao_erro ?? null}
                revisao={proposta.prescricao_revisao ?? 0}
                jaEnviada={Boolean(proposta.prescricao_hash_enviado)}
                pendenteEnvio={
                  (proposta.prescricao_hash ?? null) !==
                  (proposta.prescricao_hash_enviado ?? null)
                }
                temFeegow={temFeegow}
                pacienteManual={
                  !proposta.paciente_id || proposta.paciente_id === "manual"
                }
              />
            </div>

            {procedimentosAdicionais.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Procedimentos extras
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {procedimentosAdicionais.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{p.procedure_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Quantidade: {p.quantity} | Intervalo:{" "}
                            {p.interval_days ?? 0} dias
                          </p>
                          {(p.discount_percent ?? 0) > 0 && (
                            <p className="text-sm text-muted-foreground">
                              Desconto: {p.discount_percent}%
                            </p>
                          )}
                        </div>
                        <p className="font-semibold">
                          {formatCurrency(
                            p.value_cents *
                              p.quantity *
                              (1 - (p.discount_percent ?? 0) / 100),
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
