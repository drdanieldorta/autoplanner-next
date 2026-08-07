"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addDiasISO } from "@/lib/prescricao/project";
import { cn } from "@/lib/utils";

/**
 * "Começa quantos dias / semanas / meses depois do início do tratamento?"
 *
 * O valor gravado é SEMPRE em dias — o cronograma é offset a partir do D0,
 * não calendário. "Meses" é conveniência de digitação, e por isso mês vale
 * 30 dias fixos e o componente DIZ isso na tela, resolvendo a data real. Um
 * seletor que aceita "2 meses" e silenciosamente agenda 60 dias seria uma
 * armadilha; mostrando "60 dias · 06/10/2026" não é.
 *
 * A unidade não é persistida. Ela é derivada do valor na montagem (a maior
 * que divide exato) e depois respeita o que a pessoa escolheu enquanto o
 * formulário está aberto — persistir a unidade criaria uma segunda fonte de
 * verdade para o mesmo número.
 */

export type Unidade = "dias" | "semanas" | "meses";

const FATOR: Record<Unidade, number> = { dias: 1, semanas: 7, meses: 30 };

const LABEL: Record<Unidade, [string, string]> = {
  dias: ["dia", "dias"],
  semanas: ["semana", "semanas"],
  meses: ["mês", "meses"],
};

/** Maior unidade que divide o valor exato. 60 → meses, 14 → semanas, 10 → dias. */
export function derivarUnidade(dias: number): Unidade {
  if (dias > 0 && dias % FATOR.meses === 0) return "meses";
  if (dias > 0 && dias % FATOR.semanas === 0) return "semanas";
  return "dias";
}

function brData(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split("-");
  return d && m && y ? `${d}/${m}/${y}` : yyyyMmDd;
}

export function DuracaoInput({
  value,
  onChange,
  inicio,
  id,
  className,
}: {
  /** Offset em dias a partir do D0. */
  value: number;
  onChange: (dias: number) => void;
  /** yyyy-MM-dd do D0, quando conhecido — resolve o offset para data real. */
  inicio?: string | null;
  id?: string;
  className?: string;
}) {
  const dias = Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;

  const [escolhida, setEscolhida] = useState<Unidade>(() =>
    derivarUnidade(dias),
  );

  // Se o valor mudou por fora (reset para o protocolo, troca de protocolo) e
  // não é múltiplo da unidade escolhida, exibir "1,5 semanas" seria mentira —
  // cai para a unidade que representa o número exato.
  const unidade = dias % FATOR[escolhida] === 0 ? escolhida : derivarUnidade(dias);
  const numero = dias / FATOR[unidade];

  const aplicar = (n: number, u: Unidade) =>
    onChange(Math.max(0, Math.trunc(n)) * FATOR[u]);

  return (
    <div className={className}>
      <div className="flex gap-1.5">
        <Input
          id={id}
          type="number"
          min={0}
          className="h-9 w-16 shrink-0"
          value={numero}
          onChange={(e) => aplicar(Number(e.target.value), unidade)}
        />
        <Select
          value={unidade}
          onValueChange={(u) => {
            setEscolhida(u as Unidade);
            aplicar(numero, u as Unidade);
          }}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(FATOR) as Unidade[]).map((u) => (
              <SelectItem key={u} value={u}>
                {LABEL[u][numero === 1 ? 0 : 1]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p
        className={cn(
          "text-[11px] mt-0.5",
          dias === 0 ? "text-muted-foreground" : "text-foreground/70",
        )}
      >
        {dias === 0 ? (
          "junto com a 1ª sessão"
        ) : (
          <>
            {/* O "= N dias" só aparece quando a unidade escondeu o número
                real — em "10 dias" repetir seria ruído. */}
            {unidade !== "dias" && <>{dias} dias · </>}
            {inicio ? brData(addDiasISO(inicio, dias)) : `D+${dias}`}
          </>
        )}
      </p>
    </div>
  );
}
