"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  Clock,
  Copy,
  Download,
  Eye,
  FileSignature,
  FileText,
  RefreshCw,
  Send,
  ShieldCheck,
  Upload,
  XCircle,
} from "lucide-react";

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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Props = {
  propostaId: string;
  documentId: string | null;
};

type SignatureStatus =
  | "signed"
  | "pending_biometric"
  | "rejected"
  | "biometric_rejected"
  | "viewed"
  | "pending";

type ContractStatus = {
  documentId: string | null;
  sentAt: string | null;
  /** null = não foi possível determinar o estado na Autentique. */
  status: SignatureStatus | null;
  signedAt: string | null;
  viewedAt: string | null;
  rejectedAt: string | null;
  rejectedReason: string | null;
  signingLink: string | null;
  hasArchive: boolean;
  /** Anexo do contrato assinado no prontuário da Feegow. */
  feegow?: {
    empresaTemFeegow: boolean;
    pacienteComProntuario: boolean;
    aplicavel: boolean;
    anexadoEm: string | null;
    erro: string | null;
    emAndamento: boolean;
    emDuvida: boolean;
  };
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

/**
 * Estado da assinatura. `status: null` (não consultável) é exibido como
 * tal, nunca como "pendente" — afirmar o estado errado é pior que
 * admitir que não sabemos.
 */
function SignatureBadge({ status }: { status: ContractStatus | null }) {
  switch (status?.status) {
    case "signed":
      return (
        <span className="inline-flex items-center gap-1.5 text-success font-medium">
          <Check className="h-4 w-4" />
          {status.signedAt
            ? `Assinado em ${formatDateTime(status.signedAt)}`
            : "Assinado"}
        </span>
      );
    case "pending_biometric":
      return (
        <span className="inline-flex items-center gap-1.5 text-accent-gold font-medium">
          <ShieldCheck className="h-4 w-4" />
          Assinado — aguardando biometria
        </span>
      );
    case "rejected":
      return (
        <span
          className="inline-flex items-center gap-1.5 text-destructive font-medium"
          title={status.rejectedReason ?? undefined}
        >
          <XCircle className="h-4 w-4" />
          {status.rejectedAt
            ? `Recusado em ${formatDateTime(status.rejectedAt)}`
            : "Recusado pelo paciente"}
        </span>
      );
    case "biometric_rejected":
      return (
        <span className="inline-flex items-center gap-1.5 text-destructive font-medium">
          <XCircle className="h-4 w-4" />
          Biometria recusada
        </span>
      );
    case "viewed":
      return (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Eye className="h-4 w-4" />
          {status.viewedAt
            ? `Visualizado em ${formatDateTime(status.viewedAt)}, não assinado`
            : "Visualizado, não assinado"}
        </span>
      );
    case "pending":
      return (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-4 w-4" />
          Aguardando — ainda não aberto
        </span>
      );
    default:
      return (
        <span className="text-muted-foreground">Não foi possível consultar</span>
      );
  }
}

export function ContractActions({ propostaId, documentId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmingResend, setConfirmingResend] = useState(false);
  const [status, setStatus] = useState<ContractStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(!!documentId);
  const [copied, setCopied] = useState(false);

  // Incrementar recarrega o status (depois de enviar ao prontuário).
  const [statusVersion, setStatusVersion] = useState(0);
  const [sendingFeegow, setSendingFeegow] = useState(false);
  const [confirmingDuplicate, setConfirmingDuplicate] = useState(false);

  useEffect(() => {
    if (!documentId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/contratos/${propostaId}/status`);
        if (!cancelled && res.ok) {
          setStatus((await res.json()) as ContractStatus);
        }
      } catch {
        // Silencioso: a UI já degrada para "não foi possível consultar".
      } finally {
        if (!cancelled) setLoadingStatus(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [propostaId, documentId, statusVersion]);

  /** Anexa o contrato assinado ao prontuário da Feegow (ato explícito). */
  const sendToFeegow = async (confirmarDuplicata = false) => {
    setSendingFeegow(true);
    try {
      const res = await fetch(`/api/contratos/${propostaId}/feegow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmar_duplicata: confirmarDuplicata }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        status?: string;
      };
      if (!res.ok) {
        toast.error(data.error ?? "Falha ao enviar ao prontuário");
      } else {
        toast.success("Contrato assinado anexado ao prontuário da Feegow");
      }
    } catch {
      toast.error("Erro de rede ao enviar ao prontuário");
    } finally {
      setSendingFeegow(false);
      setStatusVersion((v) => v + 1);
    }
  };

  const pdfUrl = `/api/contratos/${propostaId}/pdf`;

  const dispatch = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/contratos/envio-manual", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proposta_id: propostaId }),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          toast.error(err.error ?? "Falha ao enviar contrato");
          return;
        }
        toast.success("Contrato enviado para assinatura");
        router.refresh();
      } catch {
        toast.error("Erro de rede ao enviar contrato");
      }
    });
  };

  const copyLink = async () => {
    if (!status?.signingLink) return;
    try {
      await navigator.clipboard.writeText(status.signingLink);
      setCopied(true);
      toast.success("Link de assinatura copiado");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o link");
    }
  };

  const viewButtons = (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" asChild>
        <a href={pdfUrl} target="_blank" rel="noreferrer">
          <FileText className="h-4 w-4 mr-2" />
          Ver / imprimir
        </a>
      </Button>
      <Button variant="ghost" size="sm" asChild>
        <a href={`${pdfUrl}?download=1`}>
          <Download className="h-4 w-4 mr-2" />
          Baixar PDF
        </a>
      </Button>
    </div>
  );

  if (!documentId) {
    return (
      <div className="space-y-3">
        <Button onClick={dispatch} disabled={isPending}>
          <Send className="h-4 w-4 mr-2" />
          {isPending ? "Enviando..." : "Enviar contrato"}
        </Button>
        {viewButtons}
        <p className="text-xs text-muted-foreground">
          Ainda não enviado — a prévia mostra como o contrato vai sair.
        </p>
      </div>
    );
  }

  const sentAtLabel = status?.sentAt ? formatDateTime(status.sentAt) : null;

  return (
    <div className="space-y-3">
      {viewButtons}

      <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Assinatura</span>
          {loadingStatus ? (
            <span className="text-muted-foreground">Consultando...</span>
          ) : (
            <SignatureBadge status={status} />
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Enviado em</span>
          <span>{sentAtLabel ?? "—"}</span>
        </div>

        {status?.signingLink && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground shrink-0">
              Link de assinatura
            </span>
            <div className="flex items-center gap-1 min-w-0">
              <a
                href={status.signingLink}
                target="_blank"
                rel="noreferrer"
                className="truncate text-primary hover:underline"
              >
                {status.signingLink}
              </a>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={copyLink}
                aria-label="Copiar link de assinatura"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        )}

        {status?.feegow?.empresaTemFeegow && (
          <FeegowRow
            feegow={status.feegow}
            assinado={status.status === "signed"}
            sending={sendingFeegow}
            onSend={() => sendToFeegow(false)}
            onConfirmDuplicate={() => setConfirmingDuplicate(true)}
          />
        )}

        <div className="flex items-center justify-between gap-3 pt-1 border-t">
          <span className="text-muted-foreground">Documento</span>
          <span className="font-mono text-xs break-all">{documentId}</span>
        </div>
      </div>

      <AlertDialog
        open={confirmingDuplicate}
        onOpenChange={setConfirmingDuplicate}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reenviar ao prontuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Um envio anterior começou e não confirmou. O contrato pode já
              estar no prontuário da Feegow, e a Feegow não permite apagar
              anexo. Confira o prontuário do paciente antes de reenviar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                setConfirmingDuplicate(false);
                void sendToFeegow(true);
              }}
            >
              Conferi, reenviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmingResend} onOpenChange={setConfirmingResend}>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={isPending}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {isPending ? "Reenviando..." : "Reenviar"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reenviar contrato?</AlertDialogTitle>
            <AlertDialogDescription>
              Um novo documento será criado na Authentique. O documento
              anterior continua válido até ser cancelado manualmente lá.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                setConfirmingResend(false);
                dispatch();
              }}
            >
              Reenviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * Linha "Prontuário Feegow" do card. O anexo é automático quando o paciente
 * assina (webhook da Autentique); o botão só aparece quando é preciso:
 * falhou, nunca rodou (assinado antes de o webhook existir) ou ficou em
 * dúvida.
 */
