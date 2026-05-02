import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  retryDlqEntry,
  type DlqEntry,
} from "@/lib/integrations/webhook-outbound";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Cron Vercel — reprocessa entradas elegíveis da `webhook_dlq`.
 *
 * Auth:
 * - Vercel Cron envia `Authorization: Bearer ${CRON_SECRET}` (ver
 *   `vercel.json`). Aceitamos também a invocação manual via mesmo header
 *   para debug em produção.
 * - Em dev local, configurar `CRON_SECRET` no `.env.local`.
 *
 * Critério: `next_run_at <= now()` AND `next_run_at IS NOT NULL`
 * (após `attempts >= MAX_ATTEMPTS` setamos null para parar).
 *
 * Limite por execução: 50 entradas por chamada — evita estourar o
 * timeout do Cron Vercel quando a fila está muito grande. Se houver
 * mais, o próximo tick pega o restante.
 */
const BATCH_SIZE = 50;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET não configurado no servidor" },
      { status: 500 },
    );
  }
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  const result = await supabase
    .from("webhook_dlq")
    .select("*")
    .lte("next_run_at", nowIso)
    .not("next_run_at", "is", null)
    .order("next_run_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (result.error) {
    return NextResponse.json(
      { error: result.error.message },
      { status: 500 },
    );
  }

  const entries = (result.data ?? []) as DlqEntry[];
  if (entries.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  // Processa em paralelo limitado — fetch já tem timeout interno (10s).
  const outcomes = await Promise.all(
    entries.map((entry) => retryDlqEntry({ supabase, entry })),
  );

  const succeeded = outcomes.filter((o) => o.ok).length;
  const failed = outcomes.length - succeeded;

  return NextResponse.json({
    ok: true,
    processed: entries.length,
    succeeded,
    failed,
  });
}
