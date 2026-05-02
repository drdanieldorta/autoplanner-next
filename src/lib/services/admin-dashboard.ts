import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type CompanyOverview = {
  id: string;
  name: string;
  has_feegow: boolean;
  has_authentique: boolean;
  has_helena: boolean;
  funcionarios_count: number;
  propostas_count: number;
  last_proposta_at: string | null;
};

/**
 * Carrega o panorama de TODAS as empresas para o dashboard super_admin.
 * Usa o admin client (bypass RLS) porque vamos querer ler dados de
 * empresas que o user NÃO é membro — é exatamente o ponto.
 *
 * Fazemos 4 queries em paralelo e juntamos em memória. Para o volume
 * esperado (dezenas de empresas, milhares de propostas), está bem mais
 * simples que escrever uma view materializada — se isso crescer muito,
 * considerar uma RPC `get_company_overview()` no Postgres.
 */
export async function loadCompanyOverview(): Promise<CompanyOverview[]> {
  const admin = createAdminClient();

  const [companies, credentials, profiles, propostas] = await Promise.all([
    admin.from("companies").select("id, name").order("name"),
    admin
      .from("api_credentials")
      .select("company_id, feegow_token, authentique_token, crm_token"),
    admin.from("profiles").select("company_id"),
    admin
      .from("propostas")
      .select("company_id, created_at")
      .order("created_at", { ascending: false }),
  ]);

  if (companies.error) throw new Error(companies.error.message);
  if (credentials.error) throw new Error(credentials.error.message);
  if (profiles.error) throw new Error(profiles.error.message);
  if (propostas.error) throw new Error(propostas.error.message);

  const credsByCompany = new Map<
    string,
    { feegow: boolean; authentique: boolean; helena: boolean }
  >();
  for (const c of (credentials.data ?? []) as Array<{
    company_id: string;
    feegow_token: string | null;
    authentique_token: string | null;
    crm_token: string | null;
  }>) {
    credsByCompany.set(c.company_id, {
      feegow: !!c.feegow_token,
      authentique: !!c.authentique_token,
      helena: !!c.crm_token,
    });
  }

  const profilesCount = new Map<string, number>();
  for (const p of (profiles.data ?? []) as Array<{
    company_id: string | null;
  }>) {
    if (!p.company_id) continue;
    profilesCount.set(p.company_id, (profilesCount.get(p.company_id) ?? 0) + 1);
  }

  const propostasCount = new Map<string, number>();
  const lastProposta = new Map<string, string>();
  for (const p of (propostas.data ?? []) as Array<{
    company_id: string;
    created_at: string;
  }>) {
    propostasCount.set(p.company_id, (propostasCount.get(p.company_id) ?? 0) + 1);
    if (!lastProposta.has(p.company_id)) {
      // Lista vem ordenada DESC por created_at, então o primeiro é o mais recente
      lastProposta.set(p.company_id, p.created_at);
    }
  }

  return ((companies.data ?? []) as Array<{ id: string; name: string }>).map(
    (c) => ({
      id: c.id,
      name: c.name,
      has_feegow: credsByCompany.get(c.id)?.feegow ?? false,
      has_authentique: credsByCompany.get(c.id)?.authentique ?? false,
      has_helena: credsByCompany.get(c.id)?.helena ?? false,
      funcionarios_count: profilesCount.get(c.id) ?? 0,
      propostas_count: propostasCount.get(c.id) ?? 0,
      last_proposta_at: lastProposta.get(c.id) ?? null,
    }),
  );
}
