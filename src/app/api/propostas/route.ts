import { NextResponse } from "next/server";
import { z } from "zod";

import {
  jsonError,
  requireUserWithCompanyOr401,
} from "@/app/api/_lib/api-helpers";
import { feegow, FeegowError } from "@/lib/integrations/feegow";
import { getCompanyCredentials } from "@/lib/integrations/credentials";
import { dispatchWebhook } from "@/lib/integrations/webhook-outbound";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const ProcedimentoSchema = z.object({
  procedure_id: z.string(),
  procedure_name: z.string(),
  quantity: z.number().int().positive(),
  value_cents: z.number().int().nonnegative(),
  discount_percent: z.number().int().min(0).max(100).default(0),
  interval_days: z.number().int().nonnegative().default(0),
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
  contract_id: z.string().uuid().nullable().optional(),

  procedimentos: z.array(ProcedimentoSchema).min(1),
  procedimentos_adicionais: z.array(ProcedimentoSchema).optional().default([]),
  valor_total_cents: z.number().int().nonnegative(),
  discount_percent: z.number().int().min(0).max(100).default(0),

  status_id: z.number().int().positive().default(1),
  payment_method: z.string().nullable().optional(),
  custom_payment_method: z.string().nullable().optional(),
  installments: z.number().int().nullable().optional(),
  installment_value_cents: z.number().int().nullable().optional(),
});

type Body = z.infer<typeof BodySchema>;

/**
 * Cria uma proposta. Substitui:
 *   - n8n `POST /webhook/create-proposta` (modo automático)
 *   - n8n `POST /webhook/modo-manual-autentique` (modo manual)
 *
 * Comportamento determinado pelas credenciais da empresa:
 *   - Tem `feegow_token` → modo automático (cria na Feegow + Authentique)
 *   - Sem `feegow_token` → modo manual (salva local; Authentique opcional)
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

  const creds = await getCompanyCredentials(auth.user.companyId);
  const hasFeegow = !!creds?.feegow_token;
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
      protocolo_id: body.protocolo_id ?? null,
      protocolo_nome: body.protocolo_nome ?? null,
      contract_id: body.contract_id ?? null,
      procedimentos_adicionais: body.procedimentos_adicionais ?? [],
      valor_total_cents: body.valor_total_cents,
      discount_percent: body.discount_percent,
      status_id: body.status_id,
      status: "pending",
      payment_method: body.payment_method ?? null,
      custom_payment_method: body.custom_payment_method ?? null,
      installments: body.installments ?? null,
      installment_value_cents: body.installment_value_cents ?? null,
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

  // ───────── 3. Authentique em background (Fase 5) ─────────
  // O envio para assinatura digital + geração de PDF + upload Feegow
  // viram um job de fila quando ativarmos webhook_dlq + Cron Vercel.
  // Por enquanto a response volta imediato e o caller chama
  // POST /api/contratos/envio-manual separadamente se quiser disparar
  // Authentique sem esperar.
  void hasAuthentique;

  // Notifica subscribers externos do tenant (DLQ cuida de retry).
  await dispatchWebhook({
    tenantId: auth.user.companyId,
    event: "proposal.created",
    payload: {
      proposta_id: created.id,
      id_proposta_api,
      paciente_id: body.paciente_id,
      paciente_nome: body.paciente_nome,
      profissional_nome: body.profissional_nome,
      valor_total_cents: body.valor_total_cents,
      mode: hasFeegow ? "automatic" : "manual",
    },
  });

  return NextResponse.json({
    id: created.id,
    id_proposta_api,
    mode: hasFeegow ? "automatic" : "manual",
  });
}
