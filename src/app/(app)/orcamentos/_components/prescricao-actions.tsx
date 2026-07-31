"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Eye,
  Pencil,
  Send,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = {
  propostaId: string;
  geradaEm: string | null;
  feegowEm: string | null;
  erro: string | null;
  revisao: number;
  /** Hash do snapshot atual vs. hash da última revisão anexada. */
  pendenteEnvio: boolean;
  jaEnviada: boolean;
  temFeegow: boolean;
  pacienteManual: boolean;
};

function brData(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * Card do cronograma no detalhe do orçamento.
 *
 * Gerar e ENVIAR são atos distintos (decisão 2026-07-31): o PDF nasce junto
 * com o contrato, mas anexar ao prontuário é irreversível — a Feegow não
 * expõe delete nem replace — e por isso exige clique deliberado, depois de
 * revisar.
 *
 * Consequência para os estados: "gerada e não enviada" é o estado NORMAL de
 * repouso, não um erro. Vermelho fica reservado para falha real de envio.
 */
export function PrescricaoActions({
  propostaId,
  geradaEm,
  feegowEm,
  erro,
  revisao,
  pendenteEnvio,
  jaEnviada,
  temFeegow,
  pacienteManual,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmando, setConfirmando] = useState(false);
  const [duplicata, setDuplicata] = useState<string | null>(null);

  const podeEnviar = temFeegow && !pacienteManual;

  const gerar = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/prescricoes/gerar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proposta_id: propostaId }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          avisos?: Array<{ mensagem: string }>;
        };
        if (!res.ok) {
          toast.error(data.error ?? "Falha ao gerar o cronograma");
          return;
        }
        toast.success("Cronograma gerado");
        if (data.avisos?.length) {
          toast.warning(
            `${data.avisos.length} ponto(s) para conferir: ${data.avisos
              .slice(0, 2)
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

  const enviar = (confirmarDuplicata: boolean) => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/prescricoes/enviar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            proposta_id: propostaId,
            confirmar_duplicata: confirmarDuplicata,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          feegow?: string;
          revisao?: number;
        };

        if (res.status === 409 && data.feegow === "envio_em_andamento") {
          setDuplicata(data.error ?? null);
          return;
        }
        if (!res.ok) {
          toast.error(data.error ?? "Falha ao anexar ao prontuário", {
            duration: 9000,
          });
          router.refresh();
          return;
        }
        toast.success(
          data.feegow === "skipped_unchanged"
            ? "O prontuário já tem esta versão"
            : `Anexado ao prontuário${data.revisao ? ` (revisão ${data.revisao})` : ""}`,
        );
        router.refresh();
      } catch {
        toast.error("Erro de rede ao anexar ao prontuário");
      }
    });
  };

  const verPdf = () =>
    window.open(`/api/prescricoes/${propostaId}/pdf`, "_blank");

  const falhou = Boolean(erro) && pendenteEnvio;

  return (
    <div className="space-y-3">
      {/* ── Estado ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {!geradaEm ? (
          <Badge variant="outline">Não gerada</Badge>
        ) : falhou ? (
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Falha ao anexar
          </Badge>
        ) : jaEnviada && !pendenteEnvio ? (
          <Badge className="bg-success text-success-foreground hover:bg-success">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            No prontuário desde {brData(feegowEm)}
          </Badge>
        ) : jaEnviada && pendenteEnvio ? (
          <Badge variant="secondary">
            Alterada — revisão {revisao + 1} ainda não enviada
          </Badge>
        ) : (
          <Badge variant="secondary">Pronta para revisão</Badge>
        )}
        {jaEnviada && (
          <span className="text-sm text-muted-foreground">
            Revisão {revisao}
          </span>
        )}
      </div>

      {falhou && erro && (
        <p className="text-xs text-destructive border border-destructive/30 bg-destructive/5 rounded-md p-2">
          {erro}
        </p>
      )}

      {/* ── Ações ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {!geradaEm ? (
          <Button size="sm" onClick={gerar} disabled={isPending}>
            {isPending ? "Gerando..." : "Gerar cronograma"}
          </Button>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={verPdf}>
              <Eye className="h-4 w-4 mr-2" />
              Ver PDF
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/orcamentos/${propostaId}/cronograma`}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Link>
            </Button>
            {podeEnviar && (
              <Button
                size="sm"
                disabled={isPending || (jaEnviada && !pendenteEnvio)}
                onClick={() => setConfirmando(true)}
              >
                <Send className="h-4 w-4 mr-2" />
                {isPending
                  ? "Enviando..."
                  : jaEnviada
                    ? `Enviar revisão ${revisao + 1}`
                    : "Enviar ao prontuário"}
              </Button>
            )}
          </>
        )}
      </div>

      {!podeEnviar && geradaEm && (
        <p className="text-xs text-muted-foreground">
          {pacienteManual
            ? "Paciente digitado à mão não tem prontuário na Feegow — use o PDF para impressão."
            : "Empresa sem token Feegow — use o PDF para impressão."}
        </p>
      )}

      {/* ── Confirmação de envio ─────────────────────────────────────── */}
      <AlertDialog open={confirmando} onOpenChange={setConfirmando}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Anexar ao prontuário do paciente?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Confira o PDF antes de continuar.{" "}
              <strong>
                A Feegow não permite apagar nem substituir um anexo
              </strong>
              , então este documento fica permanentemente no prontuário.
              {jaEnviada
                ? ` A revisão ${revisao} continuará lá; o novo documento avisa em destaque que a substitui.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                setConfirmando(false);
                enviar(false);
              }}
            >
              Anexar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Possível duplicata ───────────────────────────────────────── */}
      <AlertDialog
        open={Boolean(duplicata)}
        onOpenChange={(o) => !o && setDuplicata(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pode já estar no prontuário</AlertDialogTitle>
            <AlertDialogDescription>
              {duplicata} Se você enviar de novo e o anexo já existir, ficarão
              duas cópias — e não há como apagar nenhuma.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vou conferir antes</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                setDuplicata(null);
                enviar(true);
              }}
            >
              Enviar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function PrescricaoIcon() {
  return <ClipboardList className="h-5 w-5 text-success" />;
}
