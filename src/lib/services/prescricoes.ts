import "server-only";

import { createHash } from "node:crypto";

import { canonicalJson } from "@/lib/prescricao/canonical";
import {
  agruparPorProtocolo,
  combinarTextosDeProtocolos,
  nomeDosProtocolos,
  parseItensProtocolo,
} from "@/lib/orcamento/itens-protocolo";
import { isVia } from "@/lib/prescricao/enums";
import { projetarPlano, type ItemCru } from "@/lib/prescricao/project";
import type {
  PlanoExecucao,
  PrescricaoAjustes,
  RevisaoRegistro,
} from "@/lib/prescricao/types";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Camada de dados da folha de execução de enfermagem.
 *
 * Usa o admin client (service_role) pelo mesmo motivo de
 * `envio-manual/route.ts`: a rota precisa ler credenciais da empresa e
 * escrever na proposta. A checagem de company_id é feita EXPLICITAMENTE
 * aqui, já que RLS está bypassado.
 */

export type PrescricaoFonte = {
  propostaId: string;
  companyId: string;
  pacienteId: string;
  plano: PlanoExecucao;
  /** Itens crus normalizados — o editor reprojeta no cliente com eles. */
  itens: ItemCru[];
  ajustes: PrescricaoAjustes;
  /** `propostas.prescricao_alinhar_semana` — datas no dia da semana do D0. */
  alinharSemana: boolean;
  /** Já emitida antes? Governa idempotência e numeração de revisão. */
  anterior: {
    hash: string | null;
    /** Hash da última revisão efetivamente ANEXADA. */
    hashEnviado: string | null;
    revisao: number;
    geradaEm: string | null;
    feegowEm: string | null;
    envioIniciadoEm: string | null;
    revisoes: RevisaoRegistro[];
  };
};

export type FonteErro = { error: string; status: 403 | 404 | 422 };

/** Hoje em yyyy-MM-dd, hora local do servidor. */
export function hojeISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function planHash(plano: PlanoExecucao): string {
  return createHash("sha256").update(canonicalJson(plano)).digest("hex");
}

type PropostaRow = Record<string, unknown>;

/** `paciente_id` da Feegow, ou null para vazio e para o literal "manual". */
function idDeProntuario(pacienteId: string): string | null {
  const id = pacienteId.trim();
  return id && id !== "manual" ? id : null;
}

/**
 * Carrega tudo que a folha precisa e devolve o plano JÁ PROJETADO.
 *
 * `inicioOverride` só vale na PRIMEIRA emissão. Depois disso
 * `propostas.prescricao_inicio` manda — se a data voltasse a defaultar
 * para "hoje" a cada geração, o mesmo orçamento produziria hash diferente
 * todo dia e criaria revisão espúria permanente no prontuário.
 */
