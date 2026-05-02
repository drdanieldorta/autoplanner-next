"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";
import { parseCurrencyToCents, formatCurrencyInput } from "@/lib/masks";
import { createProtocolSchema } from "@/lib/validations";
import { createProtocol, updateProtocol } from "../actions";

type FormValues = z.infer<typeof createProtocolSchema>;

type Props = {
  mode: "create" | "edit";
  initialId?: string;
  initialValues: FormValues;
};

export function ProtocolForm({ mode, initialId, initialValues }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [valueInputs, setValueInputs] = useState<string[]>(
    initialValues.items.map((item) => formatCurrency(item.value_cents)),
  );

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
      procedure_id: `manual-${Date.now()}`,
      procedure_name: "",
      quantity: 1,
      interval_days: 0,
      value_cents: 0,
      discount_percent: 0,
    });
    setValueInputs((prev) => [...prev, ""]);
  };

  const onRemoveItem = (index: number) => {
    remove(index);
    setValueInputs((prev) => prev.filter((_, i) => i !== index));
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
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Procedimentos</CardTitle>
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
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 border rounded-lg bg-card"
                >
                  <div className="md:col-span-4">
                    <Label className="text-xs">Nome do procedimento *</Label>
                    <Input
                      {...form.register(`items.${index}.procedure_name`)}
                      placeholder="Ex: Drenagem linfática"
                    />
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
                </div>
              ))}
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
