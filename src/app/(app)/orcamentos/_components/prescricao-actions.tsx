"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, ClipboardList, Eye, RefreshCw, Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Props = {
  propostaId: string;
  geradaEm: string | null;
  feegowEm: string | null;
  erro: string | null;
  revisao: number;
  inicio: string | null;
  temFeegow: boolean;
  pacienteManual: boolean;
};

type GerarResposta = {
  ok?: boolean;
  error?: string;
  feegow?: string;
  revisao?: number;
  total_sessoes?: number;
  inicio?: string;
  ultima_data?: string;
  avisos?: Array<{ campo: string; mensagem: string }>;
};

function hojeISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function brData(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * Card do cronograma de aplicações no detalhe do orçamento.
 *
 * Cópia estrutural de `<ContractActions>` — useTransition + fetch + toast +
 * router.refresh(). Quatro estados: não gerada, enviada, pendente/falhou,
 * e sem-Feegow (empresa sem token ou paciente digitado à mão).
 */
export function PrescricaoActions({
  propostaId,
  geradaEm,
  feegowEm,
  erro,
  revisao,
  inicio,
  temFeegow,
  pacienteManual,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dataInicio, setDataInicio] = useState(inicio ?? hojeISO());

  const podeEnviar = temFeegow && !pacienteManual;

  const gerar = (forcar: boolean) => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/prescricoes/gerar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            proposta_id: propostaId,
            inicio: dataInicio,
            forcar,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as GerarResposta;

        if (!res.ok) {
          toast.error(data.error ?? "Falha ao gerar o cronograma", {
            duration: 8000,
          });
          router.refresh();
          return;
        }

        const msgs: Record<string, string> = {
          enviado: "Cronograma anexado ao prontuário",
          skipped_unchanged: "Nada mudou — o prontuário já tem esta versão",
          skipped_sem_token: "Cronograma gerado (empresa sem Feegow configurada)",
          skipped_manual: "Cronograma gerado (paciente sem prontuário na Feegow)",
          skipped_pdf_disabled: "Cronograma registrado (PDF desabilitado)",
        };
        toast.success(msgs[data.feegow ?? ""] ?? "Cronograma gerado");

        // Avisos não bloqueiam, mas precisam ser vistos — alergias ausentes
        // e via deduzida são exatamente o que a equipe deve conferir.
        if (data.avisos?.length) {
          toast.warning(
            `${data.avisos.length} ponto(s) para conferir: ${data.avisos
              .slice(0, 3)
              .map((a) => a.mensagem)
              .join(" ")}`,
            { duration: 10000 },
          );
        }
        router.refresh();
      } catch {
        toast.error("Erro de rede ao gerar o cronograma");
      }
    });
  };

  const verPdf = () =>
    window.open(`/api/prescricoes/${propostaId}/pdf`, "_blank");

  // ── Nunca gerada ─────────────────────────────────────────────────────
  if (!geradaEm) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="presc-inicio" className="text-xs">
              Início do tratamento
            </Label>
            <Input
              id="presc-inicio"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-[160px]"
            />
          </div>
          <Button variant="outline" onClick={verPdf} disabled={isPending}>
            <Eye className="h-4 w-4 mr-2" />
            Visualizar
          </Button>
          <Button onClick={() => gerar(false)} disabled={isPending}>
            <Send className="h-4 w-4 mr-2" />
            {isPending
              ? "Gerando..."
              : podeEnviar
                ? "Gerar e enviar ao prontuário"
                : "Gerar cronograma"}
          </Button>
        </div>
        {!podeEnviar && (
          <p className="text-xs text-muted-foreground">
            {pacienteManual
              ? "Paciente digitado à mão não tem prontuário na Feegow — o cronograma fica disponível só para impressão."
              : "Empresa sem token Feegow — o cronograma fica disponível só para impressão."}
          </p>
        )}
      </div>
    );
  }

  const falhou = !feegowEm && podeEnviar;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {feegowEm ? (
          <Badge className="bg-success text-success-foreground hover:bg-success">
            Enviado ao prontuário em {brData(feegowEm)}
          </Badge>
        ) : falhou ? (
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Não anexado ao prontuário
          </Badge>
        ) : (
          <Badge variant="secondary">Gerado em {brData(geradaEm)}</Badge>
        )}
        <span className="text-sm text-muted-foreground">Revisão {revisao}</span>
      </div>

      {falhou && erro && (
        // Erro persistido no banco: não some sozinho no refresh, diferente
        // do webhook Authentique, que engole a falha do upload.
        <p className="text-xs text-destructive border border-destructive/30 bg-destructive/5 rounded-md p-2">
          {erro}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={verPdf} disabled={isPending}>
          <Eye className="h-4 w-4 mr-2" />
          Ver PDF
        </Button>

        {falhou && (
          <Button size="sm" onClick={() => gerar(false)} disabled={isPending}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {isPending ? "Reenviando..." : "Tentar novamente"}
          </Button>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={isPending}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Regerar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Regerar o cronograma?</AlertDialogTitle>
              <AlertDialogDescription>
                Se o conteúdo tiver mudado, será emitida a revisão{" "}
                {revisao + 1} e um novo anexo irá para o prontuário.{" "}
                <strong>
                  A Feegow não permite apagar nem substituir anexos
                </strong>
                , então a versão anterior permanece no prontuário. O documento
                impresso avisa qual revisão substitui as anteriores — descarte
                as cópias antigas em papel.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  gerar(true);
                }}
              >
                Regerar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export function PrescricaoIcon() {
  return <ClipboardList className="h-5 w-5 text-success" />;
}
