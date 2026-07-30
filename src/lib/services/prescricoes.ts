import "server-only";

import { createHash } from "node:crypto";

import { canonicalJson } from "@/lib/prescricao/canonical";
import { projetarPlano, type ItemCru } from "@/lib/prescricao/project";
import type { PlanoExecucao, RevisaoRegistro } from "@/lib/prescricao/types";
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
  /** Já emitida antes? Governa idempotência e numeração de revisão. */
  anterior: {
    hash: string | null;
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

  // ── Itens: protocolo + procedimentos avulsos ─────────────────────────
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

  if (protocoloId) {
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
      .select("id, procedure_name, quantity, interval_days, via, cuidados")
      .eq("protocol_id", protocoloId)
      .order("created_at", { ascending: true });
    for (const raw of (itemsResult.data ?? []) as Array<{
      id: string;
      procedure_name: string;
      quantity: number;
      interval_days: number;
      via: string | null;
      cuidados: string | null;
    }>) {
      itens.push({
        ref: raw.id,
        procedure_name: raw.procedure_name,
        quantity: raw.quantity,
        interval_days: raw.interval_days,
        via: raw.via,
        cuidados: raw.cuidados,
      });
    }
  }

  // Procedimentos avulsos vivem em JSONB sem id estável — indexamos por
  // posição. Só entram no cronograma; não têm camada clínica (o form de
  // orçamento não a expõe).
  const adicionais = Array.isArray(proposta.procedimentos_adicionais)
    ? (proposta.procedimentos_adicionais as Array<Record<string, unknown>>)
    : [];
  adicionais.forEach((extra, i) => {
    itens.push({
      ref: `extra:${i}`,
      procedure_name: String(extra.procedure_name ?? "Procedimento"),
      quantity: Number(extra.quantity ?? 1),
      interval_days: Number(extra.interval_days ?? 0),
      via: null,
      cuidados: null,
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

  const anterior = {
    hash: (proposta.prescricao_hash as string | null) ?? null,
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
      feegow_id: str("paciente_id") || null,
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
  });

  return {
    propostaId: args.propostaId,
    companyId: args.companyId,
    pacienteId: str("paciente_id"),
    plano,
    anterior,
  };
}

/** Congela o plano. Sempre chamado ANTES do upload à Feegow. */
export async function salvarSnapshot(args: {
  propostaId: string;
  companyId: string;
  plano: PlanoExecucao;
  hash: string;
  revisao: number;
  userId: string | null;
  inicio: string;
  revisoesAnteriores: RevisaoRegistro[];
}): Promise<void> {
  const admin = createAdminClient();

  // Histórico APPEND-ONLY: o anexo da revisão anterior continua
  // permanentemente no prontuário (a Feegow não expõe delete), então
  // precisamos poder reproduzir o que foi enviado.
  const revisoes: RevisaoRegistro[] = [
    ...args.revisoesAnteriores,
    {
      revisao: args.revisao,
      hash: args.hash,
      gerado_em: args.plano.gerado_em,
      gerado_por: args.userId,
      feegow_em: null,
    },
  ];

  const result = await admin
    .from("propostas")
    .update({
      prescricao_snapshot: args.plano,
      prescricao_hash: args.hash,
      prescricao_revisao: args.revisao,
      prescricao_revisoes: revisoes,
      prescricao_gerada_em: args.plano.gerado_em,
      prescricao_gerada_por: args.userId,
      prescricao_inicio: args.inicio,
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
