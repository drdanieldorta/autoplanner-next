"use client";

import { ArrowDown, ArrowUp, FileText, Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

/**
 * Seleção dos documentos que o paciente vai assinar.
 *
 * Usada no protocolo (define o PADRÃO do plano) e no orçamento (ajusta o
 * padrão para este paciente). Mesmo componente porque é a mesma decisão
 * tomada em dois momentos — protocolo propõe, orçamento dispõe.
 *
 * Tudo vira UM PDF e UMA assinatura. Não é escolha de arquitetura: o
 * `createDocument` da Authentique recebe `$file: Upload!`, singular. Vale
 * dizer isso na tela, senão a lista de checkboxes sugere N assinaturas.
 *
 * O TCLE padrão do sistema é um item da lista, mas não é linha em
 * `contracts` — é código. Por isso vive num booleano à parte e entra
 * sempre por último, o que a tela declara em vez de esconder.
 */

export type ContractOption = { id: string; name: string };

export function DocumentosSelector({
  contracts,
  selecionados,
  incluirTcle,
  onChangeSelecionados,
  onChangeIncluirTcle,
  idPrefix = "doc",
}: {
  contracts: ContractOption[];
  /** Ids dos modelos, NA ORDEM em que serão impressos. */
  selecionados: string[];
  incluirTcle: boolean;
  onChangeSelecionados: (ids: string[]) => void;
  onChangeIncluirTcle: (v: boolean) => void;
  /** Desambigua os `htmlFor` quando há mais de um seletor na página. */
  idPrefix?: string;
}) {
  const total = selecionados.length + (incluirTcle ? 1 : 0);

  const alternar = (id: string) =>
    onChangeSelecionados(
      selecionados.includes(id)
        ? selecionados.filter((x) => x !== id)
        : [...selecionados, id],
    );

  const mover = (id: string, delta: number) => {
    const i = selecionados.indexOf(id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= selecionados.length) return;
    const next = [...selecionados];
    [next[i], next[j]] = [next[j], next[i]];
    onChangeSelecionados(next);
  };

  // Marcados primeiro, na ordem de impressão; depois o resto, alfabético.
  const marcados = selecionados
    .map((id) => contracts.find((c) => c.id === id))
    .filter((c): c is ContractOption => Boolean(c));
  const naoMarcados = contracts.filter((c) => !selecionados.includes(c.id));

  return (
    <div className="space-y-3">
      {contracts.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhum modelo de contrato cadastrado. Você ainda pode usar o
          contrato padrão do sistema abaixo.
        </p>
      )}

      {marcados.length > 0 && (
        <div className="space-y-1.5">
          {marcados.map((c, index) => (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded-lg border bg-muted/30 p-2.5"
            >
              <Checkbox
                id={`${idPrefix}-${c.id}`}
                checked
                onCheckedChange={() => alternar(c.id)}
              />
              <span className="text-xs font-mono text-muted-foreground w-4 shrink-0">
                {index + 1}
              </span>
              <Label
                htmlFor={`${idPrefix}-${c.id}`}
                className="flex-1 text-sm font-normal cursor-pointer truncate"
              >
                {c.name}
              </Label>
              <div className="flex gap-0.5 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={index === 0}
                  onClick={() => mover(c.id, -1)}
                  aria-label={`Mover ${c.name} para cima`}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={index === marcados.length - 1}
                  onClick={() => mover(c.id, 1)}
                  aria-label={`Mover ${c.name} para baixo`}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {naoMarcados.length > 0 && (
        <div className="space-y-1.5">
          {naoMarcados.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-2.5">
              <Checkbox
                id={`${idPrefix}-${c.id}`}
                checked={false}
                onCheckedChange={() => alternar(c.id)}
              />
              <Label
                htmlFor={`${idPrefix}-${c.id}`}
                className="flex-1 text-sm font-normal cursor-pointer truncate text-muted-foreground"
              >
                {c.name}
              </Label>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 rounded-lg border border-dashed p-2.5">
        <Checkbox
          id={`${idPrefix}-tcle`}
          checked={incluirTcle}
          onCheckedChange={(v) => onChangeIncluirTcle(v === true)}
        />
        <Label
          htmlFor={`${idPrefix}-tcle`}
          className="flex-1 text-sm font-normal cursor-pointer"
        >
          Contrato padrão do sistema
          <span className="block text-xs text-muted-foreground font-normal">
            TCLE de prestação de serviços, com a tabela de procedimentos, os
            valores e os termos de consentimento. Entra sempre por último.
          </span>
        </Label>
        {incluirTcle && (
          <Badge variant="secondary" className="text-[10px] shrink-0">
            último
          </Badge>
        )}
      </div>

      <p className="text-xs text-muted-foreground flex items-start gap-1.5">
        {total === 0 ? (
          <>
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-destructive" />
            <span className="text-destructive">
              Nenhum documento selecionado — o envio do contrato vai falhar.
            </span>
          </>
        ) : (
          <>
            <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              {total === 1
                ? "1 documento"
                : `${total} documentos, nesta ordem,`}{" "}
              {total === 1 ? "em um PDF" : "num PDF só"} — o paciente assina{" "}
              <strong>uma vez</strong> e o prontuário recebe{" "}
              <strong>um anexo</strong>.
            </span>
          </>
        )}
      </p>
    </div>
  );
}
