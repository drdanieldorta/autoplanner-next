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
import type { PatientSource } from "@/lib/orcamento/patient-source";
import type { Via } from "@/lib/prescricao/enums";
import type { AjusteItem, PrescricaoAjustes } from "@/lib/prescricao/types";
import { cn } from "@/lib/utils";
import { createOrcamentoSchema } from "@/lib/validations";

import {
  ClinicalGrid,
  type ClinicalPatch,
  type ClinicalRow,
} from "../../_components/clinical-grid";
import {
  DocumentosSelector,
  type ContractOption,
} from "../../_components/documentos-selector";
import { PatientSearchCombobox } from "./patient-search-combobox";

import type {
  OrcamentoPatientOption,
  OrcamentoProcedureOption,
  OrcamentoProfessionalOption,
} from "@/lib/services/orcamento-form-data";

type FormValues = z.infer<typeof createOrcamentoSchema>;

type ProtocolItem = {
  /** `protocol_items.id` — é a CHAVE do delta em `prescricao_ajustes`. */
  id: string;
  procedure_id: string;
  procedure_name: string;
  quantity: number;
  interval_days: number;
  value_cents: number;
  discount_percent: number;
  /** Camada clínica PROPOSTA pelo protocolo — alimenta o cronograma. */
  via: Via | null;
  dose: string | null;
  inicio_dias: number;
  cuidados: string | null;
};

type ProtocolOptionDocs = {
  /** Documentos que o protocolo propõe, na ordem definida nele. */
  contractIds: string[];
  incluirTcle: boolean;
};

/** Prefixo que separa linha de avulso de linha de protocolo na grade. */
const EXTRA = "extra#";

type ProtocolOption = ProtocolOptionDocs & {
  id: string;
  name: string;
  total_value_cents: number;
  items: ProtocolItem[];
};

type Props = {
  /** Procedimentos e profissionais vêm da Feegow (a empresa tem a chave). */
  hasFeegow: boolean;
  /**
   * Origem do paciente, já resolvida no servidor (Configurações + chaves).
   * Independe de `hasFeegow`: uma empresa com Feegow pode puxar o paciente
   * do CRM ou digitá-lo — e aí o orçamento não vira proposta na Feegow.
   */
  patientSource: PatientSource;
  feegowError: string | null;
  /** Origem CRM e o CRM respondeu: `patients` é a 1ª página de contatos "Paciente". */
  hasCrm: boolean;
  crmError: string | null;
  crmHasMore: boolean;
  /** Origem Feegow: `patients` é a 1ª página; o resto vem da busca no servidor. */
  feegowHasMore: boolean;
  procedures: OrcamentoProcedureOption[];
  patients: OrcamentoPatientOption[];
  professionals: OrcamentoProfessionalOption[];
  protocols: ProtocolOption[];
  contracts: ContractOption[];
};

