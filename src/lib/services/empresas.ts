import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type CompanyRow = Database["public"]["Tables"]["companies"]["Row"];

export type Company = CompanyRow;

/**
 * Lista todas as empresas. RLS já restringe a super_admin (ver BD.md § 2.3).
 * Caller continua devendo validar `requireSuperAdmin` antes de chamar.
 */
export async function listCompanies(): Promise<Company[]> {
  const supabase = await createClient();
  const result = await supabase
    .from("companies")
    .select("*")
    .order("created_at", { ascending: false });
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []) as Company[];
}

export async function getCompanyById(id: string): Promise<Company | null> {
  const supabase = await createClient();
  const result = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? null) as Company | null;
}
