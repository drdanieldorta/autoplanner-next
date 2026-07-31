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

import { inferVia, isVia, type Via } from "./enums";
import type {
  AjusteItem,
  PlanoDia,
  PlanoExecucao,
  PlanoItem,
  PlanoItemFonte,
  PlanoSessao,
  PlanoAviso,
  PrescricaoAjustes,
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
function expandirSessoes(
  item: PlanoItemFonte,
  inicio: Date,
  ajusteSessoes?: Record<string, number>,
): PlanoSessao[] {
  const offsetDe = (n: number, padrao: number): { offset: number; ajustada: boolean } => {
    const bruto = ajusteSessoes?.[String(n)];
    if (bruto === undefined || bruto === null) return { offset: padrao, ajustada: false };
    const v = Math.max(0, Math.trunc(Number(bruto)));
    if (!Number.isFinite(v)) return { offset: padrao, ajustada: false };
    return { offset: v, ajustada: v !== padrao };
  };

  const brutas: PlanoSessao[] =
    item.interval_days === 0
      ? (() => {
          const { offset, ajustada } = offsetDe(1, 0);
          return [
            {
              n: 1,
              ordem: 1,
              total: 1,
              ajustada,
              offset_dias: offset,
              data: formatDia(addDias(inicio, offset)),
              rotulo: rotuloDia(offset),
              repeticoes: item.quantity,
            },
          ];
        })()
      : Array.from({ length: item.quantity }, (_, idx) => {
          const n = idx + 1;
          const { offset, ajustada } = offsetDe(n, idx * item.interval_days);
          return {
            n,
            ordem: n,
            total: item.quantity,
            ajustada,
            offset_dias: offset,
            data: formatDia(addDias(inicio, offset)),
            rotulo: rotuloDia(offset),
            repeticoes: 1,
          };
        });

  // Reordena por data e RENUMERA para exibição. A enfermeira lê a folha
  // cronologicamente, então "2/6" tem que significar "a segunda a acontecer".
  // O índice original (`n`) é preservado porque é a chave do ajuste — se ele
  // mudasse ao remanejar, editar duas vezes perderia o primeiro ajuste.
  return brutas
    .slice()
    .sort((a, b) => a.offset_dias - b.offset_dias || a.n - b.n)
    .map((sessao, i) => ({ ...sessao, ordem: i + 1 }));
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
  /** Delta esparso desta folha. Vazio ⇒ projeção pura do protocolo. */
  ajustes?: PrescricaoAjustes;
};

export function projetarPlano(input: ProjetarInput): PlanoExecucao {
  const inicioSeguro = isDataValida(input.inicio)
    ? input.inicio
    : formatDia(new Date());
  const inicioDate = parseDiaLocal(inicioSeguro);

  // Ordem = ordem em que os itens foram cadastrados no protocolo, que é a
  // ordem exibida no form. Sem coluna `ordem` no banco (escopo mínimo).
  const ajustes = input.ajustes ?? {};
  const fontes = input.itens.map(normalizarItem);

  const itens: PlanoItem[] = fontes.map((fonte) => {
    const aj: AjusteItem | undefined = ajustes[fonte.ref];

    // Via e cuidados sobrescritos valem SÓ nesta folha — o protocolo não é
    // tocado. Uma via ajustada deixa de ser "inferida": foi escolhida por
    // alguém, não deduzida do nome.
    const viaAjustada = aj && "via" in aj && isVia(aj.via) ? aj.via : null;
    const cuidadosAjustados =
      aj && typeof aj.cuidados === "string" ? aj.cuidados.trim() : null;

    const comAjuste: PlanoItemFonte = {
      ...fonte,
      via: viaAjustada ?? fonte.via,
      via_inferida: viaAjustada ? false : fonte.via_inferida,
      cuidados: cuidadosAjustados || fonte.cuidados,
    };

    const sessoes = expandirSessoes(comAjuste, inicioDate, aj?.sessoes);

    return {
      ...comAjuste,
      sessoes,
      ajustado:
        Boolean(viaAjustada) ||
        Boolean(cuidadosAjustados) ||
        sessoes.some((x) => x.ajustada),
    };
  });

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
        sessao: `${sessao.ordem}/${sessao.total}`,
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
export function avisosDoPlano(
  plano: PlanoExecucao,
  ajustes?: PrescricaoAjustes,
): PlanoAviso[] {
  const avisos: PlanoAviso[] = [];

  // Ajuste órfão: a chave é o id do item do protocolo, e `updateProtocol`
  // recria esses ids no delete-then-insert. Se o protocolo mudou depois do
  // ajuste, o remanejo some. Isso PRECISA aparecer — um cronograma que
  // silenciosamente volta ao padrão é exatamente como esse tipo de bug vira
  // erro clínico.
  if (ajustes) {
    const refsVivos = new Set(plano.itens.map((i) => i.ref));
    for (const ref of Object.keys(ajustes)) {
      if (!refsVivos.has(ref)) {
        avisos.push({
          ref,
          campo: "ajuste_orfao",
          mensagem:
            "Um ajuste desta folha foi perdido porque o protocolo mudou. Revise o cronograma.",
        });
      }
    }
  }

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
    // Duas sessões do MESMO item no mesmo dia. Acontece legitimamente ao
    // remanejar (a sessão movida pode cair em cima de outra), mas significa
    // administrar o mesmo item duas vezes numa visita — a equipe precisa
    // confirmar que é intencional, não descobrir na hora do preparo.
    const porDia = new Map<string, number>();
    for (const s of item.sessoes) {
      porDia.set(s.data, (porDia.get(s.data) ?? 0) + 1);
    }
    for (const [data, n] of porDia) {
      if (n > 1) {
        const [y, m, d] = data.split("-");
        avisos.push({
          ref: item.ref,
          campo: "sessoes_no_mesmo_dia",
          mensagem: `"${item.procedure_name}": ${n} sessões caem em ${d}/${m}/${y}. Confirme se é intencional.`,
        });
      }
    }

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
