"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const stripDigits = (v: unknown) =>
  typeof v === "string" ? v.replace(/\D/g, "") : "";

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null));

// Documento opcional: guarda SÓ dígitos, ou null.
//
// ⚠️ O formulário mascara enquanto se digita (formatCNPJ/formatCPF em
// empresa-form.tsx), então o que chega aqui vem como "12.924.931/0001-65".
// Gravar assim quebra qualquer busca por documento — e o painel financeiro
// (painel_mdia) está prestes a pôr um CHECK `^[0-9]+$` nessas duas colunas,
// que rejeitaria a escrita inteira com 23514.
const optionalDocumento = z
  .string()
  .trim()
  .optional()
  .transform((v) => stripDigits(v) || null);

const CompanyFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nome da empresa é obrigatório")
    .max(120, "Nome muito longo"),
  cnpj: optionalDocumento,
  nicho: optionalString,
  endereco: optionalString,
  ceo_name: optionalString,
  ceo_cpf: optionalDocumento,
});

export type EmpresaFormState =
  | { ok: true; id: string }
  | { ok: false; error: string }
  | null;

function parseCompany(formData: FormData) {
  return CompanyFormSchema.safeParse({
    name: formData.get("name") ?? "",
    cnpj: formData.get("cnpj") ?? "",
    nicho: formData.get("nicho") ?? "",
    endereco: formData.get("endereco") ?? "",
    ceo_name: formData.get("ceo_name") ?? "",
    ceo_cpf: formData.get("ceo_cpf") ?? "",
  });
}

export async function createEmpresa(
  _prev: EmpresaFormState,
  formData: FormData,
): Promise<EmpresaFormState> {
  await requireSuperAdmin();

  const parsed = parseCompany(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    };
  }

  const supabase = await createClient();
  const result = await supabase
    .from("companies")
    .insert(parsed.data as never)
    .select("id")
    .single();

  const created = result.data as { id: string } | null;
  if (result.error || !created) {
    return {
      ok: false,
      error: result.error?.message ?? "Erro ao criar empresa",
    };
  }

  revalidatePath("/empresas");
  return { ok: true, id: created.id };
}

export async function updateEmpresa(
  _prev: EmpresaFormState,
  formData: FormData,
): Promise<EmpresaFormState> {
  await requireSuperAdmin();

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { ok: false, error: "ID da empresa ausente" };
  }

  const parsed = parseCompany(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    };
  }

  const supabase = await createClient();
  const result = await supabase
    .from("companies")
    .update(parsed.data as never)
    .eq("id", id);

  if (result.error) return { ok: false, error: result.error.message };

  revalidatePath("/empresas");
  revalidatePath(`/empresas/${id}`);
  return { ok: true, id };
}

export async function deleteEmpresaFromForm(formData: FormData) {
  await requireSuperAdmin();

  const id = formData.get("id");
  if (typeof id !== "string" || !id) redirect("/empresas");

  const supabase = await createClient();
  await supabase.from("companies").delete().eq("id", id);

  revalidatePath("/empresas");
  redirect("/empresas");
}

// ───────── Funcionários da empresa (super_admin) ─────────

const AddFuncionarioSchema = z.object({
  company_id: z.string().uuid(),
  name: z.string().trim().min(1, "Nome é obrigatório"),
  email: z.string().trim().email("Email inválido"),
  cpf: z
    .string()
    .trim()
    .min(11, "CPF é obrigatório")
    .transform(stripDigits),
  role: z.string().trim().optional(),
  isAdmin: z.boolean().default(false),
});

export type AddFuncionarioState =
  | { ok: true }
  | { ok: false; error: string }
  | null;

/**
 * Adiciona funcionário a uma empresa específica (chamado pelo painel
 * super_admin). Usa a mesma Edge Function `create-employee` que o flow
 * normal — diferença é que `company_id` vem do formData, não do user.
 */
export async function addFuncionarioToEmpresa(
  _prev: AddFuncionarioState,
  formData: FormData,
): Promise<AddFuncionarioState> {
  await requireSuperAdmin();

  const parsed = AddFuncionarioSchema.safeParse({
    company_id: formData.get("company_id") ?? "",
    name: formData.get("name") ?? "",
    email: formData.get("email") ?? "",
    cpf: formData.get("cpf") ?? "",
    role: formData.get("role") ?? "",
    isAdmin: formData.get("isAdmin") === "on",
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.functions.invoke("create-employee", {
    body: {
      company_id: parsed.data.company_id,
      name: parsed.data.name,
      email: parsed.data.email,
      cpf: parsed.data.cpf,
      role: parsed.data.role || "company_user",
      isAdmin: parsed.data.isAdmin,
    },
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/empresas/${parsed.data.company_id}`);
  return { ok: true };
}

export async function removeFuncionarioFromEmpresa(formData: FormData) {
  await requireSuperAdmin();

  const userId = formData.get("user_id");
  const companyId = formData.get("company_id");
  if (
    typeof userId !== "string" ||
    !userId ||
    typeof companyId !== "string" ||
    !companyId
  ) {
    return;
  }

  const supabase = await createClient();
  await supabase.functions.invoke("delete-user", {
    body: { user_id: userId },
  });

  revalidatePath(`/empresas/${companyId}`);
}

// ───────── Ferramentas vinculadas à empresa ─────────

export async function addToolToEmpresa(formData: FormData) {
  await requireSuperAdmin();

  const companyId = formData.get("company_id");
  const toolId = formData.get("tool_id");
  if (
    typeof companyId !== "string" ||
    !companyId ||
    typeof toolId !== "string" ||
    !toolId
  ) {
    return;
  }

  const supabase = await createClient();
  await supabase
    .from("company_tools")
    .insert({ company_id: companyId, tool_id: toolId, enabled: true } as never);

  revalidatePath(`/empresas/${companyId}`);
}

export async function removeToolFromEmpresa(formData: FormData) {
  await requireSuperAdmin();

  const id = formData.get("id");
  const companyId = formData.get("company_id");
  if (
    typeof id !== "string" ||
    !id ||
    typeof companyId !== "string" ||
    !companyId
  ) {
    return;
  }

  const supabase = await createClient();
  await supabase.from("company_tools").delete().eq("id", id);

  revalidatePath(`/empresas/${companyId}`);
}

// ───────── Vínculo CRM ─────────

const LinkCrmSchema = z.object({
  company_id: z.string().uuid(),
  crm_company_id: z.string().min(1, "Selecione uma empresa CRM"),
  crm_company_name: z.string().min(1),
});

export type LinkCrmState =
  | { ok: true }
  | { ok: false; error: string }
  | null;

export async function linkEmpresaToCrm(
  _prev: LinkCrmState,
  formData: FormData,
): Promise<LinkCrmState> {
  await requireSuperAdmin();

  const parsed = LinkCrmSchema.safeParse({
    company_id: formData.get("company_id") ?? "",
    crm_company_id: formData.get("crm_company_id") ?? "",
    crm_company_name: formData.get("crm_company_name") ?? "",
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    };
  }

  const supabase = await createClient();
  const result = await supabase
    .from("company_crm_links")
    .upsert(
      {
        company_id: parsed.data.company_id,
        crm_company_id: parsed.data.crm_company_id,
        crm_company_name: parsed.data.crm_company_name,
      } as never,
      { onConflict: "company_id" },
    );

  if (result.error) return { ok: false, error: result.error.message };

  revalidatePath(`/empresas/${parsed.data.company_id}`);
  return { ok: true };
}
