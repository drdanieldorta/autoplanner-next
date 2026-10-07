"use client";

import { useDeferredValue, useMemo, useRef, useTransition } from "react";
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
import {
  CUSTOM_DOC_CLASS,
  CUSTOM_DOC_CSS,
  montarShell,
  previewSample,
  renderCustomContract,
} from "@/lib/contracts/custom-doc";
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
  /**
   * Cabeçalho de marca e CSS já renderizados no servidor. A prévia passa
   * pelo MESMO `montarShell` + `renderCustomContract` do PDF — só a marca
   * precisa vir pronta, porque ler a logo é coisa de servidor.
   */
  preview: { brandingHeaderHtml: string; brandingCss: string };
};

export function ContratoForm({ mode, initialId, initialValues, preview }: Props) {
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

  // Prévia com dados fictícios, no mesmo HTML que vira o PDF. `useDeferredValue`
  // deixa a digitação fluida: o parse acompanha com um passo de atraso.
  // eslint-disable-next-line react-hooks/incompatible-library
  const content = form.watch("content");
  const deferredContent = useDeferredValue(content);
  const previewSrcDoc = useMemo(() => {
    const sample = previewSample();
    const body = `${preview.brandingHeaderHtml}${renderCustomContract({
      content: deferredContent?.trim()
        ? deferredContent
        : "*Digite o conteúdo ao lado para ver a prévia.*",
      variables: sample.variables,
      procedimentos: sample.procedimentos,
    })}`;
    return montarShell(
      [{ classe: CUSTOM_DOC_CLASS, css: CUSTOM_DOC_CSS, body }],
      preview.brandingCss,
    );
  }, [deferredContent, preview]);

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
          <p className="text-sm text-muted-foreground mb-3">
            Escreva em Markdown: <code>## Título</code>,{" "}
            <code>**negrito**</code>, tabelas com <code>|</code>,{" "}
            <code>&gt; citação</code> e <code>---</code> para linha divisória.
            Uma quebra de linha no texto vira uma quebra no documento.
          </p>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
            <div>
              <Textarea
                {...contentRest}
                ref={(el) => {
                  rhfContentRef(el);
                  contentRef.current = el;
                }}
                rows={32}
                className="font-mono text-sm min-h-[720px]"
                placeholder="Digite ou cole o modelo do contrato em Markdown. Use as variáveis acima para personalização."
              />
              {form.formState.errors.content && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.content.message}
                </p>
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                <Label>Prévia</Label>
                <span className="text-xs text-muted-foreground">
                  Dados fictícios. O PDF final usa os dados do orçamento.
                </span>
              </div>
              {/* sandbox vazio: nada do modelo executa script nem alcança o
                  painel. É também o que isola o CSS do contrato do CSS do app. */}
              <iframe
                title="Prévia do contrato"
                sandbox=""
                srcDoc={previewSrcDoc}
                className="w-full h-[720px] rounded-md border bg-white"
              />
            </div>
          </div>
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
