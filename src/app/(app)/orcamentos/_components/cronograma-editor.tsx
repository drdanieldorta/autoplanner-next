"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarDays,
  RotateCcw,
  Save,
  Syringe,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { VIA_LABEL, VIAS, type Via } from "@/lib/prescricao/enums";
import {
  addDiasISO,
  alinharAoDiaDeAtendimento,
  avisosDoPlano,
  diaDaSemana,
  noDiaDaSemana,
  offsetPadraoDaSessao,
  projetarPlano,
  type ItemCru,
} from "@/lib/prescricao/project";
import type { PrescricaoAjustes } from "@/lib/prescricao/types";
import { salvarCronograma } from "../[id]/cronograma/actions";

const SEM_VIA = "__sem_via__";

type Props = {
  propostaId: string;
  itens: ItemCru[];
  contexto: {
    clinica: { nome: string; cnpj: string | null };
    paciente: {
      nome: string;
      cpf: string;
      nascimento: string;
      telefone: string;
      feegow_id: string | null;
    };
    profissional: { nome: string; crm: string; especialidade: string };
    protocolo: {
      id: string | null;
      nome: string;
      cuidados_gerais: string | null;
      sinais_alerta: string | null;
    };
    proposta_ref: string;
    revisao: number;
  };
  inicial: {
    inicio: string;
    observacoes: string;
    alergias: string;
    ajustes: PrescricaoAjustes;
    /** `propostas.prescricao_alinhar_semana`. */
    alinharSemana: boolean;
  };
  jaEnviada: boolean;
};

function brData(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split("-");
  return `${d}/${m}/${y}`;
}

/** Diferença em dias entre duas datas de calendário. */
function difDias(inicio: string, alvo: string): number {
  const mk = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0).getTime();
  };
  return Math.round((mk(alvo) - mk(inicio)) / 86400000);
}

/**
 * Editor do cronograma da folha de enfermagem.
 *
 * O que se edita são os DADOS, não o documento: a folha continua derivada
 * por `projetarPlano()` — a mesma função que gera o PDF no servidor. Por
 * isso o preview abaixo não é uma aproximação, é literalmente o que sai
 * impresso.
 *
 * Nada aqui altera o protocolo: os ajustes valem só para esta folha.
 */
