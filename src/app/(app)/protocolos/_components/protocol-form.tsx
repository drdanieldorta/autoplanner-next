"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Trash2,
  Save,
  Check,
  ChevronsUpDown,
  AlertCircle,
  Syringe,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { formatCurrency } from "@/lib/currency";
import { parseCurrencyToCents, formatCurrencyInput } from "@/lib/masks";
import { cn } from "@/lib/utils";
import { createProtocolSchema } from "@/lib/validations";
import type { ProtocolProcedureOption } from "@/lib/services/protocol-form-data";
import { createProtocol, updateProtocol } from "../actions";
import { ProtocolClinicalFields } from "./protocol-clinical-fields";

type FormValues = z.infer<typeof createProtocolSchema>;

type Props = {
  mode: "create" | "edit";
  initialId?: string;
  initialValues: FormValues;
  /** True quando a empresa tem token Feegow em `api_credentials`. */
  hasFeegow: boolean;
  /** Catálogo da Feegow — vazio no modo manual. */
  procedures: ProtocolProcedureOption[];
  /** Preenchido quando a empresa tem token mas a chamada falhou. */
  feegowError: string | null;
};

export function ProtocolForm({
  mode,
  initialId,
  initialValues,
  hasFeegow,
  procedures,
  feegowError,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [valueInputs, setValueInputs] = useState<string[]>(
    initialValues.items.map((item) => formatCurrency(item.value_cents)),
  );
  // Índice da linha com o combobox aberto (só um por vez).
  const [openPicker, setOpenPicker] = useState<number | null>(null);

  // Com Feegow configurada, o procedimento vem obrigatoriamente do catálogo.
  // Se o catálogo veio vazio (API fora do ar), liberamos o modo manual para
  // não travar o cadastro de protocolos por causa de uma indisponibilidade.
  const useFeegowPicker = hasFeegow && procedures.length > 0;

  // Blocos clínicos abertos. Já vêm abertos os itens que têm dado clínico,
  // para o usuário ver o que existe sem ter que caçar.
  const [clinicosAbertos, setClinicosAbertos] = useState<Set<number>>(
    () =>
      new Set(
        initialValues.items
          .map((item, i) => (item.via || item.cuidados ? i : -1))
          .filter((i) => i >= 0),
      ),
  );

  const toggleClinico = (index: number) =>
    setClinicosAbertos((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  const form = useForm<FormValues>({
    resolver: zodResolver(createProtocolSchema),
    defaultValues: initialValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // RHF watch é incompatível com a regra react-hooks/incompatible-library
  // mas é a forma idiomática de re-renderizar quando items mudam.
  // eslint-disable-next-line react-hooks/incompatible-library
  const items = form.watch("items");
  const totalCents = items.reduce((sum, item) => {
    const subtotal = (item.quantity || 0) * (item.value_cents || 0);
    const discount = subtotal * ((item.discount_percent || 0) / 100);
    return sum + (subtotal - discount);
  }, 0);

  const onAddItem = () => {
    append({
      // No modo Feegow o id fica vazio até a seleção — o Zod cobra
      // ("Selecione um procedimento") se o user tentar salvar sem escolher.
      procedure_id: useFeegowPicker ? "" : `manual-${Date.now()}`,
      procedure_name: "",
      quantity: 1,
      interval_days: 0,
      value_cents: 0,
      discount_percent: 0,
      via: null,
      cuidados: "",
    });
    setValueInputs((prev) => [...prev, ""]);
  };

  const onRemoveItem = (index: number) => {
    remove(index);
    setValueInputs((prev) => prev.filter((_, i) => i !== index));
    setOpenPicker(null);
    // Reindexa os blocos abertos: sem isso, remover um item faria o bloco
    // clínico de outro abrir sozinho.
    setClinicosAbertos((prev) => {
      const next = new Set<number>();
      for (const i of prev) {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      }
      return next;
    });
  };

  /**
   * Ao escolher um procedimento da Feegow, herdamos id + nome + valor.
   * O valor fica editável: o preço do protocolo pode divergir da tabela.
   */
  const onSelectProcedure = (
    index: number,
    procedure: ProtocolProcedureOption,
  ) => {
    form.setValue(`items.${index}.procedure_id`, procedure.id, {
      shouldValidate: true,
    });
    form.setValue(`items.${index}.procedure_name`, procedure.name, {
      shouldValidate: true,
    });
    form.setValue(`items.${index}.value_cents`, procedure.value_cents, {
      shouldValidate: true,
    });
    setValueInputs((prev) => {
      const next = [...prev];
      next[index] = formatCurrency(procedure.value_cents);
      return next;
    });
    setOpenPicker(null);
  };

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createProtocol(values)
          : await updateProtocol({ ...values, id: initialId! });
      if (!result || !result.ok) {
        toast.error(result?.error ?? "Erro ao salvar protocolo");
        return;
      }
      toast.success(
        mode === "create" ? "Protocolo criado" : "Protocolo atualizado",
      );
      router.push("/protocolos");
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4 md:space-y-6">
      {feegowError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Não foi possível carregar os procedimentos da Feegow:{" "}
            {feegowError}. Os procedimentos podem ser digitados manualmente.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações básicas</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="name">Nome do protocolo *</Label>
            <Input
              id="name"
              {...form.register("name")}
              placeholder="Ex: Protocolo de acompanhamento pós-cirurgia"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cuidados de enfermagem</CardTitle>
          <p className="text-sm text-muted-foreground">
            Opcional. Sai no cabeçalho do cronograma de aplicações entregue à
            equipe.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="cuidados_gerais">Cuidados gerais</Label>
            <Textarea
              id="cuidados_gerais"
              rows={3}
              placeholder="Ex: verificar acesso venoso antes de iniciar; manter paciente hidratado"
              {...form.register("cuidados_gerais")}
            />
          </div>
          <div>
            <Label htmlFor="sinais_alerta">
              Sinais de alerta — suspender e comunicar
            </Label>
            <Textarea
              id="sinais_alerta"
              rows={3}
              placeholder="Ex: dor torácica, dispneia, rash cutâneo, queda de PA"
              {...form.register("sinais_alerta")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">Procedimentos</CardTitle>
            {useFeegowPicker && (
              <p className="text-xs text-muted-foreground mt-1">
                Procedimentos cadastrados na Feegow
              </p>
            )}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onAddItem}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar procedimento
          </Button>
        </CardHeader>
        <CardContent>
          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Adicione pelo menos um procedimento.
            </p>
          ) : (
            <div className="space-y-4">
              {fields.map((field, index) => {
                const itemErrors = form.formState.errors.items?.[index];
                const procedureError =
                  itemErrors?.procedure_id?.message ??
                  itemErrors?.procedure_name?.message;

                return (
                  <div
                    key={field.id}
                    className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 border rounded-lg bg-card"
                  >
                    <div className="md:col-span-4">
                      <Label className="text-xs">
                        {useFeegowPicker
                          ? "Procedimento *"
                          : "Nome do procedimento *"}
                      </Label>
                      {useFeegowPicker ? (
                        <Popover
                          open={openPicker === index}
                          onOpenChange={(open) =>
                            setOpenPicker(open ? index : null)
                          }
                        >
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              role="combobox"
                              className="w-full justify-between font-normal"
                            >
                              <span className="truncate">
                                {items[index]?.procedure_name ||
                                  "Selecione um procedimento"}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-[--radix-popover-trigger-width] p-0"
                            align="start"
                          >
                            <Command>
                              <CommandInput placeholder="Pesquisar procedimento..." />
                              <CommandList>
                                <CommandEmpty>
                                  Nenhum procedimento encontrado.
                                </CommandEmpty>
                                <CommandGroup>
                                  {procedures.map((procedure) => (
                                    <CommandItem
                                      key={procedure.id}
                                      value={`${procedure.name} ${procedure.id}`}
                                      onSelect={() =>
                                        onSelectProcedure(index, procedure)
                                      }
                                      className="flex items-center justify-between"
                                    >
                                      <div className="flex flex-col">
                                        <span className="font-medium">
                                          {procedure.name}
                                        </span>
                                        <span className="text-xs text-foreground/60">
                                          {formatCurrency(procedure.value_cents)}
                                        </span>
                                      </div>
                                      <Check
                                        className={cn(
                                          "ml-auto h-4 w-4",
                                          items[index]?.procedure_id ===
                                            procedure.id
                                            ? "opacity-100"
                                            : "opacity-0",
                                        )}
                                      />
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <Input
                          {...form.register(`items.${index}.procedure_name`)}
                          placeholder="Ex: Drenagem linfática"
                        />
                      )}
                      {procedureError && (
                        <p className="text-xs text-destructive mt-1">
                          {procedureError}
                        </p>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs">Quantidade *</Label>
                      <Input
                        type="number"
                        min={1}
                        {...form.register(`items.${index}.quantity`, {
                          valueAsNumber: true,
                        })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs">Intervalo (dias)</Label>
                      <Input
                        type="number"
                        min={0}
                        {...form.register(`items.${index}.interval_days`, {
                          valueAsNumber: true,
                        })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs">Valor unitário *</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="R$ 0,00"
                        value={valueInputs[index] ?? ""}
                        onChange={(e) => {
                          const formatted = formatCurrencyInput(e.target.value);
                          setValueInputs((prev) => {
                            const next = [...prev];
                            next[index] = formatted;
                            return next;
                          });
                          form.setValue(
                            `items.${index}.value_cents`,
                            parseCurrencyToCents(formatted),
                            { shouldValidate: true },
                          );
                        }}
                      />
                    </div>
                    <div className="md:col-span-1">
                      <Label className="text-xs">Desc. (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        {...form.register(`items.${index}.discount_percent`, {
                          valueAsNumber: true,
                        })}
                      />
                    </div>
                    <div className="md:col-span-1 flex items-end justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemoveItem(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="md:col-span-12 flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground"
                        onClick={() => toggleClinico(index)}
                      >
                        <Syringe className="h-3.5 w-3.5 mr-1.5" />
                        Detalhes clínicos
                        <ChevronDown
                          className={`h-3.5 w-3.5 ml-1 transition-transform ${
                            clinicosAbertos.has(index) ? "rotate-180" : ""
                          }`}
                        />
                      </Button>
                      {items[index]?.via && (
                        <Badge variant="secondary" className="text-[10px]">
                          {items[index].via}
                        </Badge>
                      )}
                    </div>

                    {clinicosAbertos.has(index) && (
                      <ProtocolClinicalFields form={form} index={index} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {form.formState.errors.items?.message && (
            <p className="text-sm text-destructive mt-3">
              {form.formState.errors.items.message}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Valor total</p>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(totalCents)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/protocolos")}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              <Save className="h-4 w-4 mr-2" />
              {isPending
                ? "Salvando..."
                : mode === "create"
                  ? "Criar protocolo"
                  : "Salvar alterações"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
