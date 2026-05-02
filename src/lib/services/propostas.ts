import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type PropostaRow = Database["public"]["Tables"]["propostas"]["Row"];

export type Proposta = PropostaRow;

export async function listPropostas(args: {
  companyId: string;
}): Promise<Proposta[]> {
  const supabase = await createClient();
  const result = await supabase
    .from("propostas")
    .select("*")
    .eq("company_id", args.companyId)
    .order("created_at", { ascending: false });
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []) as Proposta[];
}

export async function getPropostaById(args: {
  id: string;
  companyId: string;
}): Promise<Proposta | null> {
  const supabase = await createClient();
  const result = await supabase
    .from("propostas")
    .select("*")
    .eq("id", args.id)
    .eq("company_id", args.companyId)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? null) as Proposta | null;
}