export function CronogramaEditor({
  propostaId,
  itens,
  contexto,
  inicial,
  jaEnviada,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [inicio, setInicio] = useState(inicial.inicio);
  const [observacoes, setObservacoes] = useState(inicial.observacoes);
  const [alergias, setAlergias] = useState(inicial.alergias);
  const [ajustes, setAjustes] = useState<PrescricaoAjustes>(inicial.ajustes);
  const [alinharSemana, setAlinharSemana] = useState(inicial.alinharSemana);
  const [aberto, setAberto] = useState<string | null>(null);

  // MESMA função do servidor ⇒ impossível o preview divergir do PDF.
  const plano = useMemo(
    () =>
      projetarPlano({
        inicio,
        itens,
        ajustes,
        clinica: contexto.clinica,
        paciente: { ...contexto.paciente, alergias: alergias.trim() || null },
        profissional: contexto.profissional,
        protocolo: contexto.protocolo,
        observacoes: observacoes.trim() || null,
        proposta_ref: contexto.proposta_ref,
        revisao: contexto.revisao,
        gerado_em: new Date().toISOString(),
        alinharSemana,
      }),
    [inicio, itens, ajustes, contexto, alergias, observacoes, alinharSemana],
  );

  const avisos = useMemo(
    () => avisosDoPlano(plano, ajustes, { alinharSemana }),
    [plano, ajustes, alinharSemana],
  );

  const diaInicio = diaDaSemana(inicio);

  const temAjuste = Object.keys(ajustes).length > 0;

  // ── mutadores do delta ──────────────────────────────────────────────
  // Remarcar de volta para a data padrão APAGA a chave em vez de gravá-la.
  // Gravada, ela seria uma data fixada igual à padrão: ao trocar o modo do
  // dia de atendimento, ficaria presa na data do modo anterior.
  const gravarSessao = (
    sessoes: Record<string, number>,
    ref: string,
    n: number,
    offset: number,
  ) => {
    const item = plano.itens.find((i) => i.ref === ref);
    const v = Math.max(0, offset);
    if (item && v === offsetPadraoDaSessao(item, n, alinharSemana)) {
      delete sessoes[String(n)];
    } else {
      sessoes[String(n)] = v;
    }
  };

  const setSessao = (ref: string, n: number, offset: number) =>
    setAjustes((prev) => {
      const atual = prev[ref] ?? {};
      const sessoes = { ...(atual.sessoes ?? {}) };
      gravarSessao(sessoes, ref, n, offset);
      return { ...prev, [ref]: { ...atual, sessoes } };
    });

  /** Empurra esta sessão e todas as posteriores do mesmo item pelo delta. */
  const empurrarDaqui = (ref: string, aPartirDe: number, delta: number) =>
    setAjustes((prev) => {
      const item = plano.itens.find((i) => i.ref === ref);
      if (!item) return prev;
      const atual = prev[ref] ?? {};
      const sessoes = { ...(atual.sessoes ?? {}) };
      for (const s of item.sessoes) {
        if (s.n >= aPartirDe) {
          gravarSessao(sessoes, ref, s.n, s.offset_dias + delta);
        }
      }
      return { ...prev, [ref]: { ...atual, sessoes } };
    });

  const limparSessao = (ref: string, n: number) =>
    setAjustes((prev) => {
      const atual = prev[ref];
      if (!atual?.sessoes) return prev;
      const sessoes = { ...atual.sessoes };
      delete sessoes[String(n)];
      return { ...prev, [ref]: { ...atual, sessoes } };
    });

  const setCampo = (
    ref: string,
    campo: "via" | "dose" | "cuidados",
    valor: unknown,
  ) =>
    setAjustes((prev) => ({
      ...prev,
      [ref]: { ...(prev[ref] ?? {}), [campo]: valor },
    }));

  const resetarTudo = () => setAjustes({});

  const salvar = () => {
    startTransition(async () => {
      const res = await salvarCronograma({
        proposta_id: propostaId,
        inicio,
        observacoes: observacoes.trim() || null,
        alergias: alergias.trim() || null,
        ajustes,
        alinhar_semana: alinharSemana,
      });
      if (!res || !res.ok) {
        toast.error(res?.error ?? "Erro ao salvar o cronograma");
        return;
      }
      // Regenera o PDF com o que acabou de ser salvo. Não pode ir na Server
      // Action: gerar PDF exige `maxDuration`, que é config de route segment.
      try {
        const r = await fetch("/api/prescricoes/gerar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proposta_id: propostaId }),
        });
        if (!r.ok) {
          const e = (await r.json().catch(() => ({}))) as { error?: string };
          toast.warning(
            `Ajustes salvos, mas o PDF não foi atualizado: ${e.error ?? "tente de novo"}`,
            { duration: 8000 },
          );
        } else {
          toast.success(
            jaEnviada
              ? "Cronograma salvo. Envie ao prontuário para gerar a nova revisão."
              : "Cronograma salvo",
          );
        }
      } catch {
        toast.warning("Ajustes salvos, mas houve erro de rede ao atualizar o PDF.");
      }
      router.push(`/orcamentos/${propostaId}`);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {jaEnviada && (
        <div className="flex gap-2 items-start text-sm border rounded-md p-3 bg-muted/40">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
          <p className="text-muted-foreground">
            Esta folha já está no prontuário. Alterar e reenviar cria a
            revisão {contexto.revisao + 1};{" "}
            <strong>o anexo anterior permanece no prontuário</strong> — a
            Feegow não permite apagar nem substituir. O documento novo avisa em
            destaque qual revisão ele substitui.
          </p>
        </div>
      )}

      {/* ── Dados gerais ────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados da folha</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="inicio">Início do tratamento</Label>
              <Input
                id="inicio"
                type="date"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                D0{diaInicio ? ` (${diaInicio})` : ""}. Mover esta data
                desloca todo o cronograma.
              </p>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="alergias">Alergias relatadas</Label>
              <Input
                id="alergias"
                value={alergias}
                onChange={(e) => setAlergias(e.target.value)}
                placeholder="Ex: dipirona, AAS — em branco se não avaliado"
              />
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-md border p-3">
            <Switch
              id="alinhar-semana"
              checked={alinharSemana}
              // Trocar o modo não mexe nas datas fixadas: elas aparecem com
              // borda mesmo quando coincidem com a nova data padrão.
              onCheckedChange={setAlinharSemana}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <Label htmlFor="alinhar-semana" className="cursor-pointer">
                Atender sempre no mesmo dia da semana
              </Label>
              <p className="text-xs text-muted-foreground">
                {alinharSemana
                  ? `As aplicações caem ${noDiaDaSemana(inicio) || "no dia da semana do início"}: a data do protocolo vai para o dia mais próximo, até 3 dias antes ou depois. Item com intervalo menor que uma semana só começa nesse dia. Datas remarcadas à mão não mudam.`
                  : "Desligado: as datas seguem a conta exata do intervalo do protocolo."}
              </p>
            </div>
          </div>
          <div>
            <Label htmlFor="obs">Observações para a enfermagem</Label>
            <Textarea
              id="obs"
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Fita de sessões ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">Aplicações</CardTitle>
            <p className="text-sm text-muted-foreground">
              Clique numa sessão para remarcar. Os ajustes valem só para este
              paciente — o protocolo não muda.
            </p>
          </div>
          {temAjuste && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetarTudo}
              className="text-muted-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Voltar ao protocolo
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-5">
          {plano.itens.map((item) => {
            // Com o dia de atendimento, adiar também cai nele: "a cada 30
            // dias" adia 28. Abaixo de uma semana o ritmo é o do protocolo.
            const passo =
              alinharSemana && item.interval_days >= 7
                ? alinharAoDiaDeAtendimento(item.interval_days)
                : item.interval_days > 0
                  ? item.interval_days
                  : 7;
            return (
              <div key={item.ref} className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-sm">
                    {item.procedure_name}
                  </span>
                  {item.via ? (
                    <Badge
                      variant={item.via_inferida ? "outline" : "secondary"}
                      className="text-[10px] font-mono"
                    >
                      {item.via}
                      {item.via_inferida ? " ?" : ""}
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[10px]">
                      sem via
                    </Badge>
                  )}
                  {item.dose && (
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {item.dose}
                    </Badge>
                  )}
                  {item.ajustado && (
                    <Badge className="text-[10px] bg-accent-gold text-black hover:bg-accent-gold">
                      ajustado
                    </Badge>
                  )}
                </div>

                {/* chips de sessão */}
                <div className="flex flex-wrap gap-2">
                  {item.sessoes.map((sessao) => {
                    const chave = `${item.ref}#${sessao.n}`;
                    // Data gravada à mão, mesmo igual à padrão de agora (o modo
                    // do dia de atendimento pode ter mudado depois). Fica
                    // visível para nenhuma data presa passar despercebida.
                    const fixada =
                      sessao.ajustada ||
                      String(sessao.n) in (ajustes[item.ref]?.sessoes ?? {});
                    return (
                      <Popover
                        key={chave}
                        open={aberto === chave}
                        onOpenChange={(o) => setAberto(o ? chave : null)}
                      >
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            title={
                              fixada && !sessao.ajustada
                                ? "Data fixada à mão. Hoje coincide com a data padrão, mas não muda se a regra do dia de atendimento mudar."
                                : sessao.alinhada
                                ? // Item com intervalo menor que uma semana desloca
                                  // o ciclo inteiro, mas só o começo cai no dia.
                                  `${diaDaSemana(sessao.data) === diaInicio ? "No dia de atendimento." : "O ciclo começa no dia de atendimento e segue o intervalo do protocolo."} Pela conta exata do protocolo seria ${brData(addDiasISO(inicio, item.inicio_dias + (sessao.n - 1) * item.interval_days))}.`
                                : undefined
                            }
                            className={`rounded-md border px-2.5 py-1.5 text-xs text-left transition-colors hover:bg-accent ${
                              fixada
                                ? "border-accent-gold bg-accent-gold/10"
                                : "border-border"
                            }`}
                          >
                            <span className="font-medium">
                              {sessao.ordem}ª
                            </span>{" "}
                            <span className="tabular-nums">
                              {brData(sessao.data)}
                            </span>
                            <span className="text-muted-foreground ml-1">
                              {sessao.rotulo}
                            </span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 space-y-3" align="start">
                          <div>
                            <Label className="text-xs">Data desta sessão</Label>
                            <Input
                              type="date"
                              value={sessao.data}
                              min={inicio}
                              onChange={(e) => {
                                const novo = difDias(inicio, e.target.value);
                                if (Number.isFinite(novo))
                                  setSessao(item.ref, sessao.n, novo);
                              }}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <p className="text-xs text-muted-foreground">
                              Adiar {passo} dias:
                            </p>
                            <div className="flex gap-1.5">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="flex-1 text-xs"
                                onClick={() =>
                                  setSessao(
                                    item.ref,
                                    sessao.n,
                                    sessao.offset_dias + passo,
                                  )
                                }
                              >
                                Só esta
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="flex-1 text-xs"
                                onClick={() =>
                                  empurrarDaqui(item.ref, sessao.n, passo)
                                }
                              >
                                E as seguintes
                              </Button>
                            </div>
                            <div className="flex gap-1.5">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="flex-1 text-xs"
                                onClick={() =>
                                  setSessao(
                                    item.ref,
                                    sessao.n,
                                    sessao.offset_dias - passo,
                                  )
                                }
                              >
                                Antecipar só esta
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="flex-1 text-xs"
                                onClick={() =>
                                  empurrarDaqui(item.ref, sessao.n, -passo)
                                }
                              >
                                E as seguintes
                              </Button>
                            </div>
                          </div>

                          {fixada && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="w-full text-xs text-muted-foreground"
                              onClick={() => limparSessao(item.ref, sessao.n)}
                            >
                              <RotateCcw className="h-3 w-3 mr-1.5" />
                              Voltar ao padrão do protocolo
                            </Button>
                          )}
                        </PopoverContent>
                      </Popover>
                    );
                  })}
                </div>

                {/* via + cuidados desta folha */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
                  <div className="md:col-span-3">
                    <Label className="text-xs flex items-center gap-1">
                      <Syringe className="h-3 w-3" />
                      Via (só nesta folha)
                    </Label>
                    <Select
                      value={ajustes[item.ref]?.via ?? SEM_VIA}
                      onValueChange={(v) =>
                        setCampo(
                          item.ref,
                          "via",
                          v === SEM_VIA ? null : (v as Via),
                        )
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Do protocolo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SEM_VIA}>Do protocolo</SelectItem>
                        {VIAS.map((v) => (
                          <SelectItem key={v} value={v}>
                            {VIA_LABEL[v]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-3">
                    <Label className="text-xs">Dose (só nesta folha)</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder={item.dose ?? "Do protocolo"}
                      value={ajustes[item.ref]?.dose ?? ""}
                      onChange={(e) =>
                        setCampo(item.ref, "dose", e.target.value)
                      }
                    />
                  </div>
                  <div className="md:col-span-6">
                    <Label className="text-xs">Cuidados (só nesta folha)</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder={item.cuidados ?? "Do protocolo"}
                      value={ajustes[item.ref]?.cuidados ?? ""}
                      onChange={(e) =>
                        setCampo(item.ref, "cuidados", e.target.value)
                      }
                    />
                  </div>
                </div>
                <Separator />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ── Preview da agenda ───────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Agenda resultante
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {plano.total_sessoes} sessõe{plano.total_sessoes === 1 ? "" : "s"} ·{" "}
            {brData(plano.inicio)} a {brData(plano.ultima_data)}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {plano.agenda.map((dia) => (
              <div
                key={dia.offset_dias}
                className="flex flex-wrap gap-x-3 gap-y-1 text-sm border-b pb-2 last:border-0"
              >
                <span className="font-medium tabular-nums w-24 shrink-0">
                  {brData(dia.data)}
                </span>
                <span className="text-muted-foreground w-14 shrink-0">
                  {dia.rotulo}
                </span>
                <span className="flex-1 min-w-[180px]">
                  {dia.itens.map((it, i) => (
                    <span key={`${it.ref}-${i}`}>
                      {i > 0 && " · "}
                      {it.procedure_name}
                      {it.via ? ` ${it.via}` : ""}
                      {it.repeticoes > 1 ? ` ×${it.repeticoes}` : ""}
                      <span className="text-muted-foreground">
                        {" "}
                        ({it.sessao})
                      </span>
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>

          {avisos.length > 0 && (
            <div className="mt-4 space-y-1 border-l-2 border-muted-foreground/40 pl-3">
              {avisos.map((a, i) => (
                <p key={i} className="text-xs text-muted-foreground">
                  {a.mensagem}
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/orcamentos/${propostaId}`)}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button type="button" onClick={salvar} disabled={isPending}>
          <Save className="h-4 w-4 mr-2" />
          {isPending ? "Salvando..." : "Salvar cronograma"}
        </Button>
      </div>
    </div>
  );
}
