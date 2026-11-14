"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { pontuarBusca } from "@/lib/busca";
import { cn } from "@/lib/utils";

export type OpcaoBusca = {
  id: string;
  nome: string;
  /** Segunda linha da opção (ex.: valor). Não entra na busca. */
  detalhe?: string;
};

/**
 * Seletor com campo de busca no topo, para listas longas: procedimentos da
 * Feegow e protocolos. A busca ignora acento e caixa e aceita as palavras em
 * qualquer ordem (`pontuarBusca`), e quem começa pelo que foi digitado vem
 * primeiro. Teclado: digitar filtra, setas navegam, Enter escolhe.
 */
export function ComboboxBusca({
  opcoes,
  selecionadoId,
  textoSelecionado,
  onSelecionar,
  placeholder,
  placeholderBusca,
  vazio = "Nada encontrado.",
  disabled,
  className,
}: {
  opcoes: OpcaoBusca[];
  /** Opção marcada. `null` para seletor de "adicionar", que volta ao placeholder. */
  selecionadoId: string | null;
  /**
   * Texto do botão quando a escolha não está (mais) na lista, como um
   * procedimento que saiu do catálogo da Feegow depois de gravado.
   */
  textoSelecionado?: string;
  onSelecionar: (id: string) => void;
  placeholder: string;
  placeholderBusca: string;
  vazio?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const rotulo =
    opcoes.find((o) => o.id === selecionadoId)?.nome || textoSelecionado || "";

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={aberto}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className={cn("truncate", !rotulo && "text-muted-foreground")}>
            {rotulo || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command
          // O value de cada item é o id; o nome vai em `keywords`.
          filter={(_valor, busca, palavras) =>
            pontuarBusca((palavras ?? []).join(" "), busca)
          }
        >
          <CommandInput placeholder={placeholderBusca} />
          <CommandList>
            <CommandEmpty>{vazio}</CommandEmpty>
            <CommandGroup>
              {opcoes.map((opcao) => (
                <CommandItem
                  key={opcao.id}
                  value={opcao.id}
                  keywords={[opcao.nome]}
                  onSelect={() => {
                    onSelecionar(opcao.id);
                    setAberto(false);
                  }}
                  className="flex items-center justify-between"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{opcao.nome}</span>
                    {opcao.detalhe && (
                      <span className="text-xs text-foreground/60">
                        {opcao.detalhe}
                      </span>
                    )}
                  </div>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4 shrink-0",
                      selecionadoId === opcao.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
