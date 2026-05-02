"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CONTRACT_VARIABLES } from "@/lib/contracts/variables";
import { createContract, updateContract } from "../actions";

const Schema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(500).optional(),
  content: z.string().trim().min(1),
});

type FormValues = z.infer<typeof Schema>;

type Props = {
  mode: "create" | "edit";
  initialId?: string;
  initialValues: FormValues;
};

export function ContratoForm({ mode, initialId, initialValues }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const contentRef = useRef<HTMLTextAreaElement | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: initialValues,
  });

  const insertVariable = (variable: string) => {
    const textarea = contentRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = form.getValues("content");
    const next = current.slice(0, start) + variable + current.slice(end);
    form.setValue("content", next, { shouldDirty: true });
    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + variable.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createContract(values)
          : await updateContract({ ...values, id: initialId! });
      if (!result || !result.ok) {
        toast.error(result?.error ?? "Erro ao salvar contrato");
        return;
      }
      toast.success(
        mode === "create" ? "Contrato criado" : "Contrato atualizado",
      );
      router.push("/contratos");
      router.refresh();
    });
  });

  // Conecta a ref do RHF + a ref local pro insertVariable
  const { ref: rhfContentRef, ...contentRest } = form.register("content");

  return (
    <form onSubmit={onSubmit} className="space-y-4 md:space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações básicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              {...form.register("name")}
              placeholder="Ex: Contrato padrão pós-cirurgia"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              {...form.register("description")}
              placeholder="Curta — só para identificação interna"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Variáveis disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Clique para inserir no cursor. As variáveis são substituídas no
            momento da geração do PDF.
          </p>
          <div className="flex flex-wrap gap-2">
            {CONTRACT_VARIABLES.map((v) => (
              <Button
                key={v.key}
                type="button"
                variant="outline"
                size="sm"
                className="font-mono text-xs"
                onClick={() => insertVariable(v.key)}
                title={v.label}
              >
                {v.key}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Conteúdo do contrato</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            {...contentRest}
            ref={(el) => {
              rhfContentRef(el);
              contentRef.current = el;
            }}
            rows={20}
            className="font-mono text-sm"
            placeholder="Digite ou cole o template do contrato. Use as variáveis acima para personalização."
          />
          {form.formState.errors.content && (
            <p className="text-sm text-destructive mt-1">
              {form.formState.errors.content.message}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/contratos")}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          <Save className="h-4 w-4 mr-2" />
          {isPending
            ? "Salvando..."
            : mode === "create"
              ? "Criar contrato"
              : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
