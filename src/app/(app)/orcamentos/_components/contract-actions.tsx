"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  Clock,
  Copy,
  Download,
  FileSignature,
  FileText,
  RefreshCw,
  Send,
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

type ContractStatus = {
  documentId: string | null;
  sentAt: string | null;
  /** Carimbo do webhook. null nos assinados antes da coluna existir. */
  signedAt: string | null;
  signingLink: string | null;
  /** null = não foi possível determinar o estado na Autentique. */
  signed: boolean | null;
  /** Algum signatário recusou o documento. */
  rejected: boolean;
  hasArchive: boolean;
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function ContractActions({ propostaId, documentId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmingResend, setConfirmingResend] = useState(false);
  const [status, setStatus] = useState<ContractStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(!!documentId);
  const [copied, setCopied] = useState(false);

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
  }, [propostaId, documentId]);

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
          ) : status?.rejected ? (
            <span className="inline-flex items-center gap-1.5 text-destructive font-medium">
              <XCircle className="h-4 w-4" />
              Recusado pelo paciente
            </span>
          ) : status?.signed === true ? (
            <span className="inline-flex items-center gap-1.5 text-success font-medium">
              <Check className="h-4 w-4" />
              {status.signedAt
                ? `Assinado em ${formatDateTime(status.signedAt)}`
                : "Assinado"}
            </span>
          ) : status?.signed === false ? (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-4 w-4" />
              Aguardando assinatura
            </span>
          ) : (
            <span className="text-muted-foreground">
              Não foi possível consultar
            </span>
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

        <div className="flex items-center justify-between gap-3 pt-1 border-t">
          <span className="text-muted-foreground">Documento</span>
          <span className="font-mono text-xs break-all">{documentId}</span>
        </div>
      </div>

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

export function ContractIcon() {
  return <FileSignature className="h-5 w-5 text-accent-gold" />;
}