export async function loadPrescricaoFonte(args: {
  propostaId: string;
  companyId: string;
  inicioOverride?: string;
}): Promise<PrescricaoFonte | FonteErro> {
  const admin = createAdminClient();

  const propostaResult = await admin
    .from("propostas")
    .select("*")
    .eq("id", args.propostaId)
    .maybeSingle();
  const proposta = propostaResult.data as PropostaRow | null;
  if (!proposta) return { error: "Orçamento não encontrado", status: 404 };
  if (proposta.company_id !== args.companyId) {
    return { error: "Acesso negado a este orçamento", status: 403 };
  }

  const str = (k: string): string => (proposta[k] as string | null) ?? "";

  // ── Itens: protocolo(s) + procedimentos avulsos ──────────────────────
  const protocoloId = (proposta.protocolo_id as string | null) ?? null;

  let protocolo: {
    id: string | null;
    nome: string;
    cuidados_gerais: string | null;
    sinais_alerta: string | null;
  } = {
    id: null,
    nome: (proposta.protocolo_nome as string | null) ?? "Avulso",
    cuidados_gerais: null,
    sinais_alerta: null,
  };

  const itens: ItemCru[] = [];

  // Orçamento novo: retrato `itens_protocolo` — vários protocolos, com a
  // quantidade escolhida no orçamento e sem os itens retirados. A camada
  // clínica do retrato é a do protocolo na criação; o desvio deste paciente
  // continua no delta (`ref` = `protocol_items.id` da época, como sempre).
  const retrato = parseItensProtocolo(proposta.itens_protocolo);

  if (retrato) {
    const grupos = agruparPorProtocolo(retrato);
    if (grupos.length > 0) {
      // Textos gerais lidos ao vivo, como no caminho antigo. Com UM
      // protocolo o cabeçalho sai idêntico ao de sempre.
      const protosResult = await admin
        .from("protocols")
        .select("id, cuidados_gerais, sinais_alerta")
        .in(
          "id",
          grupos.map((g) => g.protocolo_id),
        )
        .eq("company_id", args.companyId);
      const textos = new Map(
        ((protosResult.data ?? []) as Array<{
          id: string;
          cuidados_gerais: string | null;
          sinais_alerta: string | null;
        }>).map((t) => [t.id, t]),
      );
      protocolo = {
        id: grupos[0].protocolo_id,
        nome:
          (proposta.protocolo_nome as string | null) ||
          nomeDosProtocolos(grupos.map((g) => g.protocolo_nome)),
        cuidados_gerais: combinarTextosDeProtocolos(
          grupos.map((g) => ({
            nome: g.protocolo_nome,
            texto: textos.get(g.protocolo_id)?.cuidados_gerais ?? null,
          })),
        ),
        sinais_alerta: combinarTextosDeProtocolos(
          grupos.map((g) => ({
            nome: g.protocolo_nome,
            texto: textos.get(g.protocolo_id)?.sinais_alerta ?? null,
          })),
        ),
      };
    }
    for (const item of retrato) {
      itens.push({
        ref: item.ref,
        procedure_name: item.procedure_name,
        quantity: item.quantity,
        interval_days: item.interval_days,
        inicio_dias: item.inicio_dias,
        dose: item.dose,
        via: item.via,
        cuidados: item.cuidados,
      });
    }
  } else if (protocoloId) {
    const protoResult = await admin
      .from("protocols")
      .select("id, name, cuidados_gerais, sinais_alerta")
      .eq("id", protocoloId)
      .maybeSingle();
    const proto = protoResult.data as {
      id: string;
      name: string;
      cuidados_gerais: string | null;
      sinais_alerta: string | null;
    } | null;
    if (proto) {
      protocolo = {
        id: proto.id,
        nome: proto.name,
        cuidados_gerais: proto.cuidados_gerais,
        sinais_alerta: proto.sinais_alerta,
      };
    }

    const itemsResult = await admin
      .from("protocol_items")
      .select("id, procedure_name, quantity, interval_days, inicio_dias, dose, via, cuidados")
      .eq("protocol_id", protocoloId)
      .order("created_at", { ascending: true });
    for (const raw of (itemsResult.data ?? []) as Array<{
      id: string;
      procedure_name: string;
      quantity: number;
      interval_days: number;
      inicio_dias: number | null;
      dose: string | null;
      via: string | null;
      cuidados: string | null;
    }>) {
      itens.push({
        ref: raw.id,
        procedure_name: raw.procedure_name,
        quantity: raw.quantity,
        interval_days: raw.interval_days,
        inicio_dias: raw.inicio_dias ?? 0,
        dose: raw.dose,
        via: raw.via,
        cuidados: raw.cuidados,
      });
    }
  }

  // Procedimentos avulsos vivem em JSONB sem id estável — indexamos por
  // posição. A camada clínica deles mora no PRÓPRIO objeto, não no delta:
  // sem linha em `protocol_items`, não existe modelo do qual desviar.
  // Gravada por `POST /api/propostas` (ProcedimentoAdicionalSchema).
  const adicionais = Array.isArray(proposta.procedimentos_adicionais)
    ? (proposta.procedimentos_adicionais as Array<Record<string, unknown>>)
    : [];
  adicionais.forEach((extra, i) => {
    const via = extra.via;
    itens.push({
      ref: `extra:${i}`,
      procedure_name: String(extra.procedure_name ?? "Procedimento"),
      quantity: Number(extra.quantity ?? 1),
      interval_days: Number(extra.interval_days ?? 0),
      inicio_dias: Number(extra.inicio_dias ?? 0),
      dose: typeof extra.dose === "string" ? extra.dose : null,
      // JSONB não tem CHECK: valida contra o enum em vez de confiar.
      // `normalizarItem` cairia no heurístico de nome para valor inválido,
      // o que é o comportamento certo para "via desconhecida".
      via: isVia(via) ? via : null,
      cuidados: typeof extra.cuidados === "string" ? extra.cuidados : null,
    });
  });

  if (itens.length === 0) {
    return {
      error: "Orçamento sem procedimentos — nada a executar",
      status: 422,
    };
  }

  // ── Empresa (cabeçalho da folha) ─────────────────────────────────────
  const companyResult = await admin
    .from("companies")
    .select("name, cnpj")
    .eq("id", args.companyId)
    .maybeSingle();
  const company = companyResult.data as {
    name?: string;
    cnpj?: string | null;
  } | null;

  // ── Data de início: persistida vence override ────────────────────────
  const inicioPersistido = (proposta.prescricao_inicio as string | null) ?? null;
  const inicio = inicioPersistido ?? args.inicioOverride ?? hojeISO();

  const revisoesRaw = proposta.prescricao_revisoes;
  const revisoes: RevisaoRegistro[] = Array.isArray(revisoesRaw)
    ? (revisoesRaw as RevisaoRegistro[])
    : [];

  const ajustesRaw = proposta.prescricao_ajustes;
  const ajustes: PrescricaoAjustes =
    ajustesRaw && typeof ajustesRaw === "object" && !Array.isArray(ajustesRaw)
      ? (ajustesRaw as PrescricaoAjustes)
      : {};

  // Só `true` liga: folha gerada antes da coluna existir (ou leitura sem
  // ela) segue a regra com que foi gerada, a das datas exatas.
  const alinharSemana = proposta.prescricao_alinhar_semana === true;

  const anterior = {
    hash: (proposta.prescricao_hash as string | null) ?? null,
    hashEnviado: (proposta.prescricao_hash_enviado as string | null) ?? null,
    revisao: Number(proposta.prescricao_revisao ?? 0),
    geradaEm: (proposta.prescricao_gerada_em as string | null) ?? null,
    feegowEm: (proposta.prescricao_feegow_em as string | null) ?? null,
    envioIniciadoEm:
      (proposta.prescricao_envio_iniciado_em as string | null) ?? null,
    revisoes,
  };

  const plano = projetarPlano({
    inicio,
    itens,
    clinica: {
      nome: company?.name ?? "",
      cnpj: company?.cnpj ?? null,
    },
    paciente: {
      nome: str("paciente_nome"),
      cpf: str("paciente_cpf"),
      nascimento: str("paciente_nascimento"),
      telefone: str("paciente_telefone"),
      // Paciente digitado ou do CRM grava `paciente_id: "manual"` — não é
      // número de prontuário, e a folha imprimiria "Prontuário manual".
      feegow_id: idDeProntuario(str("paciente_id")),
      alergias: (proposta.paciente_alergias as string | null) ?? null,
    },
    profissional: {
      nome: str("profissional_nome"),
      crm: str("profissional_crm"),
      especialidade: str("profissional_especialidade"),
    },
    protocolo,
    observacoes: (proposta.observacoes as string | null) ?? null,
    proposta_ref: String(
      (proposta.id_proposta_api as number | null) ?? args.propostaId,
    ),
    // Projeta com a revisão ANTERIOR. O hash canônico exclui `revisao`, então
    // isto não afeta a comparação; a revisão definitiva é decidida depois de
    // saber se o conteúdo mudou.
    revisao: anterior.revisao,
    gerado_em: new Date().toISOString(),
    ajustes,
    alinharSemana,
  });

  return {
    propostaId: args.propostaId,
    companyId: args.companyId,
    pacienteId: str("paciente_id"),
    plano,
    itens,
    ajustes,
    alinharSemana,
    anterior,
  };
}

