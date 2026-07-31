import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const BASE_URL =
  process.env.AUTHENTIQUE_API_BASE ?? "https://api.autentique.com.br/v2/graphql";

export class AuthentiqueError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    message?: string,
  ) {
    super(message ?? `Authentique ${status}`);
    this.name = "AuthentiqueError";
  }
}

/**
 * Telefone para E.164 (formato exigido pela Authentique).
 *   (11) 99999-9999  → +5511999999999
 *   5511999999999    → +5511999999999
 *   +5511999999999   → +5511999999999
 */
export function phoneToE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11) return `+55${digits}`;
  if (digits.startsWith("55")) return `+${digits}`;
  if (raw.startsWith("+")) return raw.replace(/[^\d+]/g, "");
  return digits ? `+${digits}` : "";
}

type CreateDocumentResult = {
  id: string;
  name: string;
  signatures: Array<{
    name: string;
    email: string | null;
    action: { name: string };
    link: { short_link: string };
    user: { id: string; name: string; email: string | null } | null;
  }>;
};

type SignerInput = {
  name: string;
  phone: string; // será normalizado para E.164
  email?: string;
  action?: "SIGN" | "ACCEPT" | "WITNESS";
};

export function authentique(token: string) {
  if (!token) {
    throw new AuthentiqueError(401, null, "Token Authentique ausente");
  }

  const fetchGraphql = async (
    body: BodyInit,
    headers: Record<string, string>,
  ) => {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, ...headers },
      body,
      cache: "no-store",
    });
    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      // body não-JSON
    }
    if (!res.ok) {
      const msg = extractGraphqlErrorMessage(json) ?? `HTTP ${res.status}`;
      throw new AuthentiqueError(res.status, json, msg);
    }
    if (json && typeof json === "object" && "errors" in json && json.errors) {
      const msg =
        extractGraphqlErrorMessage(json) ?? "GraphQL errors";
      throw new AuthentiqueError(200, json, msg);
    }
    return json as { data: unknown };
  };

  return {
    /**
     * Cria documento e envia para signatários via WhatsApp (default).
     *
     * Implementação multipart-form-data conforme Apollo upload spec.
     * Anexo aceita HTML, PDF, etc — Authentique converte se necessário.
     * Telefone deve estar em E.164 (use `phoneToE164`).
     */
    async createDocument(args: {
      name: string;
      file: { content: Buffer | Blob; filename: string; mimeType: string };
      signers: SignerInput[];
    }): Promise<CreateDocumentResult> {
      const query = `
        mutation CreateDocumentMutation(
          $document: DocumentInput!,
          $signers: [SignerInput!]!,
          $file: Upload!
        ) {
          createDocument(document: $document, signers: $signers, file: $file) {
            id
            name
            signatures {
              name
              email
              action { name }
              link { short_link }
              user { id name email }
            }
          }
        }
      `;

      // Authentique exige email OU phone por signer, não ambos
      // (`only_one_allowed:email,phone`). Como `delivery_method` é fixo
      // em WhatsApp, mandamos apenas o phone — o email do paciente fica
      // em `propostas` para outros usos, mas não vai pro signer.
      const variables = {
        document: { name: args.name },
        signers: args.signers.map((s) => ({
          name: s.name,
          phone: phoneToE164(s.phone),
          delivery_method: "DELIVERY_METHOD_WHATSAPP",
          action: s.action ?? "SIGN",
        })),
        file: null,
      };

      const operations = JSON.stringify({ query, variables });
      const map = JSON.stringify({ "0": ["variables.file"] });

      const form = new FormData();
      form.append("operations", operations);
      form.append("map", map);
      const blob =
        args.file.content instanceof Blob
          ? args.file.content
          : new Blob([new Uint8Array(args.file.content)], {
              type: args.file.mimeType,
            });
      form.append("0", blob, args.file.filename);

      const res = await fetchGraphql(form, {});
      const data = res.data as { createDocument: CreateDocumentResult };
      return data.createDocument;
    },

    /**
     * Devolve URL pública (temporária) do PDF assinado.
     */
    async getSignedFileUrl(documentId: string): Promise<string | null> {
      const query = `query { document(id: "${documentId.replace(/"/g, "")}") { id name files { signed } } }`;
      const res = await fetchGraphql(JSON.stringify({ query }), {
        "Content-Type": "application/json",
      });
      const data = res.data as {
        document: { files?: { signed?: string | null } | null } | null;
      };
      return data.document?.files?.signed ?? null;
    },

    /**
     * Situação do documento para exibir no painel.
     *
     * Lê o estado POR SIGNATÁRIO (`signatures.signed` / `.rejected`),
     * não a presença do arquivo assinado.
     *
     * ⚠️ Não voltar a inferir por `files.signed`: verificado em produção
     * que esse campo vem preenchido mesmo em documento não assinado, o
     * que fazia o painel exibir "assinado" para contrato pendente.
     * `getSignedFileUrl` continua usando esse campo, mas só é chamado
     * pelo webhook — lá a assinatura já é fato consumado pelo evento.
     *
     * `signed: null` significa "não foi possível determinar". Preferimos
     * admitir isso a chutar um estado: dizer "pendente" para um contrato
     * assinado (ou o contrário) é pior que dizer "não sei".
     */
    async getDocumentInfo(documentId: string): Promise<{
      signed: boolean | null;
      rejected: boolean;
      signingLink: string | null;
    }> {
      const id = documentId.replace(/"/g, "");
      const unknown = { signed: null, rejected: false, signingLink: null };

      try {
        const query = `query { document(id: "${id}") { id signatures { name action { name } signed { created_at } rejected { created_at } link { short_link } } } }`;
        const res = await fetchGraphql(JSON.stringify({ query }), {
          "Content-Type": "application/json",
        });
        const doc = (
          res.data as {
            document: {
              signatures?: Array<{
                action?: { name?: string | null } | null;
                signed?: { created_at?: string | null } | null;
                rejected?: { created_at?: string | null } | null;
                link?: { short_link?: string | null } | null;
              }> | null;
            } | null;
          }
        ).document;

        const all = doc?.signatures ?? [];
        if (all.length === 0) return unknown;

        // Só quem precisa assinar conta para o status. Signatário sem
        // `action` declarada é tratado como signatário.
        const signers = all.filter(
          (s) => (s.action?.name ?? "SIGN").toUpperCase() === "SIGN",
        );
        const relevant = signers.length > 0 ? signers : all;

        const rejected = relevant.some((s) => !!s.rejected?.created_at);
        const allSigned = relevant.every((s) => !!s.signed?.created_at);

        return {
          signed: rejected ? false : allSigned,
          rejected,
          signingLink: relevant[0]?.link?.short_link ?? null,
        };
      } catch {
        return unknown;
      }
    },
  };
}

