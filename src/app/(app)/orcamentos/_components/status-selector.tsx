"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const STATUS_OPTIONS = [
  { id: 1, label: "Aguardando aprovação do cliente", key: "enviado" },
  { id: 2, label: "Aprovada pelo cliente", key: "aprovado" },
  { id: 3, label: "Rejeitada pelo cliente", key: "rejeitado" },
  { id: 4, label: "Aguardando aprovação de financiamento", key: "enviado" },
  { id: 5, label: "Executada", key: "aprovado" },
] as const;

const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
  pending: "Pendente",
  completed: "Concluído",
};

type Props = {
  propostaId: string;
  initialStatus: string | null;
  initialStatusId: number | null;
};

/**
 * Status changer da proposta. Mostra Select editável quando o status
 * está em rascunho/pendente, ou um Badge read-only quando já avançou
 * (espelha o comportamento do Vite legacy).
 *
 * Chama `PATCH /api/propostas/:id/status` (já existe), que atualiza o
 * Feegow + local quando aplicável.
 */
export function StatusSelector({
  propostaId,
  initialStatus,
  initialStatusId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(initialStatus);
  const [statusId, setStatusId] = useState<number | null>(initialStatusId);

  const isEditable = !status || status === "rascunho" || status === "pending";

  const handleChange = (value: string) => {
    const newStatusId = Number(value);
    const option = STATUS_OPTIONS.find((s) => s.id === newStatusId);
    if (!option) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/propostas/${propostaId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status_id: newStatusId,
            status: option.key,
          }),
        });
        if (!res.ok) {
          const err = (await res
            .json()
            .catch(() => ({}))) as { error?: string };
          toast.error(err.error ?? "Falha ao atualizar status");
          return;
        }
        setStatus(option.key);
        setStatusId(newStatusId);
        toast.success("Status atualizado");
        router.refresh();
      } catch {
        toast.error("Erro de rede ao atualizar status");
      }
    });
  };

  if (!isEditable) {
    return (
      <Badge className="text-sm">
        {STATUS_LABEL[status ?? ""] ?? status ?? "—"}
      </Badge>
    );
  }

  return (
    <Select
      value={statusId?.toString() ?? ""}
      onValueChange={handleChange}
      disabled={isPending}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Selecionar status..." />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((option) => (
          <SelectItem key={option.id} value={option.id.toString()}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
