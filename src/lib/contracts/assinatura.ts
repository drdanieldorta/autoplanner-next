import "server-only";

import { getCompanyCredentials } from "@/lib/integrations/credentials";
import { feegow } from "@/lib/integrations/feegow";
import { createAdminClient } from "@/lib/supabase/admin";

/** `status_id` de "Aprovada pelo cliente" (o mesmo id na Feegow). */
const STATUS_APROVADA = 2;

/**
 * Grava `contract_signed_at` de uma assinatura já CONFIRMADA na Autentique
 * (`getDocumentInfo` com `status === "signed"`) e, se foi esta chamada que
 * gravou, passa o orçamento para "Aprovada" (`aprovarOrcamentoAssinado`).
 *
 * Usado pelo card do contrato, pela sincronização da listagem e pelo botão
 * "Enviar ao prontuário", para o painel refletir a assinatura mesmo quando o
 * webhook não chega (clínica sem a URL cadastrada na Autentique). Só carimba:
 * anexar ao prontuário continua com o webhook e o botão do card, porque pode
 * ser o n8n que ainda recebe os eventos e anexa, e a Feegow não apaga anexo.
 *
 * Idempotente e preso ao DOCUMENTO: só grava se ainda estiver nulo e se o
 * orçamento ainda aponta para o documento consultado (um reenvio no meio do
 * caminho troca o documento e zera a assinatura).
 */
export async function registrarAssinatura(args: {
  propostaId: string;
  documentId: string;
  signedAt: string;
}): Promise<boolean> {
  const result = await createAdminClient()
    .from("propostas")
    .update({ contract_signed_at: args.signedAt } as never)
    .eq("id", args.propostaId)
    .eq("document_id", args.documentId)
    .is("contract_signed_at", null)
    .select("id");
  if (result.error) throw new Error(result.error.message);
  const gravou = ((result.data ?? []) as { id: string }[]).length > 0;
  if (gravou) await aprovarOrcamentoAssinado(args.propostaId);
  return gravou;
}

/**
 * Paciente assinou ⇒ orçamento "Aprovada" (decisão 2026-11-17).
 *
 * Só sai de "Pendente" (ou sem status): Recusada, Em execução e Finalizada
 * foram escolhas à mão e não são desfeitas. Espelha na Feegow como a troca
 * manual faz (`PATCH /api/propostas/[id]/status`), mas sem bloquear: a
 * assinatura já está registrada, e uma Feegow fora do ar não pode desfazer
 * isso. Nunca lança.
 */
export async function aprovarOrcamentoAssinado(propostaId: string): Promise<void> {
  try {
    const result = await createAdminClient()
      .from("propostas")
      .update({ status_id: STATUS_APROVADA, status: "aprovado" } as never)
      .eq("id", propostaId)
      .or("status_id.is.null,status_id.eq.1")
      .select("company_id, id_proposta_api");
    if (result.error) throw new Error(result.error.message);
    const linha = ((result.data ?? []) as {
      company_id: string;
      id_proposta_api: number | null;
    }[])[0];
    if (!linha?.id_proposta_api) return;

    const creds = await getCompanyCredentials(linha.company_id);
    if (!creds?.feegow_token || creds.webhook_enabled === false) return;
    await feegow(creds.feegow_token).changeProposalStatus({
      proposal_id: linha.id_proposta_api,
      status_id: STATUS_APROVADA,
    });
  } catch (err) {
    console.error("[assinatura] Falha ao aprovar o orçamento assinado:", {
      propostaId,
      erro: err instanceof Error ? err.message : String(err),
    });
  }
}
