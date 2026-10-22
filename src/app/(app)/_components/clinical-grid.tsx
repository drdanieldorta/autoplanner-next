"use client";

import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";

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
import { VIA_LABEL, VIAS, type Via } from "@/lib/prescricao/enums";

import { DuracaoInput } from "./duracao-input";

/**
 * Grade da camada clínica — via, dose, quando começa e observações de cada
 * procedimento. É o que a enfermagem lê na folha de execução.
 *
 * Componente CONTROLADO e sem acoplamento a react-hook-form, porque tem dois
 * donos com estados diferentes: o formulário de protocolo (escreve nos campos
 * do RHF, definindo o MODELO) e o formulário de orçamento (escreve no delta
 * `prescricao_ajustes`, definindo o DESVIO deste paciente). Uma grade só
 * garante que as duas telas ensinem a mesma coisa.
 *
 * É uma grade, não um bloco recolhível por item: preencher a camada clínica é
 * uma passada de cima a baixo, e ver os itens lado a lado é o que torna óbvio
 * qual está sem via — um por vez, escondido atrás de um botão, não torna.
 *
 * Nada aqui é obrigatório. Todo protocolo legado tem estes campos nulos, e
 * exigi-los quebraria a edição deles além de travar "Salvar e enviar
 * contrato", já que a folha é gerada no mesmo fluxo.
 */

const SEM_VIA = "__sem_via__";

export type ClinicalRow = {
  /** Identidade estável da linha. No orçamento é o `ref` do delta. */
  chave: string;
  nome: string;
  via: Via | null;
  dose: string | null;
  inicio_dias: number;
  cuidados: string | null;
  /** Etiqueta curta à direita do nome — ex.: "Protocolo", "Extra". */
  etiqueta?: string;
  /** True quando esta linha difere do que o protocolo propõe. */
  ajustado?: boolean;
};

export type ClinicalPatch = Partial<{
  via: Via | null;
  dose: string | null;
  inicio_dias: number;
  cuidados: string | null;
}>;

export function ClinicalGrid({
  itens,
  inicio,
  onChange,
  onResetar,
  vazio,
  rodape,
}: {
  itens: ClinicalRow[];
  /** yyyy-MM-dd do D0, para resolver "começa em" numa data real. */
  inicio?: string | null;
  onChange: (chave: string, patch: ClinicalPatch) => void;
  /** Quando presente, linhas ajustadas ganham "voltar ao protocolo". */
  onResetar?: (chave: string) => void;
  vazio?: ReactNode;
  rodape?: ReactNode;
}) {
  if (itens.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        {vazio ?? "Adicione procedimentos acima para preencher a camada clínica."}
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
        const nome = item.nome?.trim();
        return (
          <div
            key={item.chave}
            className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-3 md:items-start border rounded-lg p-3 md:border-0 md:rounded-none md:p-1"
          >
            <div className="md:col-span-3 min-w-0 md:pt-1.5">
              <span className="md:hidden text-xs text-muted-foreground block mb-1">
                Procedimento
              </span>
              <div className="flex items-center gap-1.5 min-w-0">
                <p
                  className="text-sm font-medium truncate"
                  title={nome || undefined}
                >
                  {nome || (
                    <span className="text-muted-foreground italic">
                      Procedimento {index + 1}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {/* Etiqueta na linha de baixo, não ao lado do nome: com
                    vários protocolos ela é o NOME do protocolo, e ao lado
                    do nome (shrink-0) tomava a célula inteira. */}
                {item.etiqueta && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-normal max-w-full min-w-0"
                    title={item.etiqueta}
                  >
                    <span className="truncate">{item.etiqueta}</span>
                  </Badge>
                )}
                {!item.via && (
                  <Badge variant="outline" className="text-[10px] font-normal">
                    sem via
                  </Badge>
                )}
                {item.ajustado && (
                  <Badge className="text-[10px] bg-accent-gold text-black hover:bg-accent-gold">
                    ajustado
                  </Badge>
                )}
                {item.ajustado && onResetar && (
                  <button
                    type="button"
                    onClick={() => onResetar(item.chave)}
                    className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Voltar ao protocolo
                  </button>
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <Label className="md:hidden text-xs">Via de administração</Label>
              <Select
                value={item.via ?? SEM_VIA}
                onValueChange={(v) =>
                  onChange(item.chave, {
                    via: v === SEM_VIA ? null : (v as Via),
                  })
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
                value={item.dose ?? ""}
                onChange={(e) =>
                  onChange(item.chave, { dose: e.target.value })
                }
              />
            </div>

            <div className="md:col-span-2">
              <Label className="md:hidden text-xs">
                Começa quanto tempo depois do início?
              </Label>
              <DuracaoInput
                value={item.inicio_dias}
                inicio={inicio}
                onChange={(dias) => onChange(item.chave, { inicio_dias: dias })}
              />
            </div>

            <div className="md:col-span-3">
              <Label className="md:hidden text-xs">
                Observações para a enfermagem
              </Label>
              <Input
                className="h-9"
                placeholder="Ex: proteger da luz; aplicar após o item anterior"
                value={item.cuidados ?? ""}
                onChange={(e) =>
                  onChange(item.chave, { cuidados: e.target.value })
                }
              />
            </div>
          </div>
        );
      })}

      {rodape}
    </div>
  );
}
