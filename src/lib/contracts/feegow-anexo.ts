import "server-only";

import { authentique } from "@/lib/integrations/authentique";
import { getCompanyCredentials } from "@/lib/integrations/credentials";
import { feegow, FeegowError } from "@/lib/integrations/feegow";
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
 * Por isso:
 *   - **Tudo preso ao DOCUMENTO.** Leitura, trava e gravações filtram por
 *     `document_id`. Reenviar o contrato troca o documento e zera o estado;
 *     sem esse filtro, um reenvio no meio do envio fazia subir o contrato
 *     novo (não assinado) como "Contrato assinado", ou marcava o novo como
 *     já anexado e o assinado nunca chegava ao prontuário.
 *   - **Trava otimista** em `contract_feegow_iniciado_em`: só quem troca o
 *     valor que leu envia.
 *   - **"Em dúvida"** quando não dá para saber se o arquivo chegou: o envio
 *     começou há mais de `EM_CURSO_MS` e nunca concluiu (processo morto no
 *     meio), ou o POST à Feegow falhou de um jeito que não exclui que ela
 *     tenha gravado (rede caiu, 5xx). O automático NÃO reenvia; o manual só
 *     com confirmação explícita.
 *   - **Sem registro nenhum** (contrato assinado antes deste controle, quando
 *     o n8n pode ter anexado): o automático envia — é o caso normal de quem
 *     acabou de assinar —, mas o botão manual exige a mesma confirmação.
 */

const EM_CURSO_MS = 10 * 60_000;

export type AnexoResultado =
  | { status: "anexado"; em: string }
  | { status: "ja_anexado"; em: string }
  | { status: "nao_aplicavel"; motivo: string }
  | { status: "nao_assinado" }
  | { status: "em_andamento" }
  | { status: "em_duvida"; iniciadoEm: string }
  /** Manual, sem nenhum registro de envio: pode já estar lá (n8n). */
  | { status: "sem_registro" }
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
 *
 *   anexado     `contract_feegow_em`
 *   emAndamento trava recente, sem erro
 *   emDuvida    trava + erro (falha ambígua), ou trava velha sem conclusão
 *   erro        sem trava, com erro: falha CERTA, pode tentar de novo
 *   semRegistro nada gravado (assinado antes deste controle, ou nunca tentou)
 */
export function situacaoDoAnexo(linha: {
  contract_feegow_em: string | null;
  contract_feegow_iniciado_em: string | null;
  contract_feegow_erro: string | null;
}): {
  anexadoEm: string | null;
  erro: string | null;
  emAndamento: boolean;
  emDuvida: boolean;
  semRegistro: boolean;
} {
  const em = linha.contract_feegow_em;
  const iniciado = em ? null : linha.contract_feegow_iniciado_em;
  const erro = em ? null : linha.contract_feegow_erro;
  const velho = !!iniciado && Date.now() - new Date(iniciado).getTime() >= EM_CURSO_MS;
  return {
    anexadoEm: em,
    erro,
    emAndamento: !!iniciado && !erro && !velho,
    emDuvida: !!iniciado && (!!erro || velho),
    semRegistro: !em && !iniciado && !erro,
  };
}

