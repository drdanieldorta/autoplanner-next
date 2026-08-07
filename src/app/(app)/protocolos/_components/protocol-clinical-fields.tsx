"use client";

import type { UseFormReturn } from "react-hook-form";
import type { z } from "zod";
import { Syringe } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VIA_LABEL, VIAS } from "@/lib/prescricao/enums";
import type { createProtocolSchema } from "@/lib/validations";

type FormValues = z.infer<typeof createProtocolSchema>;

const SEM_VIA = "__sem_via__";

/**
 * Grade da camada clínica do protocolo — via, dose, início e observações
 * de cada procedimento, o que a enfermagem lê na folha de execução.
 *
 * Substituiu um bloco recolhível por item. O motivo é a tarefa, não a
 * estética: preencher a camada clínica de um protocolo é uma passada de
 * cima a baixo, não seis expansões seguidas de seis colapsos. E ver os
 * itens lado a lado é o que torna óbvio qual está sem via — um por vez,
 * escondido atrás de um botão, não torna.
 *
 * Nada aqui é obrigatório: todo protocolo legado tem estes campos nulos e
 * exigi-los quebraria a edição deles, além de travar o envio do contrato,
 * já que a folha é gerada no mesmo fluxo.
 */
export function ProtocolClinicalGrid({
  form,
  itens,
}: {
  form: UseFormReturn<FormValues>;
  itens: FormValues["items"];
}) {
  if (itens.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        Adicione procedimentos acima para preencher a camada clínica.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Cabeçalho só no desktop — no mobile cada item vira um cartão. */}
      <div className="hidden md:grid md:grid-cols-12 gap-3 px-1 pb-1 border-b">
        <span className="md:col-span-3 text-xs font-medium text-muted-foreground">
          Procedimento
        </span>
        <span className="md:col-span-2 text-xs font-medium text-muted-foreground">
          Via
        </span>
        <span className="md:col-span-2 text-xs font-medium text-muted-foreground">
          Dose
        </span>
        <span className="md:col-span-2 text-xs font-medium text-muted-foreground">
          Começa em
        </span>
        <span className="md:col-span-3 text-xs font-medium text-muted-foreground">
          Observações para a enfermagem
        </span>
      </div>

      {itens.map((item, index) => {
        const nome = item.procedure_name?.trim();
        return (
          <div
            key={index}
            className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-3 md:items-center border rounded-lg p-3 md:border-0 md:rounded-none md:p-1"
          >
            <div className="md:col-span-3 min-w-0">
              <span className="md:hidden text-xs text-muted-foreground block mb-1">
                Procedimento
              </span>
              <p className="text-sm font-medium truncate" title={nome || undefined}>
                {nome || (
                  <span className="text-muted-foreground italic">
                    Procedimento {index + 1}
                  </span>
                )}
              </p>
              {!item.via && (
                <Badge variant="outline" className="mt-1 text-[10px] font-normal">
                  sem via
                </Badge>
              )}
            </div>

            <div className="md:col-span-2">
              <Label className="md:hidden text-xs">Via de administração</Label>
              <Select
                value={item.via ?? SEM_VIA}
                onValueChange={(v) =>
                  form.setValue(
                    `items.${index}.via`,
                    v === SEM_VIA ? null : (v as (typeof VIAS)[number]),
                    { shouldDirty: true },
                  )
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="—" />
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
            </div>

            <div className="md:col-span-2">
              <Label className="md:hidden text-xs">Dose</Label>
              <Input
                className="h-9"
                placeholder="2,5 mg"
                {...form.register(`items.${index}.dose`)}
              />
            </div>

            <div className="md:col-span-2">
              <Label className="md:hidden text-xs">
                Começa quantos dias depois do início?
              </Label>
              {/* O "D+" fica DENTRO do controle: um número solto numa coluna
                  estreita não se lê como "dia do tratamento" — foi assim que
                  este campo passou despercebido na primeira versão. */}
              <div className="flex items-center h-9 rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring">
                <span className="pl-2.5 pr-1 text-sm font-mono text-muted-foreground select-none">
                  D+
                </span>
                <Input
                  type="number"
                  min={0}
                  className="h-full border-0 shadow-none focus-visible:ring-0 px-0 w-full"
                  {...form.register(`items.${index}.inicio_dias`, {
                    valueAsNumber: true,
                  })}
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {!item.inicio_dias
                  ? "junto com a 1ª sessão"
                  : `${item.inicio_dias} dias depois`}
              </p>
            </div>

            <div className="md:col-span-3">
              <Label className="md:hidden text-xs">
                Observações para a enfermagem
              </Label>
              <Input
                className="h-9"
                placeholder="Ex: proteger da luz; aplicar após o item anterior"
                {...form.register(`items.${index}.cuidados`)}
              />
            </div>
          </div>
        );
      })}

      <p className="text-xs text-muted-foreground flex items-start gap-1.5 pt-1">
        <Syringe className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>
          Tudo opcional. <strong>Começa em</strong> conta a partir da data de
          início do tratamento, definida em cada orçamento: <strong>D+0</strong>{" "}
          entra na primeira sessão, <strong>D+14</strong> só duas semanas
          depois. Item sem via faz o cronograma deduzir pelo nome e marcar
          para conferência.
        </span>
      </p>
    </div>
  );
}
