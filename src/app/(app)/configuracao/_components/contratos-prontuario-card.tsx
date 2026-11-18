"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp } from "lucide-react";
import { toast } from "sonner";

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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Lote = {
  enviados: number;
  falhas: Array<{ id: string; paciente: string; mensagem: string }>;
  tentados: string[];
  restantes: number;
};

/**
 * Envia de uma vez ao prontuário da Feegow os contratos assinados que ainda
 * não estão lá (assinados antes de o webhook funcionar). Irreversível — a
 * Feegow não apaga anexo —, então pede confirmação dizendo o que conferir.
 */
export function ContratosProntuarioCard({ pendentes }: { pendentes: number }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState({ feitos: 0, total: pendentes });

  const enviar = async () => {
    setEnviando(true);
    setProgresso({ feitos: 0, total: pendentes });
    const tentados: string[] = [];
    let enviados = 0;
    const falhas: Lote["falhas"] = [];
    try {
      for (;;) {
        const res = await fetch("/api/contratos/anexar-assinados", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmar: true, tentados }),
        });
        const data = (await res.json().catch(() => ({}))) as Partial<Lote> & {
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Falha ao enviar");
        tentados.push(...(data.tentados ?? []));
        enviados += data.enviados ?? 0;
        falhas.push(...(data.falhas ?? []));
        setProgresso({
          feitos: tentados.length,
          total: tentados.length + (data.restantes ?? 0),
        });
        if (!data.tentados?.length || !data.restantes) break;
      }
      if (falhas.length === 0) {
        toast.success(`${enviados} contrato(s) enviado(s) ao prontuário.`);
      } else {
        toast.warning(
          `${enviados} enviado(s), ${falhas.length} com falha: ${falhas
            .slice(0, 3)
            .map((f) => `${f.paciente} (${f.mensagem})`)
            .join("; ")}${falhas.length > 3 ? "…" : ""}`,
          { duration: 15000 },
        );
      }
    } catch (err) {
      toast.error(
        `${enviados} enviado(s) antes de parar: ${err instanceof Error ? err.message : "erro"}. Pode tentar de novo.`,
      );
    } finally {
      setEnviando(false);
      router.refresh();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileUp className="h-4 w-4" />
          Contratos assinados no prontuário
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {pendentes === 0 ? (
          <p className="text-muted-foreground">
            Todo contrato assinado de paciente da Feegow já está no prontuário.
          </p>
        ) : (
          <>
            <p>
              <strong>{pendentes}</strong> contrato(s) assinado(s) de paciente
              da Feegow ainda não foram enviados ao prontuário por este
              sistema.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" disabled={enviando}>
                  {enviando
                    ? `Enviando ${progresso.feitos} de ${progresso.total}…`
                    : `Enviar ${pendentes} ao prontuário`}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Enviar ao prontuário?</AlertDialogTitle>
                  <AlertDialogDescription>
                    A Feegow não permite apagar anexos. Se o sistema antigo
                    (n8n) já anexou algum destes contratos, ele vai ficar
                    duplicado no prontuário. Antes de continuar, abra o
                    prontuário de um paciente que assinou e confira se o
                    contrato assinado já está nos arquivos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={enviar}>
                    Conferi, enviar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </CardContent>
    </Card>
  );
}
