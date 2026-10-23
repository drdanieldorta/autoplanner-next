import { NextResponse } from "next/server";
import { z } from "zod";

import {
  jsonError,
  requireUserWithCompanyOr401,
} from "@/app/api/_lib/api-helpers";
import { feegow, FeegowError } from "@/lib/integrations/feegow";
import { getCompanyCredentials } from "@/lib/integrations/credentials";
import { limparAjustes } from "@/lib/prescricao/ajustes";
import { VIAS } from "@/lib/prescricao/enums";
import { montarItensProtocolo } from "@/lib/services/orcamento-protocolos";
import { createAdminClient } from "@/lib/supabase/admin";
import { prescricaoAjustesSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

const ProcedimentoSchema = z.object({
  procedure_id: z.string(),
  procedure_name: z.string(),
  quantity: z.number().int().positive(),
  value_cents: z.number().int().nonnegative(),
  discount_percent: z.number().int().min(0).max(100).default(0),
  interval_days: z.number().int().nonnegative().default(0),
});

/**
 * Procedimento avulso: o mesmo, mais a camada clínica.
 *
 * Ela vive SÓ aqui, e não em `procedimentos`, porque `procedimentos` é o que
 * alimenta a proposta da Feegow — que não tem campo para via, dose ou
 * cuidados. O avulso não tem linha em `protocol_items` para desviar, então
 * este JSONB é o lar definitivo da camada clínica dele, e é daqui que
 * `loadPrescricaoFonte` a lê.
 */
const ProcedimentoAdicionalSchema = ProcedimentoSchema.extend({
  via: z.enum(VIAS).nullable().optional(),
  dose: z.string().max(120).nullable().optional(),
  inicio_dias: z.number().int().min(0).max(3650).optional(),
  cuidados: z.string().max(500).nullable().optional(),
});

const BodySchema = z.object({
  paciente_id: z.string(),
  paciente_nome: z.string(),
  paciente_cpf: z.string().optional(),
  paciente_email: z.string().optional(),
  paciente_telefone: z.string().optional(),
  paciente_nascimento: z.string().optional(),
  paciente_bairro: z.string().optional(),

  profissional_id: z.string(),
  profissional_nome: z.string(),
  profissional_cpf: z.string().optional(),
  profissional_email: z.string().optional(),
  profissional_especialidade: z.string().optional(),
  profissional_crm: z.string().optional(),
  profissional_sys_user: z.string().optional(),

  protocolo_id: z.string().uuid().nullable().optional(),
  protocolo_nome: z.string().nullable().optional(),

  // Vários protocolos por orçamento (2026-10-22). Só a ESCOLHA vem daqui:
  // quais protocolos, quais itens e a quantidade de cada um. O resto do
  // retrato (`itens_protocolo`) é montado no servidor a partir de
  // `protocol_items`. Ausente = cliente antigo: grava como antes, só com
  // `protocolo_id`, e os documentos leem o protocolo ao vivo.
  protocolos: z
    .array(
      z.object({
        protocolo_id: z.string().uuid(),
        itens: z
          .array(
            z.object({
              ref: z.string().uuid(),
              // Sem teto: `protocolItemSchema` também não tem, e um protocolo
              // salvo com 1000 não pode virar orçamento impossível.
              quantity: z.number().int().positive(),
            }),
          )
          .min(1)
          .max(200),
      }),
    )
    .max(20)
    .optional(),

  // Documentos que o paciente assina. Viram linhas em `proposta_contracts`
  // (na ordem do array) e o booleano do TCLE code-driven. `contract_id`
  // não é mais aceita: a migration migrou os dados e a coluna virou legado.
  contract_ids: z.array(z.string().uuid()).optional().default([]),
  incluir_tcle_padrao: z.boolean().optional().default(false),

  procedimentos: z.array(ProcedimentoSchema).min(1),
  procedimentos_adicionais: z
    .array(ProcedimentoAdicionalSchema)
    .optional()
    .default([]),
  valor_total_cents: z.number().int().nonnegative(),
  discount_percent: z.number().int().min(0).max(100).default(0),

  status_id: z.number().int().positive().default(1),
  payment_method: z.string().nullable().optional(),
  custom_payment_method: z.string().nullable().optional(),
  installments: z.number().int().nullable().optional(),
  installment_value_cents: z.number().int().nullable().optional(),

  // Alimentam o cronograma de aplicações da enfermagem.
  paciente_alergias: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
  prescricao_inicio: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  // ⚠️ Zod não-estrito DESCARTA chave desconhecida em silêncio: sem esta
  // entrada, o delta definido na criação do orçamento sumiria sem erro
  // nenhum, e a folha sairia com a camada clínica do protocolo puro.
  prescricao_ajustes: prescricaoAjustesSchema.optional(),
});

type Body = z.infer<typeof BodySchema>;

/**
 * Cria uma proposta. Substitui:
 *   - n8n `POST /webhook/create-proposta` (modo automático)
 *   - n8n `POST /webhook/modo-manual-autentique` (modo manual)
 *
 * Modo automático (cria a proposta na Feegow antes de salvar) exige as
 * duas coisas: a empresa ter `feegow_token` E o orçamento trazer um
 * paciente da Feegow. Sem paciente da Feegow não há proposta possível lá —
 * é o caso de empresa sem Feegow e também de empresa com Feegow que, em
 * Configurações, escolheu puxar o paciente do CRM ou digitá-lo. O
 * formulário manda `paciente_id: "manual"` nesses casos.
 *
 * Decide pelo payload, não pela preferência salva: o formulário resolveu a
 * origem ao abrir, e trocar a opção com um formulário aberto não pode fazer
 * a rota tentar criar na Feegow um paciente que não é de lá.
 *
 * Em ambos os modos, salva em `propostas` ANTES de retornar e dispara
 * a criação do Authentique em background (Vercel `waitUntil` quando
 * disponível, ou await direto por enquanto).
 */
export async function POST(req: Request) {
  const auth = await requireUserWithCompanyOr401();
  if (!auth.ok) return auth.response;

  let body: Body;
  try {
    body = BodySchema.parse(await req.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Payload inválido", 422);
    }
    return jsonError("Payload inválido", 422);
  }

  // Protocolos ANTES da Feegow: um protocolo editado com o formulário aberto
  // vira 409 aqui, e não uma proposta órfã na Feegow que não se apaga.
  const montagem = body.protocolos
    ? await montarItensProtocolo({
        companyId: auth.user.companyId,
        protocolos: body.protocolos,
      })
    : null;
  if (montagem && !montagem.ok) {
    return jsonError(montagem.error, montagem.status);
  }
  const retrato = montagem?.ok ? montagem : null;

  // Delta clínico só de itens que estão no orçamento: item retirado (ou de
  // protocolo retirado) não pode deixar ajuste órfão no JSONB.
  const ajustesBrutos = body.prescricao_ajustes ?? {};
  const ajustes = retrato
    ? Object.fromEntries(
        Object.entries(ajustesBrutos).filter(([ref]) =>
          retrato.itens.some((i) => i.ref === ref),
        ),
      )
    : ajustesBrutos;

  const creds = await getCompanyCredentials(auth.user.companyId);
  const pacienteDaFeegow =
    body.paciente_id.trim() !== "" && body.paciente_id !== "manual";
  const hasFeegow = !!creds?.feegow_token && pacienteDaFeegow;
  const hasAuthentique = !!creds?.authentique_token;

  const admin = createAdminClient();

  // ───────── 1. Modo automático: cria na Feegow primeiro ─────────
  let id_proposta_api: number | null = null;
  if (hasFeegow) {
    try {
      const feegowResult = await feegow(creds!.feegow_token!).createProposal({
        proposer_id: body.profissional_sys_user ?? "",
        paciente_id: body.paciente_id,
        status_id: body.status_id,
        proposal_date: new Date().toISOString(),
        procedimentos: body.procedimentos.map((p) => ({
          procedimento_id: p.procedure_id,
          quantidade: p.quantity,
          valor: p.value_cents,
          desconto: p.discount_percent ?? 0,
          descricao: p.procedure_name,
          intervalo_dias: p.interval_days ?? 0,
        })),
      });
      id_proposta_api = feegowResult.proposal_id;
    } catch (err) {
      if (err instanceof FeegowError) {
        return jsonError(`Falha ao criar proposta na Feegow: ${err.message}`, 502);
      }
      return jsonError(
        err instanceof Error ? err.message : "Erro Feegow",
        500,
      );
    }
  }

  // ───────── 2. Persiste em propostas (local) ─────────
  const insertResult = await admin
    .from("propostas")
    .insert({
      paciente_id: body.paciente_id,
      paciente_nome: body.paciente_nome,
      paciente_cpf: body.paciente_cpf ?? null,
      paciente_email: body.paciente_email ?? null,
      paciente_telefone: body.paciente_telefone ?? null,
      paciente_nascimento: body.paciente_nascimento ?? null,
      paciente_bairro: body.paciente_bairro ?? null,
      profissional_id: body.profissional_id,
      profissional_nome: body.profissional_nome,
      profissional_cpf: body.profissional_cpf ?? null,
      profissional_email: body.profissional_email ?? null,
      profissional_especialidade: body.profissional_especialidade ?? null,
      profissional_crm: body.profissional_crm ?? null,
      profissional_sys_user: body.profissional_sys_user ?? null,
      protocolo_id: retrato ? retrato.protocoloId : (body.protocolo_id ?? null),
      protocolo_nome: retrato
        ? retrato.protocoloNome
        : (body.protocolo_nome ?? null),
      itens_protocolo: retrato ? retrato.itens : null,
      incluir_tcle_padrao: body.incluir_tcle_padrao,
      procedimentos_adicionais: body.procedimentos_adicionais ?? [],
      valor_total_cents: body.valor_total_cents,
      discount_percent: body.discount_percent,
      status_id: body.status_id,
      status: "rascunho",
      payment_method: body.payment_method ?? null,
      custom_payment_method: body.custom_payment_method ?? null,
      installments: body.installments ?? null,
      installment_value_cents: body.installment_value_cents ?? null,
      paciente_alergias: body.paciente_alergias?.trim() || null,
      observacoes: body.observacoes?.trim() || null,
      prescricao_inicio: body.prescricao_inicio ?? null,
      prescricao_ajustes: limparAjustes(ajustes),
      id_proposta_api,
      user_id: auth.user.id,
      company_id: auth.user.companyId,
    } as never)
    .select("id")
    .single();

  if (insertResult.error) {
    return jsonError(insertResult.error.message, 500);
  }
  const created = insertResult.data as { id: string };

  // Vínculos dos documentos. `ordem` é a posição no array — é ela que decide
  // a sequência das páginas no PDF único que o paciente assina.
  const contractIds = [...new Set(body.contract_ids)];
  if (contractIds.length > 0) {
    const vinculos = await admin.from("proposta_contracts").insert(
      contractIds.map((contract_id, ordem) => ({
        proposta_id: created.id,
        contract_id,
        ordem,
      })) as never,
    );
    // Não derruba o orçamento, que já existe e custou uma chamada à Feegow.
    // O envio do contrato falha com mensagem clara ("nenhum documento
    // selecionado") e a seleção é corrigível na tela de detalhe.
    if (vinculos.error) {
      console.error(
        `[propostas] falha ao vincular documentos da proposta ${created.id}: ${vinculos.error.message}`,
      );
    }
  }

  // ───────── 3. Authentique em background (Fase 5) ─────────
  // O envio para assinatura digital + geração de PDF + upload Feegow
  // ficam a cargo do POST /api/contratos/envio-manual quando o caller
  // quiser disparar Authentique. A response volta imediato.
  void hasAuthentique;

  return NextResponse.json({
    id: created.id,
    id_proposta_api,
    mode: hasFeegow ? "automatic" : "manual",
  });
}
