"use client";

import type { UseFormReturn } from "react-hook-form";
import type { z } from "zod";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { VIA_LABEL, VIAS } from "@/lib/prescricao/enums";
import type { createProtocolSchema } from "@/lib/validations";

type FormValues = z.infer<typeof createProtocolSchema>;

const SEM_VIA = "__sem_via__";

/**
 * Camada clínica de um item do protocolo: via de administração + cuidados.
 *
 * Fica atrás de um botão recolhível no form — quem monta orçamento
 * comercial nunca precisa ver. Ambos os campos são opcionais: todo
 * protocolo já existente tem esses campos nulos, e exigi-los quebraria a
 * edição de qualquer protocolo legado.
 *
 * O que é preenchido aqui alimenta o cronograma de aplicações que a
 * enfermagem recebe. Deliberadamente NÃO há dose, diluente nem velocidade
 * de infusão: a folha não é prescrição e não deve afirmar dose.
 */
export function ProtocolClinicalFields({
  form,
  index,
}: {
  form: UseFormReturn<FormValues>;
  index: number;
}) {
  const via = form.watch(`items.${index}.via`);

  return (
    <div className="md:col-span-12">
      <Separator className="mb-3" />
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-3">
          <Label className="text-xs">Via de administração</Label>
          <Select
            value={via ?? SEM_VIA}
            onValueChange={(v) =>
              form.setValue(
                `items.${index}.via`,
                v === SEM_VIA ? null : (v as (typeof VIAS)[number]),
                { shouldDirty: true },
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Não definida" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SEM_VIA}>Não definida</SelectItem>
              {VIAS.map((v) => (
                <SelectItem key={v} value={v}>
                  {VIA_LABEL[v]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!via && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Sem via definida, o cronograma deduz pelo nome e marca para
              conferência.
            </p>
          )}
        </div>
        <div className="md:col-span-9">
          <Label className="text-xs">Cuidados de enfermagem</Label>
          <Textarea
            rows={2}
            placeholder="Ex: proteger da luz durante a infusão; aplicar após o item anterior"
            {...form.register(`items.${index}.cuidados`)}
          />
        </div>
      </div>
    </div>
  );
}
