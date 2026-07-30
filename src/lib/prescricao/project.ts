/**
 * Arquivo NEUTRO — importável de Server e Client Components.
 * NÃO adicionar `import "server-only"`.
 *
 * Esta é a única fonte do cronograma. Roda idêntica no Client Component do
 * orçamento (preview ao vivo, sem roundtrip) e no servidor (render do PDF),
 * então é impossível a tela divergir do papel.
 *
 * Função PURA: sem I/O, sem Date.now() implícito, sem acesso a banco.
 * Toda entrada é argumento.
 */

import { inferVia, type Via } from "./enums";
import type {
  PlanoDia,
  PlanoExecucao,
  PlanoItem,
  PlanoItemFonte,
  PlanoSessao,
  PlanoAviso,
} from "./types";

/** Item cru, como vem de `protocol_items` ou de `procedimentos_adicionais`. */
export type ItemCru = {
  ref: string;
  procedure_name: string;
  quantity: number | null | undefined;
  interval_days: number | null | undefined;
  via?: string | null;
  cuidados?: string | null;
};

const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Datas aqui são de CALENDÁRIO, não instantes. Ancorar ao meio-dia local
 * elimina o off-by-one clássico de horário de verão / UTC: somar 7 dias a
 * uma data ancorada em 00:00 pode cair no dia anterior conforme o fuso.
 */
