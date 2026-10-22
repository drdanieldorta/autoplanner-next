import "server-only";

import { authentique } from "@/lib/integrations/authentique";
import { getCompanyCredentials } from "@/lib/integrations/credentials";
import { feegow } from "@/lib/integrations/feegow";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Anexo do contrato ASSINADO ao prontuário do paciente na Feegow.
 *
 * Chamado pelo webhook da Autentique (automático, assim que o paciente
 * assina) e pelo botão "Enviar ao prontuário" da tela do orçamento (para
 * quando o automático falhou ou o contrato foi assinado antes de o webhook
 * existir).
 *
 * Estado próprio, separado da assinatura (`contract_signed_at`):
 *   - `contract_feegow_em`           anexado (fato do prontuário)
 *   - `contract_feegow_iniciado_em`  envio em curso
 *   - `contract_feegow_erro`         última falha; pode tentar de novo
 *
 * Antes, o anexo era amarrado ao carimbo da assinatura: só a requisição que
 * carimbava anexava, então uma Feegow fora do ar naquele instante perdia o
 * anexo para sempre, sem registro. Agora o evento seguinte da Autentique
 * (`document.finished` depois de `signature.accepted`) tenta de novo, e a
 * tela mostra o erro e oferece o botão.
 *
 * ⚠️ A Feegow não tem delete nem replace de anexo: duplicar é irreversível.
 * Por isso a trava otimista em `contract_feegow_iniciado_em` (só quem a
 * troca envia) e o estado "em dúvida" — envio que começou há mais de
 * `EM_CURSO_MS` e nunca confirmou nem falhou (o processo morreu no meio):
 * o automático NÃO reenvia; o manual só reenvia com confirmação explícita.
 */

const EM_CURSO_MS = 10 * 60_000;

export type AnexoResultado =
  | { status: "anexado"; em: string }
  | { status: "ja_anexado"; em: string }
  | { status: "nao_aplicavel"; motivo: string }
  | { status: "nao_assinado" }
  | { status: "em_andamento" }
  | { status: "em_duvida"; iniciadoEm: string }
  | { status: "erro"; mensagem: string };

type Linha = {
  id: string;
  company_id: string;
  document_id: string | null;
  paciente_id: string | null;
  paciente_nome: string | null;
  contract_signed_at: string | null;
  contract_feegow_em: string | null;
  contract_feegow_iniciado_em: string | null;
  contract_feegow_erro: string | null;
};

/** `paciente_id` da Feegow, ou null para vazio e para o literal "manual". */
export function pacienteDaFeegow(pacienteId: string | null | undefined): string | null {
  const id = (pacienteId ?? "").trim();
  return id && id !== "manual" ? id : null;
}

/**
 * Situação do anexo para a tela, sem tocar em nada.
 * `emDuvida`: começou há mais de 10 min e nunca confirmou nem falhou.
 */
export function situacaoDoAnexo(linha: {
  contract_feegow_em: string | null;
  contract_feegow_iniciado_em: string | null;
  contract_feegow_erro: string | null;
}): { anexadoEm: string | null; erro: string | null; emAndamento: boolean; emDuvida: boolean } {
  const iniciado = linha.contract_feegow_iniciado_em;
  const emCurso = !!iniciado && !linha.contract_feegow_em && !linha.contract_feegow_erro;
  const velho = emCurso && Date.now() - new Date(iniciado!).getTime() >= EM_CURSO_MS;
  return {
    anexadoEm: linha.contract_feegow_em,
    erro: linha.contract_feegow_erro,
    emAndamento: emCurso && !velho,
    emDuvida: velho,
  };
}

