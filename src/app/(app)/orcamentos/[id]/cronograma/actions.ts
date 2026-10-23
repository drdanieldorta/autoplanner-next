"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { limparAjustes } from "@/lib/prescricao/ajustes";
import { salvarAjustes } from "@/lib/services/prescricoes";
import { prescricaoAjustesSchema } from "@/lib/validations";

const SalvarSchema = z.object({
  proposta_id: z.string().uuid(),
  inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  observacoes: z.string().max(1000).nullable().optional(),
  alergias: z.string().max(500).nullable().optional(),
  // Schema compartilhado com a criação do orçamento DE PROPÓSITO: como
  // `salvarAjustes` faz replace, um campo aceito só lá seria apagado aqui.
  ajustes: prescricaoAjustesSchema,
  alinhar_semana: z.boolean(),
});

export type CronogramaFormState =
  | { ok: true }
  | { ok: false; error: string }
  | null;

/**
 * Salva os ajustes desta folha e regenera o snapshot.
 *
 * NÃO envia nada à Feegow — o envio é ato separado e explícito
 * (`POST /api/prescricoes/enviar`). Regenerar também não incrementa
 * revisão: revisão é um fato do prontuário, não do rascunho.
 *
 * A regeneração do PDF acontece via `POST /api/prescricoes/gerar`, chamado
 * pelo cliente logo depois. Não dá para fazer aqui: gerar PDF exige
 * `maxDuration`, que é config de route segment e não existe em Server Action.
 */
export async function salvarCronograma(
  input: z.infer<typeof SalvarSchema>,
): Promise<CronogramaFormState> {
  const user = await requireUser();
  if (!user.companyId) {
    return { ok: false, error: "Sua conta não está associada a uma empresa." };
  }

  const parsed = SalvarSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    };
  }

  const limpos = limparAjustes(parsed.data.ajustes);

  try {
    await salvarAjustes({
      propostaId: parsed.data.proposta_id,
      companyId: user.companyId,
      ajustes: limpos,
      inicio: parsed.data.inicio,
      observacoes: parsed.data.observacoes ?? null,
      alergias: parsed.data.alergias ?? null,
      alinharSemana: parsed.data.alinhar_semana,
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao salvar",
    };
  }

  revalidatePath(`/orcamentos/${parsed.data.proposta_id}`);
  revalidatePath(`/orcamentos/${parsed.data.proposta_id}/cronograma`);
  return { ok: true };
}
