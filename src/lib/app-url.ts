import "server-only";

import { headers } from "next/headers";

/**
 * URL pública do app, sem barra no fim (ex.: `https://infiniteplan.mdia.cloud`).
 *
 * Em produção na Vercel usa o domínio de produção do projeto
 * (`VERCEL_PROJECT_PRODUCTION_URL`, sem protocolo), para que um preview ou
 * um acesso pelo `*.vercel.app` não mostre um endereço que muda a cada
 * deploy. Fora disso, deriva dos headers da requisição atual — por isso só
 * funciona dentro de Server Component, Server Action ou Route Handler.
 */
export async function getAppBaseUrl(): Promise<string> {
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProd) {
    return `https://${vercelProd.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  }

  const h = await headers();
  const host = firstValue(h.get("x-forwarded-host")) ?? firstValue(h.get("host"));
  const proto = firstValue(h.get("x-forwarded-proto")) ?? "https";
  return host ? `${proto}://${host}` : "";
}

/** URL que cada clínica cadastra como webhook na conta da Autentique. */
export async function getAutentiqueWebhookUrl(): Promise<string> {
  return `${await getAppBaseUrl()}/api/webhooks/authentique`;
}

/** Proxies encadeados mandam `a, b`; vale o primeiro. */
function firstValue(value: string | null): string | null {
  const first = value?.split(",")[0]?.trim();
  return first ? first : null;
}