/** Congela o plano. Sempre chamado ANTES do upload à Feegow. */
export async function salvarSnapshot(args: {
  propostaId: string;
  companyId: string;
  plano: PlanoExecucao;
  hash: string;
  userId: string | null;
  inicio: string;
}): Promise<void> {
  const admin = createAdminClient();

  // NÃO mexe em `prescricao_revisao` nem no histórico: gerar é barato e
  // reversível, e o usuário pode gerar/editar quantas vezes quiser antes de
  // arquivar. Revisão é um fato do PRONTUÁRIO — só existe quando algo foi
  // efetivamente anexado, e por isso só é incrementada em marcarEnvioConcluido.
  const result = await admin
    .from("propostas")
    .update({
      prescricao_snapshot: args.plano,
      prescricao_hash: args.hash,
      prescricao_gerada_em: args.plano.gerado_em,
      prescricao_gerada_por: args.userId,
      prescricao_inicio: args.inicio,
    } as never)
    .eq("id", args.propostaId)
    .eq("company_id", args.companyId);

  if (result.error) throw new Error(result.error.message);
}

/** Grava o delta desta folha. Não regenera nada — quem chama decide. */
export async function salvarAjustes(args: {
  propostaId: string;
  companyId: string;
  ajustes: PrescricaoAjustes;
  inicio: string | null;
  observacoes: string | null;
  alergias: string | null;
  alinharSemana: boolean;
}): Promise<void> {
  const admin = createAdminClient();
  const result = await admin
    .from("propostas")
    .update({
      prescricao_ajustes: args.ajustes,
      prescricao_inicio: args.inicio,
      prescricao_alinhar_semana: args.alinharSemana,
      observacoes: args.observacoes?.trim() || null,
      paciente_alergias: args.alergias?.trim() || null,
    } as never)
    .eq("id", args.propostaId)
    .eq("company_id", args.companyId);
  if (result.error) throw new Error(result.error.message);
}

