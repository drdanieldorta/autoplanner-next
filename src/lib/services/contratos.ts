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

/**
 * Documentos vinculados a uma proposta, em ordem.
 *
 * Usado pela tela de detalhe do orçamento. A MONTAGEM do PDF não passa por
 * aqui: `build-html.ts` faz a leitura com o admin client, como todo o resto
 * daquele arquivo.
 */
export async function listPropostaContracts(args: {
  propostaId: string;
}): Promise<Array<{ id: string; name: string; ordem: number }>> {
  const supabase = await createClient();
  const result = await supabase
    .from("proposta_contracts")
    .select("contract_id, ordem, contracts(id, name)")
    .eq("proposta_id", args.propostaId)
    .order("ordem", { ascending: true });
  if (result.error) throw new Error(result.error.message);

  return ((result.data ?? []) as unknown as Array<{
    contract_id: string;
    ordem: number;
    contracts: { id: string; name: string } | null;
  }>).map((row) => ({
    id: row.contract_id,
    name: row.contracts?.name ?? "Documento removido",
    ordem: row.ordem,
  }));
}

// CONTRACT_VARIABLES vive em @/lib/contracts/variables (sem `import "server-only"`)
// para que possa ser usado tanto em Server Components quanto em Client Components
// (ex: editor de contrato).
