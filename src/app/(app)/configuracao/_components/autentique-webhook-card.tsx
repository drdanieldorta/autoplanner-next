"use client";

import { useRef } from "react";
import { Copy, Webhook } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  /** URL absoluta de `/api/webhooks/authentique`, calculada no servidor. */
  url: string;
  /**
   * ISO da assinatura mais recente registrada para a empresa. `null` =
   * nenhuma ainda; `undefined` = não foi possível consultar.
   */
  ultimaAssinatura?: string | null;
};

/**
 * `dd/mm/aaaa hh:mm` no fuso de Brasília, montado por partes: o texto sai
 * igual no servidor e no navegador (sem diferença de fuso nem de separador
 * entre versões do ICU), o que evita erro de hidratação.
 */
function formatarDataHora(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}`;
}

function UltimaAssinatura({ iso }: { iso: string | null | undefined }) {
  if (iso === undefined) {
    return <>Não foi possível consultar a última assinatura recebida.</>;
  }
  const texto = iso ? formatarDataHora(iso) : null;
  if (!texto) return <>Nenhuma assinatura recebida ainda.</>;
  return (
    <>
      Última assinatura recebida:{" "}
      <span className="font-medium text-foreground">{texto}</span>
    </>
  );
}

export function AutentiqueWebhookCard({ url, ultimaAssinatura }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL copiada");
    } catch {
      // Sem permissão de área de transferência (ou contexto não seguro):
      // deixa o texto selecionado para o usuário copiar com Ctrl+C.
      inputRef.current?.focus();
      inputRef.current?.select();
      toast.info("Texto selecionado. Use Ctrl+C para copiar.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Webhook className="h-5 w-5 text-primary-blue" />
          Webhook da Autentique
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Avisa o painel quando o paciente assina o contrato.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="autentiqueWebhookUrl">URL do webhook</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              ref={inputRef}
              id="autentiqueWebhookUrl"
              value={url}
              readOnly
              onFocus={(e) => e.currentTarget.select()}
              className="font-mono text-sm"
            />
            <Button
              type="button"
              variant="outline"
              onClick={copiar}
              className="w-full shrink-0 sm:w-auto"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar
            </Button>
          </div>
        </div>

        <ol className="list-decimal space-y-2 pl-5 text-sm">
          <li>Copie a URL acima.</li>
          <li>
            Entre em{" "}
            <span className="font-medium">painel.autentique.com.br</span> com
            a mesma conta da Autentique cuja chave de API está configurada
            nesta página.
          </li>
          <li>
            Abra a área de API do seu perfil (
            <span className="font-medium">
              painel.autentique.com.br/perfil/api
            </span>
            , o mesmo lugar onde a chave de API foi gerada) e vá até{" "}
            <span className="font-medium">Webhooks</span>.
          </li>
          <li>
            Adicione um novo endpoint: cole a URL, escolha o formato{" "}
            <span className="font-medium">JSON</span> e marque os eventos de
            assinatura aceita (
            <code className="text-xs">signature.accepted</code>) e de
            documento finalizado (
            <code className="text-xs">document.finished</code>). Dê um nome,
            por exemplo &quot;InfinitePlan&quot;.
          </li>
          <li>
            Salve. Se existir um webhook antigo apontando para outro endereço
            (por exemplo, o n8n), troque a URL dele por esta ou remova-o.
            Deixar os dois ativos pode anexar o contrato assinado duas vezes
            ao prontuário da Feegow.
          </li>
          <li>
            Teste: envie um contrato para o seu próprio WhatsApp, assine e
            confira o orçamento. Ele deve aparecer como assinado em alguns
            segundos.
          </li>
        </ol>

        <p className="text-sm text-muted-foreground">
          Os nomes dos menus podem variar um pouco no painel da Autentique. O
          que importa é cadastrar esta URL, no formato JSON, com os dois
          eventos acima. Cada clínica faz isso na própria conta da Autentique;
          a URL é a mesma para todas.
        </p>

        <p className="text-sm text-muted-foreground border-t pt-4">
          <UltimaAssinatura iso={ultimaAssinatura} />
        </p>
      </CardContent>
    </Card>
  );
}
