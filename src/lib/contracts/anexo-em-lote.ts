import "server-only";

import {
  anexarContratoAssinadoNaFeegow,
  pacienteDaFeegow,
  situacaoDoAnexo,
} from "@/lib/contracts/feegow-anexo";
import { getCompanyCredentials } from "@/lib/integrations/credentials";
import { createAdminClient } from "@/lib/supabase/admin";

/** Cada envio baixa o PDF da Autentique e sobe na Feegow: poucos por chamada. */
export const ANEXOS_POR_CHAMADA = 5;

type Pendente = {
  id: string;
  paciente_nome: string | null;
};

/**
 * Contratos ASSINADOS de paciente da Feegow que ainda não estão no
 * prontuário: sem registro de envio ou com falha certa. Fica de fora o que
 * está em envio agora e o que está "em dúvida" (pode ter chegado à Feegow),
 * porque a Feegow não apaga anexo. Empresa sem Feegow ou sem Autentique:
 * lista vazia.
 */
export async function contratosAssinadosForaDoProntuario(
  companyId: string,
): Promise<Pendente[]> {
  const creds = await getCompanyCredentials(companyId);
  if (!creds?.feegow_token || !creds.authentique_token) return [];

  const result = await createAdminClient()
    .from("propostas")
    .select(
      "id, paciente_id, paciente_nome, contract_feegow_em, contract_feegow_iniciado_em, contract_feegow_erro",
    )
    .eq("company_id", companyId)
    .not("document_id", "is", null)
    .not("contract_signed_at", "is", null)
    .is("contract_feegow_em", null)
    .order("contract_signed_at", { ascending: true });
  if (result.error) throw new Error(result.error.message);

  return (
    (result.data ?? []) as Array<
      Pendente & {
        paciente_id: string | null;
        contract_feegow_em: string | null;
        contract_feegow_iniciado_em: string | null;
        contract_feegow_erro: string | null;
      }
    >
  )
    .filter((p) => !!pacienteDaFeegow(p.paciente_id))
    .filter((p) => {
      const situacao = situacaoDoAnexo(p);
      return !situacao.emAndamento && !situacao.emDuvida;
    })
    .map((p) => ({ id: p.id, paciente_nome: p.paciente_nome }));
}

export type ResultadoDoLote = {
  enviados: number;
  falhas: Array<{ id: string; paciente: string; mensagem: string }>;
  /** Ids tentados nesta chamada, com ou sem sucesso. */
  tentados: string[];
  /** Quantos ainda faltam, sem contar os já tentados nesta rodada. */
  restantes: number;
};

/**
 * Envia ao prontuário o próximo lote, pulando os já tentados nesta rodada
 * (uma falha permanente, como paciente apagado na Feegow, não pode prender
 * a rodada em loop). Usa o mesmo caminho do botão do card, com a
 * confirmação de duplicata já dada por quem pediu o envio em lote.
 */
export async function anexarProximoLote(args: {
  companyId: string;
  jaTentados: string[];
}): Promise<ResultadoDoLote> {
  const ignorar = new Set(args.jaTentados);
  const fila = (await contratosAssinadosForaDoProntuario(args.companyId)).filter(
    (p) => !ignorar.has(p.id),
  );
  const lote = fila.slice(0, ANEXOS_POR_CHAMADA);

  let enviados = 0;
  const falhas: ResultadoDoLote["falhas"] = [];
  for (const p of lote) {
    const r = await anexarContratoAssinadoNaFeegow({
      propostaId: p.id,
      companyId: args.companyId,
      confirmarDuplicata: true,
    });
    if (r.status === "anexado" || r.status === "ja_anexado") {
      enviados++;
      continue;
    }
    falhas.push({
      id: p.id,
      paciente: p.paciente_nome ?? "Paciente",
      mensagem:
        r.status === "erro"
          ? r.mensagem
          : r.status === "nao_aplicavel"
            ? r.motivo
            : r.status === "nao_assinado"
              ? "A Autentique não confirma a assinatura"
              : "Envio em andamento ou não confirmado; confira o prontuário",
    });
  }

  return {
    enviados,
    falhas,
    tentados: lote.map((p) => p.id),
    restantes: Math.max(0, fila.length - lote.length),
  };
}
