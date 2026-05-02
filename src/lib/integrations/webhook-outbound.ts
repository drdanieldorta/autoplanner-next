import "server-only";

import { createHmac } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;
type ApiCredentialsRow =
  Database["public"]["Tables"]["api_credentials"]["Row"];
type WebhookEndpointRow =
  Database["public"]["Tables"]["webhook_endpoints"]["Row"];
type WebhookDlqRow = Database["public"]["Tables"]["webhook_dlq"]["Row"];

/**
 * Backoff exponencial em segundos: 30s, 2m, 8m, 32m, 2h, 8h, 24h.
 * Em `attempts >= MAX_ATTEMPTS`, paramos de retentar e deixamos pro user
 * inspecionar via UI futura.
 */
const RETRY_DELAYS_SECONDS = [30, 120, 480, 1920, 7200, 28800, 86400];
export const MAX_ATTEMPTS = RETRY_DELAYS_SECONDS.length;

function nextRunAt(attempts: number): string {
  // Se passamos do limite, fica `null` (sem retry); mas sempre devolvemos
  // um ISO pra simplificar — o caller decide marcar attempts >= MAX para
  // parar.
  const idx = Math.min(attempts, RETRY_DELAYS_SECONDS.length - 1);
  const delaySeconds = RETRY_DELAYS_SECONDS[idx]!;
  return new Date(Date.now() + delaySeconds * 1000).toISOString();
}

function signPayload(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export type OutboundSubscriber = {
  url: string;
  secret: string;
};

/**
 * Resolve as URLs/secrets que devem receber este evento. Combina:
 *   - Linhas de `webhook_endpoints` para tenant + event (enabled=true)
 *   - Fallback legado: `api_credentials.webhook_url` + `webhook_secret`
 *     se `webhook_enabled = true` (compat com o n8n)
 *
 * Dedup por URL — se o usuário cadastrou o mesmo URL nos dois lugares,
 * mandamos só uma vez (com o secret do `webhook_endpoints` precedendo).
 */
export async function getOutboundSubscribers(args: {
  supabase: SupabaseAdmin;
  tenantId: string;
  event: string;
}): Promise<OutboundSubscriber[]> {
  const subs: OutboundSubscriber[] = [];

  const endpointsResult = await args.supabase
    .from("webhook_endpoints")
    .select("url, secret, enabled")
    .eq("tenant_id", args.tenantId)
    .eq("event", args.event)
    .eq("enabled", true);
  if (endpointsResult.error) throw new Error(endpointsResult.error.message);
  const endpoints =
    (endpointsResult.data as Pick<
      WebhookEndpointRow,
      "url" | "secret" | "enabled"
    >[]) ?? [];
  for (const e of endpoints) {
    if (e.url && e.secret) subs.push({ url: e.url, secret: e.secret });
  }

  const legacyResult = await args.supabase
    .from("api_credentials")
    .select("webhook_url, webhook_secret, webhook_enabled")
    .eq("company_id", args.tenantId)
    .maybeSingle();
  const legacy = legacyResult.data as Pick<
    ApiCredentialsRow,
    "webhook_url" | "webhook_secret" | "webhook_enabled"
  > | null;
  if (
    legacy?.webhook_enabled !== false &&
    legacy?.webhook_url &&
    legacy?.webhook_secret
  ) {
    if (!subs.some((s) => s.url === legacy.webhook_url)) {
      subs.push({ url: legacy.webhook_url!, secret: legacy.webhook_secret! });
    }
  }

  return subs;
}

export type DispatchResult = {
  delivered: number;
  enqueued: number;
};

/**
 * Tenta entregar `event` + `payload` para todos os subscribers do tenant.
 * Cada falha (network, 5xx, timeout) vira uma linha em `webhook_dlq`
 * para reprocessamento via Cron.
 *
 * Não joga — falha de delivery NUNCA derruba o caller. Logamos no console
 * e seguimos.
 *
 * Caller deve embrulhar em `waitUntil(...)` no Vercel para não atrasar
 * a response — implementação local awaita por simplicidade.
 */
export async function dispatchWebhook(args: {
  tenantId: string;
  event: string;
  payload: unknown;
  supabase?: SupabaseAdmin;
}): Promise<DispatchResult> {
  const supabase = args.supabase ?? createAdminClient();
  const subs = await getOutboundSubscribers({
    supabase,
    tenantId: args.tenantId,
    event: args.event,
  });

  if (subs.length === 0) return { delivered: 0, enqueued: 0 };

  const body = JSON.stringify({
    event: args.event,
    tenant_id: args.tenantId,
    payload: args.payload,
    timestamp: new Date().toISOString(),
  });

  let delivered = 0;
  let enqueued = 0;
  for (const sub of subs) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-InfinitePlan-Event": args.event,
      "X-InfinitePlan-Signature": signPayload(sub.secret, body),
    };
    try {
      const res = await fetch(sub.url, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) {
        delivered++;
        continue;
      }
      // Não-2xx → DLQ
      await enqueueFailure({
        supabase,
        tenantId: args.tenantId,
        event: args.event,
        url: sub.url,
        body,
        headers,
        status: res.status,
        error: `HTTP ${res.status}`,
      });
      enqueued++;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro desconhecido";
      await enqueueFailure({
        supabase,
        tenantId: args.tenantId,
        event: args.event,
        url: sub.url,
        body,
        headers,
        status: null,
        error: message,
      });
      enqueued++;
    }
  }

  return { delivered, enqueued };
}

