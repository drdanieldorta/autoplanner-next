"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Check, ChevronsUpDown, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { formatCurrency, parseCurrency } from "@/lib/currency";
import { formatCurrencyInput, formatCPF, formatPhoneNumber } from "@/lib/masks";
import { cn } from "@/lib/utils";
import { createOrcamentoSchema } from "@/lib/validations";

import type {
  OrcamentoPatientOption,
  OrcamentoProcedureOption,
  OrcamentoProfessionalOption,
} from "@/lib/services/orcamento-form-data";

type FormValues = z.infer<typeof createOrcamentoSchema>;

type ProtocolItem = {
  procedure_id: string;
  procedure_name: string;
  quantity: number;
  interval_days: number;
  value_cents: number;
  discount_percent: number;
  /** Camada clínica — alimenta o cronograma da enfermagem. */
  via?: string | null;
};

type ProtocolOption = {
  id: string;
  name: string;
  total_value_cents: number;
  items: ProtocolItem[];
};

type ContractOption = { id: string; name: string };

type Props = {
  hasFeegow: boolean;
  feegowError: string | null;
  procedures: OrcamentoProcedureOption[];
  patients: OrcamentoPatientOption[];
  professionals: OrcamentoProfessionalOption[];
  protocols: ProtocolOption[];
  contracts: ContractOption[];
};

