import "server-only";

import { z } from "zod";

import {
  cpfFromCustomFields,
  nascimentoFromCustomFields,
} from "@/lib/crm/contacts";

const BASE_URL =
  process.env.HELENA_API_BASE ?? "https://api.helena.run/core/v1";

export class HelenaError extends Error {
  constructor(
    public readonly status: number,
    public readonly path: string,
    public readonly body: unknown,
    message?: string,
  ) {
    super(message ?? `Helena ${status} em ${path}`);
    this.name = "HelenaError";
  }
}

const CompanyAddressSchema = z
  .object({
    country: z.string().nullish(),
    state: z.string().nullish(),
    city: z.string().nullish(),
    neighborhood: z.string().nullish(),
    zipcode: z.string().nullish(),
    number: z.string().nullish(),
    address1: z.string().nullish(),
    address2: z.string().nullish(),
  })
  .nullish();

const CompanySchema = z.object({
  id: z.union([z.number(), z.string()]),
  legalName: z.string().nullish(),
  email: z.string().nullish(),
  phoneNumber: z.string().nullish(),
  documentId: z.string().nullish(),
  documentType: z.string().nullish(),
  active: z.boolean().nullish(),
  address: CompanyAddressSchema,
});

const CompanyListResponseSchema = z.object({
  items: z.array(CompanySchema),
});

export type HelenaCompany = {
  id_company_api: string;
  legalName: string;
  email: string;
  phoneNumber: string;
  documentId: string;
  documentType: string;
  address: {
    country: string;
    state: string;
    city: string;
    neighborhood: string;
    zipcode: string;
    number: string;
    address1: string;
    address2: string;
  };
};

// Schema enxuto: só o que lemos. `customFields` fica `unknown` de propósito —
// é um objeto livre definido por cada conta do CRM, e um shape inesperado ali
// não pode derrubar o contato inteiro (o parse por campo é tolerante).
const ContactSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string().nullish(),
  nameWhatsapp: z.string().nullish(),
  phoneNumber: z.string().nullish(),
  phoneNumberFormatted: z.string().nullish(),
  email: z.string().nullish(),
  customFields: z.unknown(),
});

const ContactFilterResponseSchema = z.object({
  items: z.array(z.unknown()),
  hasMorePages: z.boolean().nullish(),
});

export type HelenaContact = {
  id: string;
  name: string;
  /** Como o CRM devolve: E.164 sem "+", ex.: 5511999999999. */
  phone: string;
  email: string;
  /** 11 dígitos, ou "" quando o contato não tem o campo (nem toda conta tem). */
  cpf: string;
  /** dd/mm/aaaa, ou "". */
  nascimento: string;
};

const CONTACT_TIMEOUT_MS = 8_000;

export function helena(token: string) {
  if (!token) {
    throw new HelenaError(401, "(no path)", null, "Token Helena ausente");
  }

  const fetcher = async (path: string, init: RequestInit = {}) => {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...init.headers,
      },
      cache: "no-store",
    });
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    if (!res.ok) throw new HelenaError(res.status, path, body);
    return body;
  };

  return {
    /** Lista empresas ativas no CRM. Filtra `active === true`. */
    async listCompanies(): Promise<HelenaCompany[]> {
      const raw = await fetcher("/company");
      const parsed = CompanyListResponseSchema.safeParse(raw);
      if (!parsed.success) {
        throw new HelenaError(
          200,
          "/company",
          raw,
          `Resposta inesperada da Helena: ${parsed.error.message}`,
        );
      }
      return parsed.data.items
        .filter((c) => c.active === true)
        .map((c) => ({
          id_company_api: String(c.id ?? ""),
          legalName: String(c.legalName ?? ""),
          email: String(c.email ?? ""),
          phoneNumber: String(c.phoneNumber ?? ""),
          documentId: String(c.documentId ?? ""),
          documentType: String(c.documentType ?? ""),
          address: {
            country: String(c.address?.country ?? ""),
            state: String(c.address?.state ?? ""),
            city: String(c.address?.city ?? ""),
            neighborhood: String(c.address?.neighborhood ?? ""),
            zipcode: String(c.address?.zipcode ?? ""),
            number: String(c.address?.number ?? ""),
            address1: String(c.address?.address1 ?? ""),
            address2: String(c.address?.address2 ?? ""),
          },
        }));
    },

    /**
     * `POST /contact/filter` — contatos por etiqueta, com busca textual do
     * próprio CRM (`textFilter` procura em nome, telefone e e-mail). Os
     * filtros da API são aditivos.
     *
     * `includeDetails: ["CustomFields"]` é obrigatório: sem ele o CRM omite
     * `customFields`, e CPF e nascimento moram lá. `status` é sempre ACTIVE
     * (decisão 2026-09-22). Sem `orderBy` de propósito — o nome do campo de
     * ordenação não está documentado e um valor inválido derrubaria a
     * chamada inteira; a página volta ordenada por nome aqui.
     */
    async filterContacts(args: {
      tagNames: string[];
      textFilter?: string;
      pageNumber?: number;
      /** 1..100 (limite da API). */
      pageSize?: number;
    }): Promise<{ items: HelenaContact[]; hasMorePages: boolean }> {
      const path = "/contact/filter";
      let raw: unknown;
      try {
        raw = await fetcher(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tagNames: args.tagNames,
            textFilter: args.textFilter?.trim() || undefined,
            status: "ACTIVE",
            includeDetails: ["CustomFields"],
            pageNumber: args.pageNumber ?? 1,
            pageSize: Math.min(Math.max(args.pageSize ?? 20, 1), 100),
          }),
          // Esta chamada roda dentro do render de /orcamentos/novo: um CRM
          // lento não pode segurar a página inteira.
          signal: AbortSignal.timeout(CONTACT_TIMEOUT_MS),
        });
      } catch (err) {
        if (err instanceof HelenaError) throw err;
        const timedOut = err instanceof Error && err.name === "TimeoutError";
        throw new HelenaError(
          0,
          path,
          null,
          timedOut
            ? `CRM não respondeu em ${CONTACT_TIMEOUT_MS / 1000}s`
            : `Falha ao chamar o CRM: ${
                err instanceof Error ? err.message : String(err)
              }`,
        );
      }

      const parsed = ContactFilterResponseSchema.safeParse(raw);
      if (!parsed.success) {
        throw new HelenaError(
          200,
          path,
          raw,
          `Resposta inesperada da Helena em ${path}: ${parsed.error.message}`,
        );
      }

      const items = parsed.data.items
        .map((item) => ContactSchema.safeParse(item))
        .filter((r) => r.success)
        .map((r) => r.data)
        .map((c) => ({
          id: String(c.id),
          // Contato de WhatsApp pode não ter `name` preenchido.
          name:
            (c.name ?? "").trim() ||
            (c.nameWhatsapp ?? "").trim() ||
            (c.phoneNumberFormatted ?? "").trim() ||
            String(c.phoneNumber ?? ""),
          phone: String(c.phoneNumber ?? ""),
          email: String(c.email ?? "").trim(),
          cpf: cpfFromCustomFields(c.customFields),
          nascimento: nascimentoFromCustomFields(c.customFields),
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

      return { items, hasMorePages: parsed.data.hasMorePages === true };
    },
  };
}
