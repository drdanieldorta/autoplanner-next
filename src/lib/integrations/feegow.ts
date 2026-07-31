import "server-only";

import { z } from "zod";

const BASE_URL =
  process.env.FEEGOW_API_BASE ?? "https://api.feegow.com/v1/api";

export class FeegowError extends Error {
  constructor(
    public readonly status: number,
    public readonly path: string,
    public readonly body: unknown,
    message?: string,
  ) {
    super(message ?? `Feegow ${status} em ${path}`);
    this.name = "FeegowError";
  }
}

// ───────── Schemas (validam respostas, evitam confiar em `any`) ─────────

/**
 * Padrão observado no workflow n8n: respostas vêm em `body.content.content[]`
 * (caminho duplo). Encapsulamos para o caller não precisar lidar com isso.
 */
const ProcedureSchema = z.object({
  procedimento_id: z.union([z.number(), z.string()]),
  nome: z.string().nullish(),
  tempo: z.union([z.number(), z.string()]).nullish(),
  // Feegow já devolve em centavos (validado em N8N.md ficha 1).
  valor: z.number().nullish(),
});
export type FeegowProcedure = {
  procedimento_id: string;
  nome: string;
  tempo: string;
  valor: number;
};

const PatientListItemSchema = z.object({
  patient_id: z.union([z.number(), z.string()]),
  nome: z.string().nullish(),
  nascimento: z.string().nullish(),
  celular: z.string().nullish(),
  bairro: z.string().nullish(),
  email: z.string().nullish(),
});
export type FeegowPatient = {
  paciente_id: string;
  nome: string;
  nascimento: string;
  celular: string;
  bairro: string;
  email: string;
};

const ProfessionalSchema = z.object({
  profissional_id: z.union([z.number(), z.string()]),
  nome: z.string().nullish(),
  email: z.string().nullish(),
  cpf: z.string().nullish(),
  documento_conselho: z.string().nullish(),
  especialidades: z
    .array(z.object({ nome_especialidade: z.string().nullish() }))
    .nullish(),
  sys_user: z.union([z.number(), z.string()]).nullish(),
});
export type FeegowProfessional = {
  profissional_id: string;
  nome: string;
  email: string;
  cpf: string;
  crm: string;
  especialidade: string;
  sys_user: string;
};

// Schema enxuto: só os campos que efetivamente lemos. Não validamos
// `email` nem `nome` aqui porque `email` da Feegow vem como array
// (["primario@x.com",""]) e quebraria `z.string()` — derrubaria o
// parse inteiro. Endereço vem em campos planos no nível raiz.
const PatientSearchSchema = z.object({
  documentos: z.object({ cpf: z.string().nullish() }).nullish(),
  nascimento: z.string().nullish(),
  endereco: z.string().nullish(),
  numero: z.string().nullish(),
  complemento: z.string().nullish(),
  bairro: z.string().nullish(),
  cidade: z.string().nullish(),
  estado: z.string().nullish(),
  cep: z.string().nullish(),
});

const ProposalCreateResponseSchema = z.object({
  content: z.object({
    proposal_id: z.number(),
    total: z.number().nullish(),
  }),
});

// ───────── Cliente factory ─────────

type FeegowProcedureItem = {
  procedimento_id: string | number;
  quantidade: number;
  valor: number; // em centavos (vamos converter para reais antes de enviar)
  desconto: number; // % 0–100
  descricao?: string;
  intervalo_dias?: number;
};

