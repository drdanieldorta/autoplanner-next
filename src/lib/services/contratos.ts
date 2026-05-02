import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type ContractRow = Database["public"]["Tables"]["contracts"]["Row"];

export type Contract = ContractRow;

export async function listContracts(args: {
  companyId: string;
  search?: string;
}): Promise<Contract[]> {
  const supabase = await createClient();
  let query = supabase
    .from("contracts")
    .select("*")
    .eq("company_id", args.companyId)
    .order("name", { ascending: true });

  if (args.search) {
    query = query.ilike("name", `%${args.search}%`);
  }

  const result = await query;
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []) as Contract[];
}

export async function getContractById(args: {
  id: string;
  companyId: string;
}): Promise<Contract | null> {
  const supabase = await createClient();
  const result = await supabase
    .from("contracts")
    .select("*")
    .eq("id", args.id)
    .eq("company_id", args.companyId)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? null) as Contract | null;
}

// CONTRACT_VARIABLES vive em @/lib/contracts/variables (sem `import "server-only"`)
// para que possa ser usado tanto em Server Components quanto em Client Components
// (ex: editor de contrato).
