"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileSignature, RefreshCw, Send } from "lucide-react";

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

export function ContractActions({ propostaId, documentId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmingResend, setConfirmingResend] = useState(false);

  const dispatch = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/contratos/envio-manual", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proposta_id: propostaId }),
        });
        if (!res.ok) {
          const err = (await res
            .json()
            .catch(() => ({}))) as { error?: string };
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

  if (!documentId) {
    return (
      <Button onClick={dispatch} disabled={isPending}>
        <Send className="h-4 w-4 mr-2" />
        {isPending ? "Enviando..." : "Enviar contrato"}
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="text-sm">
        <p className="text-muted-foreground">Contrato enviado</p>
        <p className="font-mono text-xs break-all">{documentId}</p>
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