export function feegow(token: string) {
  if (!token) {
    throw new FeegowError(401, "(no path)", null, "Token Feegow ausente");
  }

  const fetcher = async <T>(
    path: string,
    init: RequestInit = {},
    schema?: z.ZodType<T>,
  ): Promise<T> => {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        "x-access-token": token,
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

    if (!res.ok) {
      throw new FeegowError(res.status, path, body);
    }

    if (schema) {
      try {
        return schema.parse(body);
      } catch (err) {
        throw new FeegowError(
          200,
          path,
          body,
          `Resposta inesperada da Feegow em ${path}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
    return body as T;
  };

  /** Espelha o padrão `body.content.content[]` da Feegow. */
  const unwrapList = (raw: unknown): unknown[] => {
    if (!raw || typeof raw !== "object") return [];
    const r = raw as { content?: { content?: unknown[] } | unknown[] };
    if (Array.isArray(r.content)) return r.content;
    if (
      r.content &&
      typeof r.content === "object" &&
      "content" in r.content &&
      Array.isArray((r.content as { content?: unknown }).content)
    ) {
      return (r.content as { content: unknown[] }).content;
    }
    return [];
  };

  return {
    /** Lista procedimentos (valor em centavos). */
    async listProcedures(): Promise<FeegowProcedure[]> {
      const raw = await fetcher<unknown>("/procedures/list");
      const list = unwrapList(raw);
      return list
        .map((item) => ProcedureSchema.safeParse(item))
        .filter((r) => r.success)
        .map((r) => r.data)
        .map((p) => ({
          procedimento_id: String(p.procedimento_id),
          nome: String(p.nome ?? ""),
          tempo: String(p.tempo ?? ""),
          valor: Number(p.valor ?? 0),
        }));
    },

    /** Lista pacientes. ⚠️ Hard-cap de 1500 pelo n8n original — ver N8N.md ficha 3. */
    async listPatients(opts: { limit?: number } = {}): Promise<FeegowPatient[]> {
      const limit = opts.limit ?? 1500;
      const raw = await fetcher<unknown>(`/patient/list?limit=${limit}`);
      const list = unwrapList(raw);
      return list
        .map((item) => PatientListItemSchema.safeParse(item))
        .filter((r) => r.success)
        .map((r) => r.data)
        .sort((a, b) =>
          (a.nome ?? "").localeCompare(b.nome ?? "", "pt-BR"),
        )
        .map((p) => ({
          paciente_id: String(p.patient_id),
          nome: String(p.nome ?? ""),
          nascimento: String(p.nascimento ?? ""),
          celular: String(p.celular ?? ""),
          bairro: String(p.bairro ?? ""),
          email: String(p.email ?? ""),
        }));
    },

    /**
     * Busca paciente por id e devolve campos que `/patient/list` não traz
     * (CPF + endereço completo + nascimento). Shape confirmado:
     *   { success, content: { documentos: { cpf, ... }, endereco, numero,
     *     complemento, bairro, cidade, estado, cep, nascimento, ... } }
     *
     * Nascimento vem como "DD-MM-YYYY" e é convertido para "DD/MM/YYYY"
     * (padrão br-BR usado no resto do projeto).
     */
    async searchPatient(pacienteId: string): Promise<{
      cpf: string;
      nascimento: string;
      endereco: string;
      numero: string;
      complemento: string;
      bairro: string;
      cidade: string;
      estado: string;
      cep: string;
    } | null> {
      const path = `/patient/search?paciente_id=${encodeURIComponent(pacienteId)}`;
      const raw = await fetcher<unknown>(path);
      if (!raw || typeof raw !== "object") return null;

      const content = (raw as { content?: unknown }).content;
      if (!content || typeof content !== "object") return null;

      const parsed = PatientSearchSchema.safeParse(content);
      if (!parsed.success) return null;

      const nascRaw = parsed.data.nascimento ?? "";
      const nascimento = /^\d{2}-\d{2}-\d{4}$/.test(nascRaw)
        ? nascRaw.replace(/-/g, "/")
        : nascRaw;

      return {
        cpf: parsed.data.documentos?.cpf ?? "",
        nascimento,
        endereco: parsed.data.endereco ?? "",
        numero: parsed.data.numero ?? "",
        complemento: parsed.data.complemento ?? "",
        bairro: parsed.data.bairro ?? "",
        cidade: parsed.data.cidade ?? "",
        estado: parsed.data.estado ?? "",
        cep: parsed.data.cep ?? "",
      };
    },

    /** Lista profissionais. */
    async listProfessionals(): Promise<FeegowProfessional[]> {
      const raw = await fetcher<unknown>("/professional/list");
      const list = unwrapList(raw);
      return list
        .map((item) => ProfessionalSchema.safeParse(item))
        .filter((r) => r.success)
        .map((r) => r.data)
        .map((p) => ({
          profissional_id: String(p.profissional_id),
          nome: String(p.nome ?? ""),
          email: String(p.email ?? ""),
          cpf: String(p.cpf ?? ""),
          crm: String(p.documento_conselho ?? ""),
          especialidade: String(
            p.especialidades?.[0]?.nome_especialidade ?? "",
          ),
          sys_user: String(p.sys_user ?? ""),
        }));
    },

    /**
     * Cria proposta. Espelha o n8n:
     *   - converte cents → reais (Feegow não aceita centavos)
     *   - expande quantidade > 1 em N items qty 1 (limitação Feegow)
     *   - unidade_id sempre 0
     *
     * Retorna `proposal_id` (int) e `total` da Feegow.
     */
    async createProposal(args: {
      proposer_id: string;
      paciente_id: string;
      status_id: number;
      proposal_date: string;
      procedimentos: FeegowProcedureItem[];
    }): Promise<{ proposal_id: number; total: number | null }> {
      const expanded = args.procedimentos.flatMap((proc) => {
        const valorReais = proc.valor / 100;
        const descontoReais = (proc.desconto ?? 0) / 100;
        return Array.from({ length: Math.max(1, proc.quantidade) }, () => ({
          procedimento_id: proc.procedimento_id,
          quantidade: 1,
          valor: valorReais,
          desconto: descontoReais,
          descricao: proc.descricao ?? "",
          intervalo_dias: proc.intervalo_dias ?? 0,
        }));
      });

      const raw = await fetcher(
        "/proposal/create",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            proposer_id: args.proposer_id,
            status_id: args.status_id,
            procedimentos: expanded,
            unidade_id: 0,
            proposal_date: args.proposal_date,
            paciente_id: args.paciente_id,
          }),
        },
        ProposalCreateResponseSchema,
      );

      return {
        proposal_id: raw.content.proposal_id,
        total: raw.content.total ?? null,
      };
    },

    /** Atualiza status da proposta na Feegow. */
    async changeProposalStatus(args: {
      proposal_id: number;
      status_id: number;
    }): Promise<void> {
      await fetcher<unknown>("/proposal/change-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args),
      });
    },

    /**
     * Anexa um PDF base64 ao prontuário do paciente.
     * O `base64` deve incluir o prefixo `data:application/pdf;base64,`
     * (obrigatório aqui — o `laudo_base64` de /medical-reports/create é o
     * inverso, base64 cru; inconsistência da própria Feegow).
     *
     * ⚠️ Diferente dos outros métodos deste cliente, este VALIDA O ENVELOPE.
     * A convenção da Feegow é `{"success": true, "content": ...}` — ou seja,
     * `success` é o canal de erro da API, e um HTTP 200 com
     * `{"success": false}` é uma FALHA. O `fetcher` só lança em `!res.ok`,
     * então sem esta checagem um upload rejeitado (paciente inexistente,
     * arquivo grande demais) seria registrado como entregue.
     *
     * Isso importa mais aqui do que em qualquer outro ponto: é o que decide
     * se `prescricao_feegow_em` é gravado, e a enfermagem confia no
     * prontuário. Não existe endpoint de leitura de anexos para conferir
     * depois, nem delete para desfazer.
     */
    async uploadBase64ToPatient(args: {
      paciente_id: string;
      base64: string;
      arquivo_descricao: string;
    }): Promise<unknown> {
      const path = "/patient/upload-base64";
      const raw = await fetcher<unknown>(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paciente_id: args.paciente_id,
          base64_file: args.base64,
          arquivo_descricao: args.arquivo_descricao,
        }),
      });

      if (raw && typeof raw === "object" && "success" in raw) {
        const success = (raw as { success?: unknown }).success;
        // Só `false` explícito é falha. `undefined` passa: este endpoint não
        // tem exemplo de resposta salvo em nenhum lugar da documentação, e
        // não queremos rejeitar um envelope legítimo mas não documentado.
        if (success === false) {
          throw new FeegowError(
            200,
            path,
            raw,
            `Feegow recusou o anexo: ${JSON.stringify(raw).slice(0, 400)}`,
          );
        }
      }

      return raw;
    },
  };
}