async function enqueueFailure(args: {
  supabase: SupabaseAdmin;
  tenantId: string;
  event: string;
  url: string;
  body: string;
  headers: Record<string, string>;
  status: number | null;
  error: string;
}) {
  const result = await args.supabase
    .from("webhook_dlq")
    .insert({
      tenant_id: args.tenantId,
      event: args.event,
      url: args.url,
      payload: JSON.parse(args.body),
      headers: args.headers,
      attempts: 1,
      last_error: args.error,
      last_status: args.status,
      next_run_at: nextRunAt(1),
    } as never);
  if (result.error) {
    console.error(
      "[webhook-outbound] Falha ao gravar DLQ — evento perdido:",
      result.error.message,
      { tenantId: args.tenantId, event: args.event, url: args.url },
    );
  }
}

export type DlqEntry = WebhookDlqRow;

/**
 * Reentregar uma entrada da DLQ. Em sucesso, deleta a linha. Em falha,
 * incrementa attempts + reagenda next_run_at via backoff exponencial.
 *
 * Quando attempts >= MAX_ATTEMPTS, mantém o registro mas seta
 * next_run_at = null (não será mais escolhido pelo cron).
 */
export async function retryDlqEntry(args: {
  supabase: SupabaseAdmin;
  entry: DlqEntry;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const body = JSON.stringify(args.entry.payload);
  const headers = (args.entry.headers ?? {}) as Record<string, string>;

  try {
    const res = await fetch(args.entry.url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      const del = await args.supabase
        .from("webhook_dlq")
        .delete()
        .eq("id", args.entry.id);
      if (del.error) {
        return { ok: false, reason: del.error.message };
      }
      return { ok: true };
    }
    await markRetryFailure({
      supabase: args.supabase,
      entry: args.entry,
      error: `HTTP ${res.status}`,
      status: res.status,
    });
    return { ok: false, reason: `HTTP ${res.status}` };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro desconhecido";
    await markRetryFailure({
      supabase: args.supabase,
      entry: args.entry,
      error: message,
      status: null,
    });
    return { ok: false, reason: message };
  }
}

async function markRetryFailure(args: {
  supabase: SupabaseAdmin;
  entry: DlqEntry;
  error: string;
  status: number | null;
}) {
  const newAttempts = args.entry.attempts + 1;
  const update = await args.supabase
    .from("webhook_dlq")
    .update({
      attempts: newAttempts,
      last_error: args.error,
      last_status: args.status,
      next_run_at:
        newAttempts >= MAX_ATTEMPTS ? null : nextRunAt(newAttempts),
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", args.entry.id);
  if (update.error) {
    console.error(
      "[webhook-outbound] Falha ao marcar retry como falha:",
      update.error.message,
    );
  }
}
