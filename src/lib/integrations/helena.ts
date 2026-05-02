import "server-only";

import { z } from "zod";

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
  };
}
