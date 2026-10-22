/**
 * Leitura do payload do webhook da Autentique (o código chama de
 * "Authentique").
 *
 * Módulo NEUTRO e PURO: sem `server-only`, sem Next, sem rede. Recebe o JSON
 * já parseado e nunca lança — payload estranho vira campos `null`.
 *
 * Formato real (verificado no pacote público
 * `jeffersongoncalves/laravel-autentique`, `Events/WebhookReceived.php` e
 * `Jobs/ProcessWebhookCall.php`):
 *
 *   { "event": { "id": "...", "type": "signature.accepted", "data": ... } }
 *
 * O RECURSO do evento é `event.data.object` quando esse campo é um objeto;
 * senão é o próprio `event.data`. A Autentique manda os dois formatos — no
 * segundo, `object` é a string "document" / "signature".
 *
 *   - `signature.*`: o recurso é uma assinatura → `{ public_id, document: "<id do documento>", ... }`
 *   - `document.*`: o recurso é um documento → `{ id: "<id do documento>", ... }`
 *
 * O formato antigo que a rota lia (`event.data.document` string) continua
 * aceito como último recurso, para qualquer tipo.
 */

export type AutentiqueEvent = {
  eventId: string | null;
  type: string | null;
  documentId: string | null;
};

/**
 * Tipos que PODEM significar "documento assinado". São gatilho, não prova:
 * a rota confirma na API da Autentique antes de carimbar.
 *
 *   - `signature.accepted`: um signatário assinou (pode faltar outro).
 *   - `document.finished`: todos assinaram.
 *   - `signed`: nome legado, mantido por compatibilidade.
 */
export const AUTENTIQUE_SIGNED_EVENT_TYPES: ReadonlySet<string> = new Set([
  "signature.accepted",
  "document.finished",
  "signed",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function parseAutentiqueEvent(payload: unknown): AutentiqueEvent {
  const empty: AutentiqueEvent = { eventId: null, type: null, documentId: null };
  if (!isPlainObject(payload)) return empty;
  const event = payload.event;
  if (!isPlainObject(event)) return empty;

  const eventId = nonEmptyString(event.id);
  const type = nonEmptyString(event.type);

  const data = event.data;
  const resource = isPlainObject(data)
    ? isPlainObject(data.object)
      ? data.object
      : data
    : null;

  let documentId: string | null = null;
  if (resource) {
    documentId = type?.startsWith("document.")
      ? nonEmptyString(resource.id)
      : nonEmptyString(resource.document);
  }
  // Formato legado (`event.data.document` string), para qualquer tipo.
  if (!documentId && isPlainObject(data)) {
    documentId = nonEmptyString(data.document);
  }

  return { eventId, type, documentId };
}