/**
 * Marcador in-flight, gravado ANTES da chamada à Feegow.
 *
 * Sem ele existe uma janela real de duplicata: se o lambda for morto por
 * `maxDuration` depois do upload e antes do UPDATE de sucesso, o anexo já
 * está no prontuário mas o banco diz "pendente" — e o retry criaria uma
 * segunda cópia que não há como apagar.
 */
export async function marcarEnvioIniciado(args: {
  propostaId: string;
  companyId: string;
}): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("propostas")
    .update({
      prescricao_envio_iniciado_em: new Date().toISOString(),
    } as never)
    .eq("id", args.propostaId)
    .eq("company_id", args.companyId);
}

export async function marcarEnvioConcluido(args: {
  propostaId: string;
  companyId: string;
  revisao: number;
  hash: string;
  revisoes: RevisaoRegistro[];
}): Promise<void> {
  const admin = createAdminClient();
  const agora = new Date().toISOString();
  const revisoes = args.revisoes.map((r) =>
    r.revisao === args.revisao && r.feegow_em === null
      ? { ...r, feegow_em: agora }
      : r,
  );
  await admin
    .from("propostas")
    .update({
      prescricao_feegow_em: agora,
      prescricao_envio_iniciado_em: null,
      prescricao_erro: null,
      prescricao_revisao: args.revisao,
      prescricao_hash_enviado: args.hash,
      prescricao_revisoes: revisoes,
    } as never)
    .eq("id", args.propostaId)
    .eq("company_id", args.companyId);
}

export async function marcarEnvioFalhou(args: {
  propostaId: string;
  companyId: string;
  erro: string;
}): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("propostas")
    .update({
      prescricao_erro: args.erro.slice(0, 1000),
      prescricao_envio_iniciado_em: null,
    } as never)
    .eq("id", args.propostaId)
    .eq("company_id", args.companyId);
}

/** Snapshot congelado, para re-render sem reprojetar. */
export async function getSnapshot(args: {
  propostaId: string;
  companyId: string;
}): Promise<PlanoExecucao | null> {
  const admin = createAdminClient();
  const result = await admin
    .from("propostas")
    .select("prescricao_snapshot, company_id")
    .eq("id", args.propostaId)
    .maybeSingle();
  const row = result.data as {
    prescricao_snapshot?: unknown;
    company_id?: string;
  } | null;
  if (!row || row.company_id !== args.companyId) return null;
  const snap = row.prescricao_snapshot;
  if (!snap || typeof snap !== "object") return null;
  return snap as PlanoExecucao;
}
