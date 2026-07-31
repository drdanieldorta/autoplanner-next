import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export const CONTRACTS_BUCKET = "contracts";

/**
 * Guarda o PDF exatamente como foi enviado para a Authentique.
 *
 * Bucket privado sem policies: só o service_role alcança. Quem serve o
 * arquivo é o Route Handler, depois de validar a empresa.
 *
 * Falha aqui NÃO derruba o envio — o contrato já foi para a Authentique
 * e o paciente já recebeu o link. Perder o arquivo do acervo é
 * recuperável (regeramos sob demanda); devolver erro faria o usuário
 * reenviar e criar um documento duplicado.
 */
export async function storeContractPdf(args: {
  companyId: string;
  propostaId: string;
  pdf: Buffer;
}): Promise<string | null> {
  if (args.pdf.byteLength === 0) return null;
  try {
    const path = `${args.companyId}/${args.propostaId}/contrato-${Date.now()}.pdf`;
    const admin = createAdminClient();
    const upload = await admin.storage
      .from(CONTRACTS_BUCKET)
      .upload(path, args.pdf, {
        contentType: "application/pdf",
        upsert: false,
      });
    if (upload.error) return null;
    return path;
  } catch {
    return null;
  }
}

/** Lê o PDF arquivado. null quando não existe mais no bucket. */
export async function readContractPdf(path: string): Promise<Buffer | null> {
  try {
    const admin = createAdminClient();
    const download = await admin.storage.from(CONTRACTS_BUCKET).download(path);
    if (download.error || !download.data) return null;
    const buf = Buffer.from(await download.data.arrayBuffer());
    return buf.byteLength > 0 ? buf : null;
  } catch {
    return null;
  }
}
