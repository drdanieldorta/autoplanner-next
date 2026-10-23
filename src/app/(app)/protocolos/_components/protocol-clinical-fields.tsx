"use client";

import type { UseFormReturn } from "react-hook-form";
import type { z } from "zod";
import { Syringe } from "lucide-react";

import { ClinicalGrid } from "@/app/(app)/_components/clinical-grid";
import type { Via } from "@/lib/prescricao/enums";
import type { createProtocolSchema } from "@/lib/validations";

type FormValues = z.infer<typeof createProtocolSchema>;

/**
 * Camada clínica do PROTOCOLO — o modelo, o que vale para todo paciente.
 *
 * Envoltório fino de `<ClinicalGrid>`: traduz as linhas da grade para os
 * campos do react-hook-form. O desvio de um paciente específico usa a mesma
 * grade no formulário de orçamento, escrevendo no delta em vez de aqui.
 *
 * Não há "voltar ao protocolo" nesta tela: aqui não existe o que reverter —
 * este É o protocolo.
 */
export function ProtocolClinicalGrid({
  form,
  itens,
}: {
  form: UseFormReturn<FormValues>;
  itens: FormValues["items"];
}) {
  return (
    <ClinicalGrid
      itens={itens.map((item, index) => ({
        chave: String(index),
        nome: item.procedure_name ?? "",
        via: (item.via as Via | null) ?? null,
        dose: item.dose ?? null,
        inicio_dias: item.inicio_dias ?? 0,
        cuidados: item.cuidados ?? null,
      }))}
      // Orçamento novo nasce com o dia de atendimento ligado: o hint mostra
      // o D+ em que o item de fato cai.
      alinharSemana
      onChange={(chave, patch) => {
        const index = Number(chave);
        for (const [campo, valor] of Object.entries(patch)) {
          form.setValue(
            `items.${index}.${campo as keyof typeof patch}`,
            valor as never,
            { shouldDirty: true },
          );
        }
      }}
      rodape={
        <p className="text-xs text-muted-foreground flex items-start gap-1.5 pt-1">
          <Syringe className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            Tudo opcional. <strong>Começa em</strong> conta a partir da data de
            início do tratamento, definida em cada orçamento — e cada orçamento
            pode ajustar estes campos para o paciente dele sem alterar o
            protocolo. Item sem via faz o cronograma deduzir pelo nome e marcar
            para conferência. No cronograma, cada data cai no mesmo dia da
            semana do início (até 3 dias antes ou depois da conta exata).
          </span>
        </p>
      }
    />
  );
}
