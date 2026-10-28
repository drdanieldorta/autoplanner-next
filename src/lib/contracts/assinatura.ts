import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Grava `contract_signed_at` de uma assinatura já CONFIRMADA na Autentique
 * (`getDocumentInfo` com `status === "signed"`).
 *
 * Usado pelo card do contrato e pela sincronização da listagem, para o painel
 * refletir a assinatura mesmo quando o webhook não chega (clínica sem a URL
 * cadastrada na Autentique). Só carimba: anexar ao prontuário continua com o
 * webhook e o botão do card, porque pode ser o n8n que ainda recebe os
 * eventos e anexa, e a Feegow não apaga anexo.
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
  return ((result.data ?? []) as { id: string }[]).length > 0;
}