/**
 * Extrai uma mensagem legível do payload GraphQL de erro. Authentique
 * devolve `{ errors: [{ message, extensions: { validation: { campo: [...] } } }] }`
 * tanto para erros HTTP quanto para erros lógicos com 200 OK.
 */
function extractGraphqlErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const errors = (payload as { errors?: unknown }).errors;
  if (!Array.isArray(errors) || errors.length === 0) return null;
  const parts: string[] = [];
  for (const e of errors) {
    if (!e || typeof e !== "object") continue;
    const message = (e as { message?: unknown }).message;
    const validation = (e as { extensions?: { validation?: unknown } })
      .extensions?.validation;
    if (validation && typeof validation === "object") {
      const flat = Object.entries(validation as Record<string, unknown>)
        .flatMap(([field, msgs]) =>
          Array.isArray(msgs)
            ? msgs.map((m) => `${field}: ${String(m)}`)
            : [`${field}: ${String(msgs)}`],
        )
        .join(" · ");
      if (flat) parts.push(flat);
    } else if (typeof message === "string" && message) {
      parts.push(message);
    }
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * Valida HMAC SHA-256 do header `x-autentique-signature` no callback.
 * O n8n hoje NÃO valida — implementar aqui é obrigatório no alvo.
 */
export function verifyAuthentiqueSignature(args: {
  rawBody: string;
  signatureHeader: string | null;
  secret: string;
}): boolean {
  if (!args.signatureHeader || !args.secret) return false;
  const expected = createHmac("sha256", args.secret)
    .update(args.rawBody, "utf8")
    .digest("hex");
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(args.signatureHeader.trim(), "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
