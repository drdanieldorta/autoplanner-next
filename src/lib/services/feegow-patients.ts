import "server-only";

import { createHash } from "node:crypto";

import { feegow, type FeegowPatient } from "@/lib/integrations/feegow";

/**
 * Pacientes da Feegow para o dropdown do orçamento.
 *
 * A API só pagina (`limit`/`offset`), sem filtro por nome, então a busca é
 * feita aqui sobre a lista inteira. Buscar a lista inteira a cada tecla
 * seria lento demais, por isso ela fica em memória por `TTL_MS`, por
 * empresa e token. Cache em memória, e não no data cache da Vercel: a
 * lista de uma clínica grande passa do limite de tamanho de item de lá, e
 * assim nenhum dado de paciente fica persistido fora do Supabase/Feegow.
 *
 * Paciente cadastrado na Feegow depois do carregamento: quando uma busca
 * não acha ninguém e a lista tem mais de `REFRESH_IF_EMPTY_MS`, ela é
 * recarregada uma vez antes de responder "nenhum paciente".
 */

const TTL_MS = 5 * 60_000;
const REFRESH_IF_EMPTY_MS = 60_000;
export const FEEGOW_PATIENT_PAGE_SIZE = 20;

type Entry = {
  /** Quando a lista CHEGOU (antes de chegar: quando o carregamento começou). */
  at: number;
  promise: Promise<FeegowPatient[]>;
  /** Recarga em curso após uma busca sem resultado (não substitui a lista ainda). */
  refresh?: Promise<FeegowPatient[]>;
};

// globalThis, não um Map no módulo: a página (bundle SSR) e as rotas /api
// (outro bundle) recebem CÓPIAS separadas deste módulo no Next. Um Map de
// módulo fazia o pré-carregamento da página encher um cache que a busca do
// dropdown nunca lia, e a primeira busca recarregava a lista inteira.
const store = globalThis as typeof globalThis & {
  __feegowPatientsCache?: Map<string, Entry>;
};
const cache = (store.__feegowPatientsCache ??= new Map<string, Entry>());

function cacheKey(companyId: string, token: string): string {
  // O token entra só como hash: trocar a chave na Configuração não pode
  // servir a lista da chave antiga, e o token não fica em claro na chave.
  const tokenHash = createHash("sha256").update(token).digest("hex").slice(0, 16);
  return `${companyId}:${tokenHash}`;
}

function load(companyId: string, token: string): Entry {
  const key = cacheKey(companyId, token);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit;
  const promise = feegow(token).listAllPatients();
  const entry: Entry = { at: Date.now(), promise };
  cache.set(key, entry);
  promise.then(
    // A idade conta de quando a lista CHEGOU: uma listagem lenta não pode
    // nascer "velha" e disparar recarga a cada busca sem resultado.
    () => {
      entry.at = Date.now();
    },
    // Falha não fica em cache: a próxima busca tenta de novo.
    () => {
      if (cache.get(key) === entry) cache.delete(key);
    },
  );
  return entry;
}

/**
 * Recarga depois de uma busca sem resultado. A lista em cache continua
 * valendo enquanto a nova não chega (buscas simultâneas não esperam), e só
 * é trocada se a recarga der certo — uma Feegow instável não pode apagar
 * uma lista boa. Uma recarga por vez por entrada.
 */
function refresh(companyId: string, token: string, stale: Entry): Promise<FeegowPatient[]> {
  const key = cacheKey(companyId, token);
  if (!stale.refresh) {
    const promise = feegow(token).listAllPatients();
    stale.refresh = promise;
    promise.then(
      () => {
        if (cache.get(key) === stale) {
          cache.set(key, { at: Date.now(), promise });
        }
        stale.refresh = undefined;
      },
      () => {
        stale.refresh = undefined;
      },
    );
  }
  return stale.refresh;
}

/** Sem acento, sem caixa, espaços colapsados. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Todas as palavras da busca precisam aparecer no nome ("ana tamassia"
 * acha "Ana Luisa Tamassia"); também casa por e-mail e por telefone (a
 * partir de 4 dígitos). Quem começa pelo que foi digitado vem primeiro.
 */
export function filtrarPacientes(
  pacientes: FeegowPatient[],
  q: string,
): FeegowPatient[] {
  const busca = normalizar(q);
  if (!busca) return pacientes;
  const palavras = busca.split(" ");
  const digitos = q.replace(/\D/g, "");
  const achados = pacientes.filter((p) => {
    const nome = normalizar(p.nome);
    if (palavras.every((w) => nome.includes(w))) return true;
    if (p.email && normalizar(p.email).includes(busca)) return true;
    if (digitos.length >= 4 && p.celular.replace(/\D/g, "").includes(digitos)) {
      return true;
    }
    return false;
  });
  const comeca = (p: FeegowPatient) => normalizar(p.nome).startsWith(busca);
  return [
    ...achados.filter(comeca),
    ...achados.filter((p) => !comeca(p)),
  ];
}

export async function searchFeegowPatients(args: {
  companyId: string;
  token: string;
  q: string;
}): Promise<{ items: FeegowPatient[]; hasMore: boolean }> {
  const entry = load(args.companyId, args.token);
  let achados = filtrarPacientes(await entry.promise, args.q);
  if (
    achados.length === 0 &&
    args.q.trim() &&
    Date.now() - entry.at > REFRESH_IF_EMPTY_MS
  ) {
    try {
      achados = filtrarPacientes(
        await refresh(args.companyId, args.token, entry),
        args.q,
      );
    } catch {
      // Feegow instável na recarga: vale a lista em cache, que não achou ninguém.
    }
  }
  return {
    items: achados.slice(0, FEEGOW_PATIENT_PAGE_SIZE),
    hasMore: achados.length > FEEGOW_PATIENT_PAGE_SIZE,
  };
}

/** A lista inteira (rota legada `POST /api/feegow/pacientes`). */
export async function listAllFeegowPatients(args: {
  companyId: string;
  token: string;
}): Promise<FeegowPatient[]> {
  return load(args.companyId, args.token).promise;
}

/**
 * Primeira página para abrir o formulário sem esperar uma clínica grande
 * inteira: espera a lista até `waitMs`; se ela não chegar a tempo, devolve
 * `null` e deixa o carregamento seguir (quem chamar deve mantê-lo vivo com
 * `after`), para a busca do dropdown já encontrar o cache quente.
 */
export async function firstFeegowPatientsPage(args: {
  companyId: string;
  token: string;
  waitMs: number;
}): Promise<{
  page: { items: FeegowPatient[]; hasMore: boolean } | null;
  pending: Promise<unknown>;
}> {
  const entry = load(args.companyId, args.token);
  const timeout = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), args.waitMs),
  );
  const lista = await Promise.race([entry.promise, timeout]);
  return {
    page: lista
      ? {
          items: lista.slice(0, FEEGOW_PATIENT_PAGE_SIZE),
          hasMore: lista.length > FEEGOW_PATIENT_PAGE_SIZE,
        }
      : null,
    pending: entry.promise.catch(() => undefined),
  };
}