function parseDiaLocal(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

function formatDia(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDias(base: Date, dias: number): Date {
  return new Date(base.getTime() + dias * DIA_MS);
}

export function isDataValida(yyyyMmDd: string | null | undefined): boolean {
  if (!yyyyMmDd || !/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd)) return false;
  const d = parseDiaLocal(yyyyMmDd);
  return !Number.isNaN(d.getTime()) && formatDia(d) === yyyyMmDd;
}

/** "D0", "D+7", "D+14" */
function rotuloDia(offset: number): string {
  return offset === 0 ? "D0" : `D+${offset}`;
}

/** Normaliza um item cru, resolvendo a via (banco → heurístico → null). */
export function normalizarItem(raw: ItemCru): PlanoItemFonte {
  const viaBanco = raw.via as Via | null | undefined;
  const temViaBanco = Boolean(viaBanco);
  const via = temViaBanco
    ? (viaBanco as Via)
    : inferVia(raw.procedure_name ?? "");

  const cuidados = (raw.cuidados ?? "").trim();

  return {
    ref: raw.ref,
    procedure_name: (raw.procedure_name ?? "").trim() || "Procedimento",
    quantity: Math.max(1, Math.trunc(Number(raw.quantity ?? 1)) || 1),
    interval_days: Math.max(0, Math.trunc(Number(raw.interval_days ?? 0)) || 0),
    via,
    via_inferida: !temViaBanco && via !== null,
    cuidados: cuidados || null,
  };
}

/**
 * Expande um item em sessões.
 *
 * Regra clínica que importa: `interval_days === 0` com `quantity > 1` é
 * UMA sessão com N repetições ("3 ampolas na mesma aplicação"), NÃO N
 * sessões empilhadas no mesmo dia. Empilhar produziria um cronograma que
 * manda a enfermagem aplicar 3 vezes no D0 como se fossem eventos
 * separados — leitura errada e potencialmente perigosa.
 */
function expandirSessoes(item: PlanoItemFonte, inicio: Date): PlanoSessao[] {
  if (item.interval_days === 0) {
    return [
      {
        n: 1,
        total: 1,
        offset_dias: 0,
        data: formatDia(inicio),
        rotulo: rotuloDia(0),
        repeticoes: item.quantity,
      },
    ];
  }

  return Array.from({ length: item.quantity }, (_, idx) => {
    const offset = idx * item.interval_days;
    return {
      n: idx + 1,
      total: item.quantity,
      offset_dias: offset,
      data: formatDia(addDias(inicio, offset)),
      rotulo: rotuloDia(offset),
      repeticoes: 1,
    };
  });
}

export type ProjetarInput = {
  /** yyyy-MM-dd */
  inicio: string;
  itens: ItemCru[];
  clinica: PlanoExecucao["clinica"];
  paciente: PlanoExecucao["paciente"];
  profissional: PlanoExecucao["profissional"];
  protocolo: PlanoExecucao["protocolo"];
  observacoes: string | null;
  proposta_ref: string;
  revisao: number;
  /** ISO. Injetado pelo caller — a função permanece pura. */
  gerado_em: string;
};

export function projetarPlano(input: ProjetarInput): PlanoExecucao {
  const inicioSeguro = isDataValida(input.inicio)
    ? input.inicio
    : formatDia(new Date());
  const inicioDate = parseDiaLocal(inicioSeguro);

  // Ordem = ordem em que os itens foram cadastrados no protocolo, que é a
  // ordem exibida no form. Sem coluna `ordem` no banco (escopo mínimo).
  const fontes = input.itens.map(normalizarItem);

  const itens: PlanoItem[] = fontes.map((fonte) => ({
    ...fonte,
    sessoes: expandirSessoes(fonte, inicioDate),
  }));

  // Agenda: agrupa por offset, preservando a ordem dos itens dentro do dia.
  const porOffset = new Map<number, PlanoDia>();
  for (const item of itens) {
    for (const sessao of item.sessoes) {
      let dia = porOffset.get(sessao.offset_dias);
      if (!dia) {
        dia = {
          data: sessao.data,
          rotulo: sessao.rotulo,
          offset_dias: sessao.offset_dias,
          itens: [],
        };
        porOffset.set(sessao.offset_dias, dia);
      }
      dia.itens.push({
        ref: item.ref,
        procedure_name: item.procedure_name,
        via: item.via,
        via_inferida: item.via_inferida,
        cuidados: item.cuidados,
        sessao: `${sessao.n}/${sessao.total}`,
        repeticoes: sessao.repeticoes,
      });
    }
  }

  const agenda = [...porOffset.values()].sort(
    (a, b) => a.offset_dias - b.offset_dias,
  );

  const totalSessoes = agenda.length;
  const ultimaData = agenda.length
    ? agenda[agenda.length - 1].data
    : inicioSeguro;

  return {
    versao: 1,
    gerado_em: input.gerado_em,
    revisao: input.revisao,
    inicio: inicioSeguro,
    clinica: input.clinica,
    paciente: input.paciente,
    profissional: input.profissional,
    protocolo: input.protocolo,
    observacoes: input.observacoes?.trim() || null,
    itens,
    agenda,
    total_sessoes: totalSessoes,
    ultima_data: ultimaData,
    proposta_ref: input.proposta_ref,
  };
}

/**
 * Avisos — NUNCA bloqueiam.
 *
 * Decisão explícita (2026-07-30): o envio é automático, encadeado ao envio
 * do contrato. Se qualquer campo clínico ausente virasse bloqueio, todo
 * protocolo legado (100% deles têm `via` nula) quebraria o botão
 * "Salvar e enviar contrato" no dia 1. A folha DEGRADA — imprime "—" e
 * marca para conferência — em vez de falhar.
 */
export function avisosDoPlano(plano: PlanoExecucao): PlanoAviso[] {
  const avisos: PlanoAviso[] = [];

  if (!plano.paciente.alergias?.trim()) {
    avisos.push({
      ref: null,
      campo: "alergias",
      mensagem: "Alergias não informadas — a folha sai para conferência manual.",
    });
  }
  if (!plano.profissional.crm?.trim()) {
    avisos.push({
      ref: null,
      campo: "crm",
      mensagem: "Profissional sem registro de conselho cadastrado.",
    });
  }
  if (!plano.protocolo.cuidados_gerais?.trim()) {
    avisos.push({
      ref: null,
      campo: "cuidados_gerais",
      mensagem: "Protocolo sem cuidados gerais de enfermagem.",
    });
  }

  for (const item of plano.itens) {
    if (!item.via) {
      avisos.push({
        ref: item.ref,
        campo: "via",
        mensagem: `"${item.procedure_name}" sem via de administração.`,
      });
    } else if (item.via_inferida) {
      avisos.push({
        ref: item.ref,
        campo: "via",
        mensagem: `Via de "${item.procedure_name}" deduzida do nome — confirmar no protocolo.`,
      });
    }
    if (item.interval_days === 0 && item.quantity > 1) {
      avisos.push({
        ref: item.ref,
        campo: "quantidade",
        mensagem: `"${item.procedure_name}": ${item.quantity} aplicações na mesma sessão (intervalo 0).`,
      });
    }
  }

  return avisos;
}