export async function anexarContratoAssinadoNaFeegow(args: {
  propostaId: string;
  companyId: string;
  /** O webhook já confirmou na Autentique que todos assinaram. */
  assinaturaConfirmada?: boolean;
  /** Só o botão manual: aceita reenviar um envio "em dúvida". */
  confirmarDuplicata?: boolean;
}): Promise<AnexoResultado> {
  const admin = createAdminClient();

  const result = await admin
    .from("propostas")
    .select(
      "id, company_id, document_id, paciente_id, paciente_nome, contract_signed_at, contract_feegow_em, contract_feegow_iniciado_em, contract_feegow_erro",
    )
    .eq("id", args.propostaId)
    .eq("company_id", args.companyId)
    .maybeSingle();
  const linha = result.data as Linha | null;
  if (!linha) return { status: "nao_aplicavel", motivo: "Orçamento não encontrado" };

  if (linha.contract_feegow_em) {
    return { status: "ja_anexado", em: linha.contract_feegow_em };
  }
  const documentId = linha.document_id;
  if (!documentId) {
    return { status: "nao_aplicavel", motivo: "Contrato ainda não enviado para assinatura" };
  }
  const pacienteId = pacienteDaFeegow(linha.paciente_id);
  if (!pacienteId) {
    return {
      status: "nao_aplicavel",
      motivo: "Paciente digitado ou do CRM não tem prontuário na Feegow",
    };
  }

  const creds = await getCompanyCredentials(args.companyId);
  if (!creds?.feegow_token) {
    return { status: "nao_aplicavel", motivo: "Feegow não configurada para esta empresa" };
  }
  if (!creds.authentique_token) {
    return { status: "nao_aplicavel", motivo: "Autentique não configurada para esta empresa" };
  }

  if (!args.assinaturaConfirmada) {
    const info = await authentique(creds.authentique_token).getDocumentInfo(documentId);
    if (info.status === null) {
      return { status: "erro", mensagem: "Não foi possível consultar a assinatura na Autentique" };
    }
    if (info.status !== "signed") return { status: "nao_assinado" };
    // Contrato assinado antes de o webhook existir: registra a assinatura
    // de passagem, para o painel deixar de depender da consulta ao vivo.
    if (!linha.contract_signed_at) {
      await admin
        .from("propostas")
        .update({ contract_signed_at: info.signedAt ?? new Date().toISOString() } as never)
        .eq("id", linha.id)
        .is("contract_signed_at", null);
    }
  }

  const situacao = situacaoDoAnexo(linha);
  if (situacao.emAndamento) return { status: "em_andamento" };
  if (situacao.emDuvida && !args.confirmarDuplicata) {
    return { status: "em_duvida", iniciadoEm: linha.contract_feegow_iniciado_em! };
  }

  // Trava otimista: só quem troca o valor que LEU envia. Dois eventos da
  // Autentique chegando juntos (ou um clique durante o automático) não
  // anexam duas vezes.
  const agora = new Date().toISOString();
  let trava = admin
    .from("propostas")
    .update({ contract_feegow_iniciado_em: agora, contract_feegow_erro: null } as never)
    .eq("id", linha.id)
    .is("contract_feegow_em", null);
  trava = linha.contract_feegow_iniciado_em
    ? trava.eq("contract_feegow_iniciado_em", linha.contract_feegow_iniciado_em)
    : trava.is("contract_feegow_iniciado_em", null);
  const travou = await trava.select("id");
  if (travou.error) return { status: "erro", mensagem: travou.error.message };
  if (((travou.data ?? []) as unknown[]).length === 0) return { status: "em_andamento" };

  try {
    const signedUrl = await authentique(creds.authentique_token).getSignedFileUrl(documentId);
    if (!signedUrl) throw new Error("A Autentique não devolveu o PDF assinado");
    const pdfRes = await fetch(signedUrl);
    if (!pdfRes.ok) {
      throw new Error(`Falha ao baixar o PDF assinado (HTTP ${pdfRes.status})`);
    }
    const base64 = Buffer.from(await pdfRes.arrayBuffer()).toString("base64");
    await feegow(creds.feegow_token).uploadBase64ToPatient({
      paciente_id: pacienteId,
      base64: `data:application/pdf;base64,${base64}`,
      arquivo_descricao: `Contrato assinado - ${linha.paciente_nome ?? "paciente"}`,
    });
  } catch (err) {
    const mensagem = (err instanceof Error ? err.message : String(err)).slice(0, 500);
    console.error("[feegow-anexo] Falha ao anexar contrato assinado:", {
      propostaId: linha.id,
      documentId,
      mensagem,
    });
    await admin
      .from("propostas")
      .update({ contract_feegow_iniciado_em: null, contract_feegow_erro: mensagem } as never)
      .eq("id", linha.id)
      .eq("contract_feegow_iniciado_em", agora);
    return { status: "erro", mensagem };
  }

  const concluido = new Date().toISOString();
  await admin
    .from("propostas")
    .update({
      contract_feegow_em: concluido,
      contract_feegow_iniciado_em: null,
      contract_feegow_erro: null,
    } as never)
    .eq("id", linha.id);
  return { status: "anexado", em: concluido };
}
