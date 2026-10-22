"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Save, Users } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  isPatientSource,
  resolvePatientSource,
  type PatientSource,
} from "@/lib/orcamento/patient-source";

import {
  updatePatientSource,
  type UpdatePatientSourceState,
} from "../actions";

const OPCOES: { value: PatientSource; label: string; descricao: string }[] = [
  {
    value: "feegow",
    label: "Feegow (padrão)",
    descricao:
      "Busca o paciente na Feegow e cria a proposta lá. Sem chave da Feegow, busca no CRM. Sem nenhuma das duas, os dados do paciente são digitados.",
  },
  {
    value: "crm",
    label: "CRM MD.IA",
    descricao:
      'Busca os contatos etiquetados "Paciente" no CRM. CPF e telefone que não vierem de lá são digitados. Sem chave do CRM, os dados do paciente são digitados.',
  },
  {
    value: "manual",
    label: "Não puxar (digitar os dados)",
    descricao: "Nome, CPF e telefone do paciente são digitados no orçamento.",
  },
];

/** O que o formulário de orçamento vai fazer, com as chaves de hoje. */
function resumoEfetivo(
  escolhida: PatientSource,
  efetiva: PatientSource,
): string {
  if (efetiva === "feegow") return "pacientes da Feegow.";
  if (efetiva === "crm") {
    return escolhida === "crm"
      ? "pacientes do CRM."
      : "pacientes do CRM, porque a empresa não tem chave da Feegow.";
  }
  if (escolhida === "manual") return "dados do paciente digitados.";
  return escolhida === "crm"
    ? "dados do paciente digitados, porque a empresa não tem chave do CRM."
    : "dados do paciente digitados, porque a empresa não tem chave da Feegow nem do CRM.";
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      <Save className="h-4 w-4 mr-2" />
      {pending ? "Salvando..." : "Salvar origem dos pacientes"}
    </Button>
  );
}

type Props = {
  /** Preferência salva. */
  value: PatientSource;
  hasFeegow: boolean;
  hasCrm: boolean;
};

export function PatientSourceForm({ value, hasFeegow, hasCrm }: Props) {
  const [state, action] = useActionState<UpdatePatientSourceState, FormData>(
    updatePatientSource,
    null,
  );
  const [escolhida, setEscolhida] = useState<PatientSource>(value);

  useEffect(() => {
    if (!state) return;
    if (state.ok) toast.success("Origem dos pacientes salva");
    else toast.error(state.error);
  }, [state]);

  const efetiva = resolvePatientSource(escolhida, { hasFeegow, hasCrm });
  const opcao = OPCOES.find((o) => o.value === escolhida) ?? OPCOES[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Users className="h-5 w-5 text-primary-blue" />
          Pacientes no orçamento
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          De onde o formulário de orçamento puxa os dados do paciente.
          Procedimentos e profissionais não mudam com esta opção.
        </p>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          {/* Input nativo: não depende do <select> escondido do Radix para o
              valor chegar na Server Action. */}
          <input type="hidden" name="patientSource" value={escolhida} />
          <div className="space-y-2">
            <Label htmlFor="patientSource">Origem dos pacientes</Label>
            <Select
              value={escolhida}
              onValueChange={(v) => {
                if (isPatientSource(v)) setEscolhida(v);
              }}
            >
              <SelectTrigger id="patientSource" className="w-full sm:w-80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPCOES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">{opcao.descricao}</p>
          </div>

          <p className="text-sm">
            Com as chaves configuradas hoje:{" "}
            <span className="font-medium">
              {resumoEfetivo(escolhida, efetiva)}
            </span>
          </p>

          {hasFeegow && efetiva !== "feegow" && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Sem paciente da Feegow, o orçamento não vira proposta na
                Feegow, e o contrato assinado e o cronograma de aplicações não
                são anexados ao prontuário. Procedimentos e profissionais
                continuam vindo da Feegow.
              </AlertDescription>
            </Alert>
          )}

          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