function FeegowRow({
  feegow,
  assinado,
  sending,
  onSend,
  onConfirmDuplicate,
}: {
  feegow: NonNullable<ContractStatus["feegow"]>;
  assinado: boolean;
  sending: boolean;
  onSend: () => void;
  onConfirmDuplicate: () => void;
}) {
  const botao = (label: string, onClick: () => void) => (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-7"
      onClick={onClick}
      disabled={sending}
    >
      <Upload className="h-3.5 w-3.5 mr-1.5" />
      {sending ? "Enviando..." : label}
    </Button>
  );

  let conteudo: ReactNode;
  if (!feegow.pacienteComProntuario) {
    conteudo = (
      <span className="text-muted-foreground text-right">
        Paciente sem prontuário na Feegow
      </span>
    );
  } else if (!feegow.aplicavel) {
    conteudo = (
      <span className="text-muted-foreground text-right">
        Autentique não configurada
      </span>
    );
  } else if (feegow.anexadoEm) {
    conteudo = (
      <span className="inline-flex items-center gap-1.5 text-success">
        <Check className="h-4 w-4" />
        Anexado em {formatDateTime(feegow.anexadoEm)}
      </span>
    );
  } else if (feegow.emAndamento) {
    conteudo = <span className="text-muted-foreground">Enviando...</span>;
  } else if (feegow.emDuvida) {
    conteudo = (
      <div className="flex flex-col items-end gap-1 text-right">
        <span className="text-warning">Envio não confirmado</span>
        {botao("Reenviar", onConfirmDuplicate)}
      </div>
    );
  } else if (feegow.erro) {
    conteudo = (
      <div className="flex flex-col items-end gap-1 text-right min-w-0">
        <span className="text-destructive break-words" title={feegow.erro}>
          Falhou: {feegow.erro}
        </span>
        {botao("Tentar de novo", onSend)}
      </div>
    );
  } else if (assinado) {
    conteudo = (
      <div className="flex flex-col items-end gap-1 text-right">
        <span className="text-muted-foreground">Ainda não anexado</span>
        {botao("Enviar ao prontuário", onSend)}
      </div>
    );
  } else {
    conteudo = (
      <span className="text-muted-foreground text-right">
        Anexado automaticamente quando o paciente assinar
      </span>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground shrink-0">Prontuário Feegow</span>
      {conteudo}
    </div>
  );
}

export function ContractIcon() {
  return <FileSignature className="h-5 w-5 text-accent-gold" />;
}
