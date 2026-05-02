"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCNPJ, formatCPF } from "@/lib/masks";

import {
  createEmpresa,
  updateEmpresa,
  type EmpresaFormState,
} from "../actions";

type Props =
  | { mode: "create"; initialValues?: never }
  | {
      mode: "edit";
      initialValues: {
        id: string;
        name: string;
        cnpj: string | null;
        nicho: string | null;
        endereco: string | null;
        ceo_name: string | null;
        ceo_cpf: string | null;
      };
    };

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Save className="h-4 w-4 mr-2" />
      {pending
        ? "Salvando..."
        : mode === "create"
          ? "Criar empresa"
          : "Salvar alterações"}
    </Button>
  );
}

export function EmpresaForm(props: Props) {
  const router = useRouter();
  const action = props.mode === "create" ? createEmpresa : updateEmpresa;
  const [state, formAction] = useActionState<EmpresaFormState, FormData>(
    action,
    null,
  );

  const [cnpj, setCnpj] = useState(props.initialValues?.cnpj ?? "");
  const [ceoCpf, setCeoCpf] = useState(props.initialValues?.ceo_cpf ?? "");

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(
        props.mode === "create" ? "Empresa criada" : "Empresa atualizada",
      );
      if (props.mode === "create") {
        router.push(`/empresas/${state.id}`);
      } else {
        router.refresh();
      }
    } else {
      toast.error(state.error);
    }
  }, [state, props.mode, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Dados da empresa</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {props.mode === "edit" && (
            <input type="hidden" name="id" value={props.initialValues.id} />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome da empresa *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={props.initialValues?.name ?? ""}
                placeholder="Ex: Clínica Dorta"
                required
              />
            </div>
            <div>
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                name="cnpj"
                value={cnpj}
                onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                placeholder="00.000.000/0000-00"
                maxLength={18}
              />
            </div>
            <div>
              <Label htmlFor="nicho">Nicho</Label>
              <Input
                id="nicho"
                name="nicho"
                defaultValue={props.initialValues?.nicho ?? ""}
                placeholder="Ex: Clínica Médica"
              />
            </div>
            <div>
              <Label htmlFor="endereco">Endereço</Label>
              <Input
                id="endereco"
                name="endereco"
                defaultValue={props.initialValues?.endereco ?? ""}
                placeholder="Ex: Rua Exemplo, 123 - Centro"
              />
            </div>
            <div>
              <Label htmlFor="ceo_name">Nome do CEO</Label>
              <Input
                id="ceo_name"
                name="ceo_name"
                defaultValue={props.initialValues?.ceo_name ?? ""}
                placeholder="Ex: João Silva"
              />
            </div>
            <div>
              <Label htmlFor="ceo_cpf">CPF do CEO</Label>
              <Input
                id="ceo_cpf"
                name="ceo_cpf"
                value={ceoCpf}
                onChange={(e) => setCeoCpf(formatCPF(e.target.value))}
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/empresas")}
            >
              Cancelar
            </Button>
            <SubmitButton mode={props.mode} />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