export async function anexarContratoAssinadoNaFeegow(args: {
  propostaId: string;
  companyId: string;
  /**
   * Webhook: o documento que ELE confirmou na Autentique como assinado.
   * Se o orçamento já aponta para outro (contrato reenviado no meio do
   * caminho), nada é enviado.
   */
  documentoConfirmado?: string;
  /** Só o botão manual: aceita enviar com "em dúvida" ou "sem registro". */
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

  const documentId = linha.document_id;
  if (!documentId) {
    return { status: "nao_aplicavel", motivo: "Contrato ainda não enviado para assinatura" };
  }
  if (args.documentoConfirmado && args.documentoConfirmado !== documentId) {
    return { status: "nao_aplicavel", motivo: "O contrato foi reenviado" };
  }
  if (linha.contract_feegow_em) {
    return { status: "ja_anexado", em: linha.contract_feegow_em };
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

  if (!args.documentoConfirmado) {
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
        .eq("document_id", documentId)
        .is("contract_signed_at", null);
    }
  }

  const situacao = situacaoDoAnexo(linha);
  if (situacao.emAndamento) return { status: "em_andamento" };
  if (situacao.emDuvida && !args.confirmarDuplicata) {
    return { status: "em_duvida", iniciadoEm: linha.contract_feegow_iniciado_em! };
  }
  // Manual sem nada registrado: o n8n pode ter anexado este contrato antes
  // deste controle existir. O automático (webhook de quem acabou de
  // assinar) segue direto.
  if (situacao.semRegistro && !args.documentoConfirmado && !args.confirmarDuplicata) {
    return { status: "sem_registro" };
  }

  // Trava otimista: só quem troca o valor que LEU envia. Dois eventos da
  // Autentique chegando juntos (ou um clique durante o automático) não
  // anexam duas vezes.
  const agora = new Date().toISOString();
  let trava = admin
    .from("propostas")
    .update({ contract_feegow_iniciado_em: agora, contract_feegow_erro: null } as never)
    .eq("id", linha.id)
    .eq("document_id", documentId)
    .is("contract_feegow_em", null);
  trava = linha.contract_feegow_iniciado_em
    ? trava.eq("contract_feegow_iniciado_em", linha.contract_feegow_iniciado_em)
    : trava.is("contract_feegow_iniciado_em", null);
  const travou = await trava.select("id");
  if (travou.error) return { status: "erro", mensagem: travou.error.message };
  if (((travou.data ?? []) as unknown[]).length === 0) return { status: "em_andamento" };

  // Até o POST à Feegow sair, falhar é certeza de que nada foi gravado.
  // Depois, só a recusa explícita da Feegow (envelope `success: false`, ou
  // 4xx) é certeza; rede caindo ou 5xx não excluem que ela tenha gravado.
  let postEnviado = false;
  try {
    const signedUrl = await authentique(creds.authentique_token).getSignedFileUrl(documentId);
    if (!signedUrl) throw new Error("A Autentique não devolveu o PDF assinado");
    const pdfRes = await fetch(signedUrl);
    if (!pdfRes.ok) {
      throw new Error(`Falha ao baixar o PDF assinado (HTTP ${pdfRes.status})`);
    }
    const base64 = Buffer.from(await pdfRes.arrayBuffer()).toString("base64");
    postEnviado = true;
    await feegow(creds.feegow_token).uploadBase64ToPatient({
      paciente_id: pacienteId,
      base64: `data:application/pdf;base64,${base64}`,
      arquivo_descricao: `Contrato assinado - ${linha.paciente_nome ?? "paciente"}`,
    });
  } catch (err) {
    const mensagem = (err instanceof Error ? err.message : String(err)).slice(0, 480);
    const recusado =
      !postEnviado ||
      (err instanceof FeegowError &&
        (err.status === 200 || (err.status >= 400 && err.status < 500)));
    console.error("[feegow-anexo] Falha ao anexar contrato assinado:", {
      propostaId: linha.id,
      documentId,
      recusado,
      mensagem,
    });
    // Falha certa: libera a trava (pode tentar de novo). Ambígua: mantém a
    // trava e grava o erro, o que a deixa "em dúvida".
    await admin
      .from("propostas")
      .update(
        (recusado
          ? { contract_feegow_iniciado_em: null, contract_feegow_erro: mensagem }
          : { contract_feegow_erro: `Envio não confirmado: ${mensagem}` }) as never,
      )
      .eq("id", linha.id)
      .eq("document_id", documentId)
      .eq("contract_feegow_iniciado_em", agora);
    return recusado
      ? { status: "erro", mensagem }
      : { status: "em_duvida", iniciadoEm: agora };
  }

  // Só grava "anexado" no orçamento que ainda é deste documento e desta
  // trava: um reenvio no meio do upload não pode marcar o contrato NOVO.
  const concluido = new Date().toISOString();
  await admin
    .from("propostas")
    .update({
      contract_feegow_em: concluido,
      contract_feegow_iniciado_em: null,
      contract_feegow_erro: null,
    } as never)
    .eq("id", linha.id)
    .eq("document_id", documentId)
    .eq("contract_feegow_iniciado_em", agora);
  return { status: "anexado", em: concluido };
}
