"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { OrcamentoPatientOption } from "@/lib/services/orcamento-form-data";

type Props = {
  /** `/api/feegow/pacientes` ou `/api/crm/pacientes` — ambos devolvem `{ items, hasMore }`. */
  endpoint: string;
  /** Primeira página, vinda do servidor ao abrir o formulário. */
  initialItems: OrcamentoPatientOption[];
  initialHasMore: boolean;
  selected: OrcamentoPatientOption | null;
  onSelect: (patient: OrcamentoPatientOption) => void;
  /** Texto do botão sem ninguém escolhido. */
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  /** Linha secundária de cada resultado e do botão. */
  subtitle: (patient: OrcamentoPatientOption) => string;
  /** Item fixo no fim da lista (ex.: "Preencher manualmente"). */
  manual?: { label: string; onSelect: () => void };
  className?: string;
};

/**
 * Dropdown de paciente com busca NO SERVIDOR, conforme digita.
 *
 * As duas origens são grandes demais para filtrar no navegador (milhares de
 * contatos no CRM, a lista completa da Feegow), então o cmdk não filtra
 * (`shouldFilter={false}`): quem filtra é o endpoint, com debounce de
 * 350 ms, e a resposta de uma busca antiga em voo é descartada.
 */
export function PatientSearchCombobox({
  endpoint,
  initialItems,
  initialHasMore,
  selected,
  onSelect,
  placeholder,
  searchPlaceholder,
  emptyText,
  subtitle,
  manual,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      abort.current?.abort();
    },
    [],
  );

  const search = (q: string) => {
    setQuery(q);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      abort.current?.abort();
      const ctrl = new AbortController();
      abort.current = ctrl;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${endpoint}?q=${encodeURIComponent(q.trim())}`,
          { signal: ctrl.signal },
        );
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(err.error ?? "Falha ao buscar pacientes");
        }
        const data = (await res.json()) as {
          items: OrcamentoPatientOption[];
          hasMore: boolean;
        };
        setResults(data.items);
        setHasMore(data.hasMore);
      } catch (err) {
        if (ctrl.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Falha ao buscar pacientes");
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 350);
  };

  const choose = (patient: OrcamentoPatientOption) => {
    onSelect(patient);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal h-auto py-2",
            className,
          )}
        >
          {selected ? (
            <div className="flex flex-col items-start text-left min-w-0">
              <span className="truncate max-w-full">{selected.name}</span>
              <span className="text-xs text-muted-foreground truncate max-w-full">
                {subtitle(selected)}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] min-w-[18rem] p-0 shadow-lg"
        align="start"
      >
        {/* O filtro é do servidor. Se o cmdk filtrasse de novo, esconderia
            resultados que casaram por e-mail/telefone e o item manual. */}
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={search}
          />
          <CommandList>
            {error ? (
              <p className="p-3 text-sm text-destructive">{error}</p>
            ) : loading ? (
              <p className="p-3 text-sm text-muted-foreground">Buscando...</p>
            ) : results.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">
                {query.trim() || !hasMore ? emptyText : "Digite para buscar."}
              </p>
            ) : null}
            {results.length > 0 && !loading && !error && (
              <CommandGroup>
                {results.map((patient) => (
                  <CommandItem
                    key={patient.id}
                    value={patient.id}
                    onSelect={() => choose(patient)}
                    className="flex items-center justify-between gap-2 py-2"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium truncate">{patient.name}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {subtitle(patient)}
                      </span>
                    </div>
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        selected?.id === patient.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {hasMore && results.length > 0 && !loading && !error && (
              <p className="px-3 pb-2 text-xs text-muted-foreground">
                Há mais resultados. Digite para refinar.
              </p>
            )}
            {manual && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    value="__manual__"
                    onSelect={() => {
                      manual.onSelect();
                      setOpen(false);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {manual.label}
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
