"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { VIAS } from "@/lib/prescricao/enums";
import type { PrescricaoAjustes } from "@/lib/prescricao/types";
import { salvarAjustes } from "@/lib/services/prescricoes";

const AjusteItemSchema = z.object({
  via: z.enum(VIAS).nullable().optional(),
  cuidados: z.string().max(500).nullable().optional(),
  /** índice original da sessão (1-based) → offset em dias a partir do D0. */
  sessoes: z.record(z.string(), z.number().int().min(0).max(3650)).optional(),
});

const SalvarSchema = z.object({
  proposta_id: z.string().uuid(),
  inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  observacoes: z.string().max(1000).nullable().optional(),
  alergias: z.string().max(500).nullable().optional(),
  ajustes: z.record(z.string(), AjusteItemSchema),
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

  // Descarta entradas vazias: um ajuste que não ajusta nada só polui o delta
  // e faria o hash mudar sem o documento mudar.
  const limpos: PrescricaoAjustes = {};
  for (const [ref, aj] of Object.entries(parsed.data.ajustes)) {
    const sessoes = aj.sessoes ?? {};
    const temSessoes = Object.keys(sessoes).length > 0;
    const temVia = Boolean(aj.via);
    const temCuidados = Boolean((aj.cuidados ?? "").trim());
    if (!temSessoes && !temVia && !temCuidados) continue;
    limpos[ref] = {
      ...(temVia ? { via: aj.via } : {}),
      ...(temCuidados ? { cuidados: (aj.cuidados ?? "").trim() } : {}),
      ...(temSessoes ? { sessoes } : {}),
    };
  }

  try {
    await salvarAjustes({
      propostaId: parsed.data.proposta_id,
      companyId: user.companyId,
      ajustes: limpos,
      inicio: parsed.data.inicio,
      observacoes: parsed.data.observacoes ?? null,
      alergias: parsed.data.alergias ?? null,
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