export function OrcamentoForm({
  hasFeegow,
  feegowError,
  procedures,
  patients,
  professionals,
  protocols,
  contracts,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Itens do protocolo base — derivados do protocolo selecionado (já vêm
  // inline em `protocols`). Não são editáveis na criação do orçamento.
  const [protocolItems, setProtocolItems] = useState<ProtocolItem[]>([]);

  // Itens sem via definida: o cronograma deduz pelo nome e marca para
  // conferência. Não bloqueia nada — só avisa quem está montando.
  const protocolSemVia = protocolItems.filter((p) => !p.via);

  // Estado do "adicionar procedimento extra" antes de fazer append.
  const [extraProcedureId, setExtraProcedureId] = useState("");
  const [extraProcedureName, setExtraProcedureName] = useState("");
  const [extraQuantity, setExtraQuantity] = useState(1);
  const [extraInterval, setExtraInterval] = useState(0);
  const [extraValueInput, setExtraValueInput] = useState("");

  // Inputs com máscara — guardamos a string formatada localmente e apenas
  // o número em centavos no form state.
  const [installmentValueInput, setInstallmentValueInput] = useState("");

  const [patientPopoverOpen, setPatientPopoverOpen] = useState(false);
  const [professionalPopoverOpen, setProfessionalPopoverOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(createOrcamentoSchema),
    defaultValues: {
      patient_id: "",
      patient_name: "",
      patient_cpf: "",
      patient_email: "",
      patient_phone: "",
      patient_birth: "",
      patient_neighborhood: "",
      professional_id: "",
      professional_name: "",
      professional_cpf: "",
      professional_email: "",
      professional_specialization: "",
      professional_crm: "",
      professional_sys_user: "",
      protocol_id: null,
      protocol_name: null,
      additional_procedures: [],
      contract_id: null,
      discount_percent: 0,
      payment_method: null,
      custom_payment_method: "",
      installments: null,
      installment_value_cents: null,
      paciente_alergias: "",
      observacoes: "",
      prescricao_inicio: new Date().toISOString().slice(0, 10),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "additional_procedures",
  });

  // RHF watch — incompatível com a regra react-hooks/incompatible-library mas
  // é a forma idiomática de re-renderizar quando os campos mudam.
  // eslint-disable-next-line react-hooks/incompatible-library
  const additionalProcedures = form.watch("additional_procedures");
  const protocolId = form.watch("protocol_id");
  const patientId = form.watch("patient_id");
  const professionalId = form.watch("professional_id");
  const totalDiscount = form.watch("discount_percent");
  const paymentMethod = form.watch("payment_method");
  const customPaymentMethod = form.watch("custom_payment_method");
  const installments = form.watch("installments") ?? 1;

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === patientId),
    [patients, patientId],
  );

  const selectedProfessional = useMemo(
    () => professionals.find((p) => p.id === professionalId),
    [professionals, professionalId],
  );

  const protocolTotalCents = useMemo(
    () =>
      protocolItems.reduce(
        (sum, item) =>
          sum +
          item.quantity *
            item.value_cents *
            (1 - (item.discount_percent ?? 0) / 100),
        0,
      ),
    [protocolItems],
  );

  const additionalTotalCents = useMemo(
    () =>
      additionalProcedures.reduce(
        (sum, item) => sum + (item.quantity ?? 0) * (item.value_cents ?? 0),
        0,
      ),
    [additionalProcedures],
  );

  const subtotalCents = protocolTotalCents + additionalTotalCents;
  const totalCents = Math.round(
    subtotalCents * (1 - (totalDiscount ?? 0) / 100),
  );

  const onSelectPatient = (patient: OrcamentoPatientOption) => {
    form.setValue("patient_id", patient.id, { shouldValidate: true });
    form.setValue("patient_name", patient.name);
    form.setValue("patient_email", patient.email);
    form.setValue("patient_phone", patient.phone);
    form.setValue("patient_birth", patient.birth);
    form.setValue("patient_neighborhood", patient.neighborhood);
    setPatientPopoverOpen(false);

    // CPF não vem em /patient/list — buscar pontualmente via /patient/search.
    // Falha silenciosa: se Feegow não responder, o user pode digitar manualmente
    // no campo CPF (que continua editável).
    if (hasFeegow && patient.id && patient.id !== "manual") {
      fetch(`/api/feegow/pacientes/${encodeURIComponent(patient.id)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { cpf?: string } | null) => {
          if (data?.cpf) {
            form.setValue("patient_cpf", formatCPF(data.cpf));
          }
        })
        .catch(() => {
          // ignora — CPF fica em branco e user pode preencher
        });
    }
  };

  const onSelectProfessional = (prof: OrcamentoProfessionalOption) => {
    form.setValue("professional_id", prof.id, { shouldValidate: true });
    form.setValue("professional_name", prof.name);
    form.setValue("professional_cpf", prof.cpf);
    form.setValue("professional_email", prof.email);
    form.setValue("professional_specialization", prof.specialization);
    form.setValue("professional_crm", prof.crm);
    form.setValue("professional_sys_user", prof.sys_user);
    setProfessionalPopoverOpen(false);
  };

  const onSelectProtocol = (id: string) => {
    if (id === "none") {
      form.setValue("protocol_id", null);
      form.setValue("protocol_name", null);
      setProtocolItems([]);
      return;
    }
    const protocol = protocols.find((p) => p.id === id);
    if (!protocol) return;
    form.setValue("protocol_id", id);
    form.setValue("protocol_name", protocol.name);
    setProtocolItems(protocol.items);
  };

  const onAddExtraProcedure = () => {
    if (hasFeegow) {
      const proc = procedures.find((p) => p.id === extraProcedureId);
      if (!proc) {
        toast.error("Selecione um procedimento");
        return;
      }
      const valueCents = parseCurrency(extraValueInput) || proc.value_cents;
      if (!valueCents) {
        toast.error("Informe o valor do procedimento");
        return;
      }
      append({
        procedure_id: proc.id,
        procedure_name: proc.name,
        quantity: extraQuantity,
        interval_days: extraInterval,
        value_cents: valueCents,
        discount_percent: 0,
      });
      setExtraProcedureId("");
    } else {
      const name = extraProcedureName.trim();
      if (!name) {
        toast.error("Informe o nome do procedimento");
        return;
      }
      const valueCents = parseCurrency(extraValueInput);
      if (!valueCents) {
        toast.error("Informe o valor do procedimento");
        return;
      }
      append({
        procedure_id: `manual-${Date.now()}`,
        procedure_name: name,
        quantity: extraQuantity,
        interval_days: extraInterval,
        value_cents: valueCents,
        discount_percent: 0,
      });
      setExtraProcedureName("");
    }
    setExtraQuantity(1);
    setExtraInterval(0);
    setExtraValueInput("");
  };

  // Distingue qual botão acionou o submit. "save_and_send" encadeia
  // POST /api/contratos/envio-manual após o orçamento ser criado.
  const [submitAction, setSubmitAction] = useState<
    "save" | "save_and_send"
  >("save");

  const onSubmit = form.handleSubmit((values) => {
    if (protocolItems.length === 0 && values.additional_procedures.length === 0) {
      toast.error(
        "Adicione pelo menos um procedimento (protocolo base ou extra)",
      );
      return;
    }

    // Combina procedimentos do protocolo com os extras antes de enviar.
    // O endpoint exige procedimentos.length >= 1.
    const allProcedures = [
      ...protocolItems.map((p) => ({
        procedure_id: p.procedure_id,
        procedure_name: p.procedure_name,
        quantity: p.quantity,
        value_cents: p.value_cents,
        discount_percent: p.discount_percent ?? 0,
        interval_days: p.interval_days ?? 0,
      })),
      ...values.additional_procedures.map((p) => ({
        procedure_id: p.procedure_id,
        procedure_name: p.procedure_name,
        quantity: p.quantity,
        value_cents: p.value_cents,
        discount_percent: p.discount_percent ?? 0,
        interval_days: p.interval_days ?? 0,
      })),
    ];

    const payload = {
      // identidade — em modo manual, ids são literais "manual" (parity com Vite)
      paciente_id: hasFeegow ? values.patient_id : "manual",
      paciente_nome: values.patient_name,
      paciente_cpf: values.patient_cpf || undefined,
      paciente_email: values.patient_email || undefined,
      paciente_telefone: values.patient_phone || undefined,
      paciente_nascimento: values.patient_birth || undefined,
      paciente_bairro: values.patient_neighborhood || undefined,
      profissional_id: hasFeegow ? values.professional_id : "manual",
      profissional_nome: values.professional_name,
      profissional_cpf: values.professional_cpf || undefined,
      profissional_email: values.professional_email || undefined,
      profissional_especialidade: values.professional_specialization || undefined,
      profissional_crm: values.professional_crm || undefined,
      profissional_sys_user: values.professional_sys_user || undefined,
      protocolo_id: values.protocol_id || null,
      protocolo_nome: values.protocol_name || null,
      contract_id: values.contract_id || null,
      procedimentos: allProcedures,
      procedimentos_adicionais: values.additional_procedures,
      valor_total_cents: totalCents,
      discount_percent: values.discount_percent ?? 0,
      status_id: 1,
      payment_method: values.payment_method ?? null,
      custom_payment_method: values.custom_payment_method?.trim() || null,
      installments:
        values.payment_method === "credito" ? values.installments : null,
      installment_value_cents:
        values.payment_method === "credito"
          ? values.installment_value_cents
          : null,
      paciente_alergias: values.paciente_alergias?.trim() || null,
      observacoes: values.observacoes?.trim() || null,
      prescricao_inicio: values.prescricao_inicio || null,
    };

    const shouldSendContract = submitAction === "save_and_send";

    startTransition(async () => {
      let propostaId: string;
      try {
        const res = await fetch("/api/propostas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = (await res
            .json()
            .catch(() => ({}))) as { error?: string };
          toast.error(err.error ?? "Falha ao criar orçamento");
          return;
        }
        const created = (await res.json()) as { id: string };
        propostaId = created.id;
      } catch {
        toast.error("Erro de rede ao salvar orçamento");
        return;
      }

      if (!shouldSendContract) {
        toast.success("Orçamento criado com sucesso");
        router.push("/orcamentos");
        router.refresh();
        return;
      }

      // Encadeia o envio do contrato. Se falhar, não joga fora o orçamento —
      // o user reabilita pelo botão "Reenviar" na tela de detalhes.
      try {
        const sendRes = await fetch("/api/contratos/envio-manual", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proposta_id: propostaId }),
        });
        if (!sendRes.ok) {
          const err = (await sendRes
            .json()
            .catch(() => ({}))) as { error?: string };
          toast.error(
            `Orçamento criado, mas falhou ao enviar o contrato: ${
              err.error ?? "tente reenviar pela tela de detalhes"
            }`,
            { duration: 8000 },
          );
          router.push(`/orcamentos/${propostaId}`);
          router.refresh();
          return;
        }
        toast.success("Orçamento criado e contrato enviado");
      } catch {
        toast.error(
          "Orçamento criado, mas erro de rede ao enviar contrato. Reenvie pela tela de detalhes.",
          { duration: 8000 },
        );
        router.push(`/orcamentos/${propostaId}`);
        router.refresh();
        return;
      }

      // Terceira chamada: cronograma de aplicações para a enfermagem.
      //
      // Rota SEPARADA de propósito. `envio-manual` já opera no teto de 60s
      // do plano Hobby com um cold start de Chromium + upload Authentique;
      // um segundo PDF no mesmo invoke transformaria a rota mais crítica do
      // sistema na mais frágil. Custo visível: dois toasts em sequência.
      //
      // Falha aqui NUNCA derruba o que já deu certo — o orçamento existe e o
      // contrato já foi assinado/enviado. Mesmo tratamento que a falha do
      // contrato recebe acima.
      try {
        const prescRes = await fetch("/api/prescricoes/gerar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proposta_id: propostaId }),
        });
        if (!prescRes.ok) {
          const err = (await prescRes
            .json()
            .catch(() => ({}))) as { error?: string };
          toast.warning(
            `Contrato enviado, mas o cronograma de enfermagem não foi anexado: ${
              err.error ?? "tente novamente pela tela de detalhes"
            }`,
            { duration: 8000 },
          );
        } else {
          const data = (await prescRes.json().catch(() => ({}))) as {
            feegow?: string;
            avisos?: Array<{ mensagem: string }>;
          };
          if (data.feegow === "enviado") {
            toast.success("Cronograma de enfermagem anexado ao prontuário");
          }
          if (data.avisos?.length) {
            toast.warning(
              `Cronograma com ${data.avisos.length} ponto(s) para conferir: ${data.avisos
                .slice(0, 2)
                .map((a) => a.mensagem)
                .join(" ")}`,
              { duration: 10000 },
            );
          }
        }
      } catch {
        toast.warning(
          "Contrato enviado, mas erro de rede ao gerar o cronograma de enfermagem.",
          { duration: 8000 },
        );
      }

      router.push(`/orcamentos/${propostaId}`);
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {feegowError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Não foi possível carregar todos os dados da Feegow: {feegowError}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Coluna esquerda: identidade + parâmetros */}
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Informações do Orçamento</h2>

          {/* Paciente */}
          <div>
            <Label className="text-sm font-medium text-muted-foreground">
              Paciente
            </Label>
            {hasFeegow ? (
              <Popover
                open={patientPopoverOpen}
                onOpenChange={setPatientPopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between mt-1 font-normal h-auto py-2"
                  >
                    {selectedPatient ? (
                      <div className="flex flex-col items-start">
                        <span>{selectedPatient.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {selectedPatient.email}
                        </span>
                      </div>
                    ) : (
                      "Selecione um paciente"
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[--radix-popover-trigger-width] p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput placeholder="Pesquisar paciente..." />
                    <CommandList>
                      <CommandEmpty>Nenhum paciente encontrado.</CommandEmpty>
                      <CommandGroup>
                        {patients.map((patient) => (
                          <CommandItem
                            key={patient.id}
                            value={`${patient.name} ${patient.email}`}
                            onSelect={() => onSelectPatient(patient)}
                            className="flex items-center justify-between"
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {patient.name}
                              </span>
                              <span className="text-xs text-foreground/60">
                                {patient.email}
                              </span>
                            </div>
                            <Check
                              className={cn(
                                "ml-auto h-4 w-4",
                                patientId === patient.id
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
              <div className="space-y-2 mt-1">
                <Input
                  placeholder="Nome do paciente"
                  value={form.watch("patient_name") ?? ""}
                  onChange={(e) => {
                    form.setValue("patient_name", e.target.value, {
                      shouldValidate: true,
                    });
                    form.setValue("patient_id", e.target.value || "");
                  }}
                />
                <Input
                  placeholder="CPF do paciente"
                  value={form.watch("patient_cpf") ?? ""}
                  onChange={(e) =>
                    form.setValue("patient_cpf", formatCPF(e.target.value))
                  }
                  maxLength={14}
                />
                <Input
                  placeholder="Telefone do paciente Ex: (11) 99999-9999"
                  value={form.watch("patient_phone") ?? ""}
                  onChange={(e) =>
                    form.setValue(
                      "patient_phone",
                      formatPhoneNumber(e.target.value),
                    )
                  }
                  maxLength={15}
                />
              </div>
            )}
            {form.formState.errors.patient_id && (
              <p className="text-xs text-destructive mt-1">
                {form.formState.errors.patient_id.message}
              </p>
            )}
          </div>

          {/* Profissional */}
          <div>
            <Label className="text-sm font-medium text-muted-foreground">
              Profissional
            </Label>
            <Popover
              open={professionalPopoverOpen}
              onOpenChange={setProfessionalPopoverOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between mt-1 font-normal h-auto py-2"
                >
                  {selectedProfessional ? (
                    <div className="flex flex-col items-start">
                      <span>{selectedProfessional.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {selectedProfessional.specialization}
                      </span>
                    </div>
                  ) : (
                    "Selecione um profissional"
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0"
                align="start"
              >
                <Command>
                  <CommandInput placeholder="Pesquisar profissional..." />
                  <CommandList>
                    <CommandEmpty>
                      Nenhum profissional encontrado.
                    </CommandEmpty>
                    <CommandGroup>
                      {professionals.map((prof) => (
                        <CommandItem
                          key={prof.id}
                          value={`${prof.name} ${prof.specialization}`}
                          onSelect={() => onSelectProfessional(prof)}
                          className="flex items-center justify-between"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{prof.name}</span>
                            <span className="text-xs text-foreground/60">
                              {prof.specialization}
                            </span>
                          </div>
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              professionalId === prof.id
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
            {form.formState.errors.professional_id && (
              <p className="text-xs text-destructive mt-1">
                {form.formState.errors.professional_id.message}
              </p>
            )}
          </div>

          {/* Protocolo base */}
          <div>
            <Label className="text-sm font-medium text-muted-foreground">
              Protocolo base
            </Label>
            <Select
              value={protocolId ?? "none"}
              onValueChange={onSelectProtocol}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione um protocolo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-muted-foreground">
                  Nenhum
                </SelectItem>
                {protocols.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Desconto total */}
          <div className="pt-4 border-t">
            <Label className="text-sm font-medium text-muted-foreground">
              Desconto total (%)
            </Label>
            <Input
              type="number"
              min={0}
              max={100}
              {...form.register("discount_percent", { valueAsNumber: true })}
              placeholder="0"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Aplicado ao valor total do orçamento
            </p>
          </div>

          {/* Forma de pagamento */}
          <div className="pt-4 border-t">
            <Label className="text-sm font-medium text-muted-foreground">
              Forma de pagamento <span className="text-destructive">*</span>
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              Selecione uma forma padrão OU descreva uma personalizada.
            </p>
            <Select
              value={paymentMethod ?? "none"}
              onValueChange={(value) => {
                if (value === "none") {
                  form.setValue("payment_method", null);
                  form.setValue("installments", null);
                  form.setValue("installment_value_cents", null);
                  setInstallmentValueInput("");
                } else {
                  const methodValue = value as
                    | "dinheiro"
                    | "pix"
                    | "transferencia"
                    | "debito"
                    | "credito";
                  form.setValue("payment_method", methodValue);
                  form.setValue("custom_payment_method", "");
                  if (methodValue !== "credito") {
                    form.setValue("installments", null);
                    form.setValue("installment_value_cents", null);
                    setInstallmentValueInput("");
                  }
                }
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-muted-foreground">
                  Nenhuma (usar personalizada)
                </SelectItem>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                <SelectItem value="pix">Pix</SelectItem>
                <SelectItem value="transferencia">
                  Transferência Bancária
                </SelectItem>
                <SelectItem value="debito">Cartão de Débito</SelectItem>
                <SelectItem value="credito">Cartão de Crédito</SelectItem>
              </SelectContent>
            </Select>

            {paymentMethod === "credito" && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Parcelas</Label>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={installments}
                    onChange={(e) => {
                      const qty = Number(e.target.value) || 1;
                      form.setValue("installments", qty);
                      if (qty > 0) {
                        const perInstallment = Math.round(totalCents / qty);
                        form.setValue(
                          "installment_value_cents",
                          perInstallment,
                        );
                        setInstallmentValueInput(formatCurrency(perInstallment));
                      }
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs">Valor por parcela</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="R$ 0,00"
                    value={installmentValueInput}
                    onChange={(e) => {
                      const formatted = formatCurrencyInput(e.target.value);
                      setInstallmentValueInput(formatted);
                      form.setValue(
                        "installment_value_cents",
                        parseCurrency(formatted),
                      );
                    }}
                  />
                </div>
              </div>
            )}

            <div className="mt-3">
              <Label className="text-sm font-medium text-muted-foreground">
                Forma de pagamento personalizada
              </Label>
              <Textarea
                value={customPaymentMethod ?? ""}
                onChange={(e) => {
                  form.setValue("custom_payment_method", e.target.value);
                  if (e.target.value.trim()) {
                    form.setValue("payment_method", null);
                    form.setValue("installments", null);
                    form.setValue("installment_value_cents", null);
                    setInstallmentValueInput("");
                  }
                }}
                disabled={!!paymentMethod}
                placeholder="Ex: 50% na assinatura + 50% após 30 dias"
                className="mt-1 min-h-[80px]"
              />
            </div>
            {form.formState.errors.payment_method && (
              <p className="text-xs text-destructive mt-1">
                {form.formState.errors.payment_method.message}
              </p>
            )}
          </div>

          {/* Modelo de contrato */}
          <div className="pt-4 border-t">
            <Label className="text-sm font-medium text-muted-foreground">
              Modelo de contrato
            </Label>
            <Select
              value={form.watch("contract_id") ?? "default"}
              onValueChange={(value) =>
                form.setValue("contract_id", value === "default" ? null : value)
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Contrato padrão do sistema" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">
                  Contrato padrão do sistema
                </SelectItem>
                {contracts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Adicionar procedimento extra */}
          <div className="pt-4 border-t">
            <h3 className="text-md font-medium mb-3">
              Adicionar procedimento extra
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">
                  {hasFeegow ? "Procedimento" : "Nome do procedimento"}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                {hasFeegow ? (
                  <Select
                    value={extraProcedureId}
                    onValueChange={(value) => {
                      setExtraProcedureId(value);
                      const proc = procedures.find((p) => p.id === value);
                      if (proc) {
                        setExtraValueInput(formatCurrency(proc.value_cents));
                      }
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {procedures.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={extraProcedureName}
                    onChange={(e) => setExtraProcedureName(e.target.value)}
                    placeholder="Digite o nome"
                    className="mt-1"
                  />
                )}
              </div>
              <div>
                <Label className="text-xs">Quantidade</Label>
                <Input
                  type="number"
                  min={1}
                  value={extraQuantity}
                  onChange={(e) => setExtraQuantity(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Intervalo (dias)</Label>
                <Input
                  type="number"
                  min={0}
                  value={extraInterval}
                  onChange={(e) => setExtraInterval(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Valor</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="R$ 0,00"
                  value={extraValueInput}
                  onChange={(e) =>
                    setExtraValueInput(formatCurrencyInput(e.target.value))
                  }
                  className="mt-1"
                />
              </div>
            </div>
            <Button
              type="button"
              onClick={onAddExtraProcedure}
              className="w-full mt-3"
              disabled={
                hasFeegow
                  ? !extraProcedureId || !extraValueInput
                  : !extraProcedureName.trim() || !extraValueInput
              }
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar procedimento
            </Button>
          </div>
        </Card>

        {/* Coluna direita: lista de procedimentos */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              Procedimentos adicionados
            </h2>
            <div className="text-lg font-semibold">
              Total: {formatCurrency(totalCents)}
            </div>
          </div>

          <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
            {protocolItems.length > 0 && (
              <>
                <div className="border-b pb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Do protocolo base
                  </h3>
                </div>
                {protocolItems.map((p, idx) => (
                  <div
                    key={`pp-${idx}`}
                    className="bg-primary/10 p-3 rounded-lg border border-primary/20"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{p.procedure_name}</h4>
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                        Protocolo
                      </span>
                    </div>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Quantidade
                        </span>
                        <span>{p.quantity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Valor unitário
                        </span>
                        <span>{formatCurrency(p.value_cents)}</span>
                      </div>
                      {p.discount_percent > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Desconto
                          </span>
                          <span>{p.discount_percent}%</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-1 border-t border-border/50">
                        <span className="text-muted-foreground font-medium">
                          Subtotal
                        </span>
                        <span className="font-semibold">
                          {formatCurrency(
                            p.quantity *
                              p.value_cents *
                              (1 - (p.discount_percent ?? 0) / 100),
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {fields.length > 0 && (
              <div className="border-b pb-2 pt-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Procedimentos extras
                </h3>
              </div>
            )}

            {fields.length === 0 && protocolItems.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum procedimento adicionado ainda
              </p>
            ) : (
              fields.map((field, index) => {
                const item = additionalProcedures[index];
                const subtotal =
                  (item?.quantity ?? 0) * (item?.value_cents ?? 0);
                return (
                  <div
                    key={field.id}
                    className="bg-muted/30 p-3 rounded-lg"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">
                        {item?.procedure_name ?? "—"}
                      </h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        className="h-7 w-7 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Quantidade
                        </span>
                        <span>{item?.quantity ?? 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Valor unitário
                        </span>
                        <span>
                          {formatCurrency(item?.value_cents ?? 0)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-border/50">
                        <span className="text-muted-foreground font-medium">
                          Subtotal
                        </span>
                        <span className="font-semibold">
                          {formatCurrency(subtotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* Cronograma de aplicações — gerado junto com o contrato e anexado
          ao prontuário Feegow. Aparece só quando há o que executar. */}
      {(protocolItems.length > 0 || fields.length > 0) && (
        <Card className="p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">
              Cronograma de aplicações (enfermagem)
            </h2>
            <p className="text-sm text-muted-foreground">
              Gerado automaticamente ao enviar o contrato e anexado ao
              prontuário do paciente na Feegow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="prescricao_inicio">Início do tratamento</Label>
              <Input
                id="prescricao_inicio"
                type="date"
                {...form.register("prescricao_inicio")}
              />
              <p className="text-xs text-muted-foreground mt-1">
                D0 do cronograma. As sessões seguintes usam o intervalo de
                cada item.
              </p>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="paciente_alergias">Alergias relatadas</Label>
              <Input
                id="paciente_alergias"
                placeholder="Ex: dipirona, AAS — deixe em branco se não avaliado"
                {...form.register("paciente_alergias")}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Em branco, a folha sai com “ALERGIAS NÃO INFORMADAS” e linha
                para conferência à caneta.
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="observacoes">Observações para a enfermagem</Label>
            <Textarea
              id="observacoes"
              rows={2}
              placeholder="Ex: acesso periférico difícil; paciente ansioso"
              {...form.register("observacoes")}
            />
          </div>

          {protocolSemVia.length > 0 && (
            <p className="text-xs text-muted-foreground border-l-2 border-muted-foreground/40 pl-2">
              {protocolSemVia.length} item(ns) do protocolo sem via de
              administração definida. A folha deduz pelo nome e marca para
              conferência — defina a via em Protocolos para eliminar o aviso.
            </p>
          )}
        </Card>
      )}

      <div className="flex flex-wrap justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/orcamentos")}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="outline"
          disabled={isPending}
          onClick={() => setSubmitAction("save")}
        >
          {isPending && submitAction === "save"
            ? "Salvando..."
            : "Salvar orçamento"}
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          onClick={() => setSubmitAction("save_and_send")}
        >
          {isPending && submitAction === "save_and_send"
            ? "Enviando..."
            : "Salvar e enviar contrato"}
        </Button>
      </div>
    </form>
  );
}