export function OrcamentoForm({
  hasFeegow,
  patientSource,
  feegowError,
  hasCrm,
  crmError,
  crmHasMore,
  feegowHasMore,
  procedures,
  patients,
  professionals,
  protocols,
  contracts,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Itens do protocolo base — derivados do protocolo selecionado (já vêm
  // inline em `protocols`). Comercialmente não são editáveis aqui; a camada
  // clínica deles é, via delta (abaixo).
  const [protocolItems, setProtocolItems] = useState<ProtocolItem[]>([]);

  // Camada clínica ajustada PARA ESTE PACIENTE. Mesmo formato e mesma chave
  // (`protocol_items.id`) que `/orcamentos/[id]/cronograma` grava depois — é
  // deliberadamente o mesmo delta, não um mecanismo paralelo: o protocolo
  // continua sendo o modelo e nunca é tocado por ajuste de paciente.
  const [ajustes, setAjustes] = useState<PrescricaoAjustes>({});

  /** Valor efetivo de um item do protocolo: o delta vence, senão o protocolo. */
  const efetivo = (item: ProtocolItem) => {
    const aj = ajustes[item.id];
    return {
      via: aj?.via ?? item.via,
      dose: aj?.dose ?? item.dose,
      cuidados: aj?.cuidados ?? item.cuidados,
      inicio_dias: aj?.inicio_dias ?? item.inicio_dias,
    };
  };

  // Estado do "adicionar procedimento extra" antes de fazer append.
  const [extraProcedureId, setExtraProcedureId] = useState("");
  const [extraProcedureName, setExtraProcedureName] = useState("");
  const [extraQuantity, setExtraQuantity] = useState(1);
  const [extraInterval, setExtraInterval] = useState(0);
  const [extraValueInput, setExtraValueInput] = useState("");

  // Inputs com máscara — guardamos a string formatada localmente e apenas
  // o número em centavos no form state.
  const [installmentValueInput, setInstallmentValueInput] = useState("");

  const [professionalPopoverOpen, setProfessionalPopoverOpen] = useState(false);

  // Paciente escolhido no dropdown. A busca é do servidor (as duas origens
  // são grandes demais para filtrar no navegador), então o escolhido pode
  // não estar em `patients` — por isso fica guardado aqui, não derivado.
  // Feegow: o paciente É o valor (`paciente_id` da Feegow vai no payload).
  const [feegowPatient, setFeegowPatient] =
    useState<OrcamentoPatientOption | null>(null);
  // CRM: `crmContact` é a ORIGEM do que está nos inputs, não o valor: editar
  // um input depois não a apaga, e o payload segue `paciente_id: "manual"`.
  const [crmContact, setCrmContact] = useState<OrcamentoPatientOption | null>(
    null,
  );

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
      // Nada pré-marcado: selecionar documento é ato explícito. Escolher um
      // protocolo traz a seleção dele.
      contract_ids: [],
      incluir_tcle_padrao: false,
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
  const professionalId = form.watch("professional_id");
  const totalDiscount = form.watch("discount_percent");
  const paymentMethod = form.watch("payment_method");
  const customPaymentMethod = form.watch("custom_payment_method");
  const installments = form.watch("installments") ?? 1;
  const prescricaoInicio = form.watch("prescricao_inicio");
  const contractIds = form.watch("contract_ids");
  const incluirTcle = form.watch("incluir_tcle_padrao");

  // Paciente fora da Feegow (CRM ou digitado): CPF e telefone são
  // obrigatórios (ver `onSubmit`). O destaque
  // só acende quando faz sentido: depois de escolher um contato do CRM (o
  // que faltou não veio de lá) ou depois de uma tentativa de salvar — um
  // formulário recém-aberto não nasce vermelho.
  const patientCpf = form.watch("patient_cpf") ?? "";
  const patientPhone = form.watch("patient_phone") ?? "";
  const pacienteDaFeegow = patientSource === "feegow";
  const showMissing =
    !pacienteDaFeegow &&
    (crmContact !== null || form.formState.submitCount > 0);
  const cpfMissing =
    showMissing && patientCpf.replace(/\D/g, "").length !== 11;
  const phoneMissing =
    showMissing && patientPhone.replace(/\D/g, "").length < 10;

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
    setFeegowPatient(patient);

    // CPF não vem em /patient/list — buscar pontualmente via /patient/search.
    // Falha silenciosa: se Feegow não responder, o user pode digitar manualmente
    // no campo CPF (que continua editável).
    if (pacienteDaFeegow && patient.id && patient.id !== "manual") {
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

  const onSelectCrmContact = (contact: OrcamentoPatientOption) => {
    setCrmContact(contact);
    form.setValue("patient_id", contact.id, { shouldValidate: true });
    form.setValue("patient_name", contact.name, { shouldValidate: true });
    // O que o CRM não trouxe fica em branco e destacado — o usuário completa
    // nos inputs abaixo, que continuam editáveis.
    form.setValue("patient_cpf", contact.cpf ? formatCPF(contact.cpf) : "");
    form.setValue("patient_phone", contact.phone);
    form.setValue("patient_email", contact.email);
    form.setValue("patient_birth", contact.birth);
    form.setValue("patient_neighborhood", "");
  };

  const onManualPatient = () => {
    setCrmContact(null);
    form.setValue("patient_id", "");
    form.setValue("patient_name", "");
    form.setValue("patient_cpf", "");
    form.setValue("patient_phone", "");
    form.setValue("patient_email", "");
    form.setValue("patient_birth", "");
    form.setValue("patient_neighborhood", "");
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
    // Trocar de protocolo invalida o delta inteiro: as chaves são ids de
    // `protocol_items` do protocolo ANTERIOR, e mantê-las produziria ajustes
    // órfãos — invisíveis na tela, visíveis só como aviso na folha.
    setAjustes({});
    if (id === "none") {
      form.setValue("protocol_id", null);
      form.setValue("protocol_name", null);
      setProtocolItems([]);
      form.setValue("contract_ids", []);
      form.setValue("incluir_tcle_padrao", false);
      return;
    }
    const protocol = protocols.find((p) => p.id === id);
    if (!protocol) return;
    form.setValue("protocol_id", id);
    form.setValue("protocol_name", protocol.name);
    setProtocolItems(protocol.items);
    // Protocolo propõe, orçamento dispõe: a seleção dele entra marcada e
    // segue editável abaixo.
    form.setValue("contract_ids", protocol.contractIds);
    form.setValue("incluir_tcle_padrao", protocol.incluirTcle);
  };

  /**
   * Aplica um patch da grade clínica.
   *
   * Item de protocolo → grava no delta. Avulso → grava no próprio item, que
   * viaja em `procedimentos_adicionais`: sem linha em `protocol_items`, ele
   * não tem modelo do qual desviar.
   */
  const onPatchClinico = (chave: string, patch: ClinicalPatch) => {
    if (chave.startsWith(EXTRA)) {
      const index = Number(chave.slice(EXTRA.length));
      for (const [campo, valor] of Object.entries(patch)) {
        form.setValue(
          `additional_procedures.${index}.${campo as keyof ClinicalPatch}`,
          valor as never,
          { shouldDirty: true },
        );
      }
      return;
    }

    const item = protocolItems.find((p) => p.id === chave);
    if (!item) return;

    setAjustes((prev) => {
      const atual: AjusteItem = { ...(prev[chave] ?? {}) };

      // Campo vazio significa "sem override" — e não "vazio neste paciente".
      // É o que `projetarPlano` já faz (`doseAjustada || fonte.dose`): apagar
      // o texto devolve o valor do protocolo, não deixa o campo em branco.
      // Nada de `.trim()` no que é gravado, senão não dá para digitar espaço.
      if ("via" in patch) {
        if (patch.via) atual.via = patch.via;
        else delete atual.via;
      }
      if ("dose" in patch) {
        if ((patch.dose ?? "").trim()) atual.dose = patch.dose;
        else delete atual.dose;
      }
      if ("cuidados" in patch) {
        if ((patch.cuidados ?? "").trim()) atual.cuidados = patch.cuidados;
        else delete atual.cuidados;
      }
      if ("inicio_dias" in patch) atual.inicio_dias = patch.inicio_dias ?? 0;

      // Poda: valor igual ao do protocolo não é ajuste. Sem isso o selo
      // "ajustado" gruda na linha depois de um ida-e-volta e deixa de
      // significar alguma coisa.
      if ((atual.via ?? null) === item.via) delete atual.via;
      if ((atual.dose ?? "").trim() === (item.dose ?? "").trim())
        delete atual.dose;
      if ((atual.cuidados ?? "").trim() === (item.cuidados ?? "").trim())
        delete atual.cuidados;
      if (atual.inicio_dias === item.inicio_dias) delete atual.inicio_dias;

      const next = { ...prev };
      if (Object.keys(atual).length === 0) delete next[chave];
      else next[chave] = atual;
      return next;
    });
  };

  const onResetarClinico = (chave: string) =>
    setAjustes((prev) => {
      const next = { ...prev };
      delete next[chave];
      return next;
    });

  // Protocolo e avulsos na MESMA grade: para a enfermagem eles são a mesma
  // coisa, e separá-los aqui esconderia metade do plano.
  const linhasClinicas: ClinicalRow[] = [
    ...protocolItems.map((item) => {
      const e = efetivo(item);
      return {
        chave: item.id,
        nome: item.procedure_name,
        via: e.via,
        dose: e.dose,
        inicio_dias: e.inicio_dias,
        cuidados: e.cuidados,
        etiqueta: "Protocolo",
        ajustado: Boolean(ajustes[item.id]),
      };
    }),
    ...additionalProcedures.map((extra, index) => ({
      chave: `${EXTRA}${index}`,
      nome: extra?.procedure_name ?? "",
      via: (extra?.via as Via | null) ?? null,
      dose: extra?.dose ?? null,
      inicio_dias: extra?.inicio_dias ?? 0,
      cuidados: extra?.cuidados ?? null,
      etiqueta: "Extra",
    })),
  ];

  // Conta sobre o valor EFETIVO, não sobre o do protocolo: definir a via aqui
  // tem que apagar o aviso. (Antes esta contagem lia um campo que nunca era
  // carregado, então acusava todo item de todo protocolo.)
  const semVia = linhasClinicas.filter((l) => !l.via).length;

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
        // Camada clínica em branco — preenchida na grade abaixo, opcional.
        via: null,
        dose: null,
        inicio_dias: 0,
        cuidados: null,
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
        via: null,
        dose: null,
        inicio_dias: 0,
        cuidados: null,
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

    // Paciente fora da Feegow (digitado ou do CRM), CPF e telefone valem para os
    // DOIS botões (decisão 2026-09-22): não existe tela para completar
    // depois, e um rascunho sem CPF viraria beco sem saída na hora de
    // enviar o contrato. `envio-manual` recusa no servidor também.
    //
    // Lê de `values`, não de `cpfMissing`/`phoneMissing`: esses dois vêm do
    // render anterior ao clique, quando `submitCount` ainda era 0 — o
    // destaque acende depois, nesta mesma tentativa.
    if (!pacienteDaFeegow) {
      const cpfOk =
        (values.patient_cpf ?? "").replace(/\D/g, "").length === 11;
      const phoneOk =
        (values.patient_phone ?? "").replace(/\D/g, "").length >= 10;
      if (!cpfOk || !phoneOk) {
        toast.error(
          "CPF e telefone do paciente são obrigatórios para o contrato",
        );
        return;
      }
    }

    // Salvar sem documento é legítimo (rascunho); ENVIAR não é. Barrar aqui
    // evita criar o orçamento e só então descobrir, no encadeamento do
    // envio, que não havia o que assinar — hoje não há tela para corrigir a
    // seleção depois que o orçamento existe.
    if (
      submitAction === "save_and_send" &&
      values.contract_ids.length === 0 &&
      !values.incluir_tcle_padrao
    ) {
      toast.error(
        "Selecione ao menos um documento para o paciente assinar, ou marque o contrato padrão do sistema.",
      );
      return;
    }

    // Combina procedimentos do protocolo com os extras antes de enviar.
    // O endpoint exige procedimentos.length >= 1.
    //
    // Só os 6 campos comerciais: esta lista alimenta a proposta da Feegow,
    // que não tem onde guardar via, dose ou cuidados. A camada clínica vai
    // separada — no delta (protocolo) e dentro dos avulsos.
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
      // identidade — fora da Feegow, ids são literais "manual" (parity com
      // Vite). O paciente decide se o orçamento vira proposta na Feegow: a
      // rota só cria lá quando recebe um `paciente_id` da Feegow.
      paciente_id: pacienteDaFeegow ? values.patient_id : "manual",
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
      contract_ids: values.contract_ids,
      incluir_tcle_padrao: values.incluir_tcle_padrao,
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
      prescricao_ajustes: ajustes,
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

      // Terceira chamada: GERA o cronograma da enfermagem — e só isso.
      //
      // O envio ao prontuário NÃO acontece aqui (decisão 2026-07-31). Anexar
      // na Feegow é irreversível (não há delete nem replace de anexo), então
      // precisa de um ato humano depois de alguém ter olhado o documento. O
      // botão "Enviar ao prontuário" vive na tela de detalhe do orçamento.
      //
      // Falha aqui NUNCA derruba o que já deu certo — o orçamento existe e o
      // contrato já foi enviado. Mesmo tratamento que a falha do contrato
      // recebe acima.
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
            `Contrato enviado, mas o cronograma de enfermagem não foi gerado: ${
              err.error ?? "gere pela tela de detalhes"
            }`,
            { duration: 8000 },
          );
        } else {
          toast.info("Cronograma de enfermagem gerado — revise e envie ao prontuário.", {
            duration: 7000,
          });
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

      {crmError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Não foi possível carregar os pacientes do CRM: {crmError}.
            Preencha os dados do paciente manualmente.
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
            {hasFeegow && !pacienteDaFeegow && (
              <p className="text-xs text-muted-foreground mt-1">
                {patientSource === "crm"
                  ? "Paciente do CRM, conforme Configurações."
                  : "Paciente digitado, conforme Configurações."}{" "}
                Este orçamento não vira proposta na Feegow.
              </p>
            )}
            {pacienteDaFeegow ? (
              <PatientSearchCombobox
                endpoint="/api/feegow/pacientes"
                initialItems={patients}
                initialHasMore={feegowHasMore}
                selected={feegowPatient}
                onSelect={onSelectPatient}
                placeholder="Selecione um paciente"
                searchPlaceholder="Nome, e-mail ou telefone..."
                emptyText="Nenhum paciente encontrado na Feegow."
                subtitle={(p) => p.email || p.phone || "sem e-mail"}
                className="mt-1"
              />
            ) : (
              <div className="space-y-2 mt-1">
                {hasCrm && (
                  <PatientSearchCombobox
                    endpoint="/api/crm/pacientes"
                    initialItems={patients}
                    initialHasMore={crmHasMore}
                    selected={crmContact}
                    onSelect={onSelectCrmContact}
                    placeholder="Buscar paciente no CRM"
                    searchPlaceholder="Nome, telefone ou e-mail..."
                    emptyText="Nenhum paciente encontrado no CRM."
                    subtitle={(p) =>
                      `CRM · ${p.phone || p.email || "sem telefone"}`
                    }
                    manual={{
                      label: "Não está na lista? Preencher manualmente",
                      onSelect: onManualPatient,
                    }}
                  />
                )}
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
                  value={patientCpf}
                  onChange={(e) =>
                    form.setValue("patient_cpf", formatCPF(e.target.value))
                  }
                  maxLength={14}
                  aria-invalid={cpfMissing || undefined}
                  className={cn(
                    cpfMissing &&
                      "border-destructive focus-visible:ring-destructive",
                  )}
                />
                {cpfMissing && (
                  <p className="text-xs text-destructive">
                    CPF obrigatório para o contrato
                    {crmContact ? " · não veio do CRM, informe manualmente" : ""}
                    .
                  </p>
                )}
                <Input
                  placeholder="Telefone do paciente Ex: (11) 99999-9999"
                  value={patientPhone}
                  onChange={(e) =>
                    form.setValue(
                      "patient_phone",
                      formatPhoneNumber(e.target.value),
                    )
                  }
                  maxLength={15}
                  aria-invalid={phoneMissing || undefined}
                  className={cn(
                    phoneMissing &&
                      "border-destructive focus-visible:ring-destructive",
                  )}
                />
                {phoneMissing && (
                  <p className="text-xs text-destructive">
                    Telefone obrigatório para a assinatura via WhatsApp
                    {crmContact ? " · não veio do CRM, informe manualmente" : ""}
                    .
                  </p>
                )}
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

          {/* Documentos que o paciente assina */}
          <div className="pt-4 border-t">
            <Label className="text-sm font-medium text-muted-foreground">
              Documentos para assinatura
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-2">
              {protocolId
                ? "Veio do protocolo selecionado. Ajustar aqui não altera o protocolo."
                : "Escolha o que este paciente vai assinar."}
            </p>
            <DocumentosSelector
              idPrefix="orc"
              contracts={contracts}
              selecionados={contractIds}
              incluirTcle={incluirTcle}
              onChangeSelecionados={(ids) =>
                form.setValue("contract_ids", ids, { shouldDirty: true })
              }
              onChangeIncluirTcle={(v) =>
                form.setValue("incluir_tcle_padrao", v, { shouldDirty: true })
              }
            />
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
            <Label htmlFor="observacoes">
              Observações gerais para a enfermagem
            </Label>
            <Textarea
              id="observacoes"
              rows={2}
              placeholder="Ex: acesso periférico difícil; paciente ansioso"
              {...form.register("observacoes")}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Valem para a folha inteira. Observação de um procedimento
              específico vai na linha dele, abaixo.
            </p>
          </div>

          <div className="border-t pt-4 space-y-3">
            <div>
              <h3 className="text-sm font-semibold">
                Camada clínica deste paciente
              </h3>
              <p className="text-sm text-muted-foreground">
                Vem preenchida do protocolo e pode ser ajustada aqui — o
                protocolo não é alterado. Tudo opcional; o que ficar em branco
                não é impresso.
              </p>
            </div>

            <ClinicalGrid
              itens={linhasClinicas}
              inicio={prescricaoInicio}
              onChange={onPatchClinico}
              onResetar={onResetarClinico}
            />
          </div>

          {semVia > 0 && (
            <p className="text-xs text-muted-foreground border-l-2 border-muted-foreground/40 pl-2">
              {semVia === 1
                ? "1 procedimento sem via de administração definida."
                : `${semVia} procedimentos sem via de administração definida.`}{" "}
              A folha deduz pelo nome e marca para conferência — defina a via
              acima para eliminar o aviso.
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
