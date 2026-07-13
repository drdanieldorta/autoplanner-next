"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Calculator,
  Download,
  FileSignature,
  FileText,
  Printer,
} from "lucide-react";

import { Button } from "@/components/ui/button";

type DocTipo = "orcamento" | "financeiro" | "contrato";

const DOCS: { tipo: DocTipo; label: string; icon: typeof FileText }[] = [
  { tipo: "orcamento", label: "Resumo do orçamento", icon: FileText },
  { tipo: "financeiro", label: "Resumo financeiro", icon: Calculator },
  { tipo: "contrato", label: "Contrato", icon: FileSignature },
];

export function DocumentosPdf({ propostaId }: { propostaId: string }) {
  // Uma única ação por vez — geração de PDF (Puppeteer) é pesada.
  const [loading, setLoading] = useState<string | null>(null);

  async function handle(tipo: DocTipo, mode: "print" | "download") {
    const key = `${tipo}:${mode}`;
    setLoading(key);
    try {
      const res = await fetch(`/api/propostas/${propostaId}/pdf?tipo=${tipo}`);
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error ?? "Falha ao gerar PDF");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (mode === "download") {
        const a = document.createElement("a");
        a.href = url;
        a.download = `${tipo}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        const win = window.open(url, "_blank");
        if (!win) {
          toast.error("Permita pop-ups para visualizar/imprimir o PDF.");
        }
      }
      // Libera o objectURL depois — o browser já leu o blob.
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      toast.error("Erro de rede ao gerar PDF");
    } finally {
      setLoading(null);
    }
  }

  const busy = loading !== null;

  return (
    <div className="space-y-2">
      {DOCS.map(({ tipo, label, icon: Icon }) => (
        <div
          key={tipo}
          className="flex items-center justify-between gap-2 rounded-lg border p-3"
        >
          <div className="flex min-w-0 items-center gap-2">
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-sm font-medium">{label}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handle(tipo, "print")}
              disabled={busy}
              title="Abrir para imprimir"
            >
              <Printer className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">
                {loading === `${tipo}:print` ? "Gerando..." : "Imprimir"}
              </span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handle(tipo, "download")}
              disabled={busy}
              title="Baixar PDF"
            >
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">
                {loading === `${tipo}:download` ? "Gerando..." : "Baixar"}
              </span>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
