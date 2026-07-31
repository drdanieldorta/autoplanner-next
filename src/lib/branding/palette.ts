/**
 * Paleta da identidade visual usada nos documentos gerados.
 *
 * Arquivo neutro (sem `import "server-only"`): o form de configuração é
 * Client Component e precisa dos mesmos defaults e da mesma validação
 * que o render server-side do PDF.
 */

/** Cor de referência do documento quando a empresa não configurou nada. */
export const DOC_FALLBACK_PRIMARY = "#111111";
export const DOC_FALLBACK_SECONDARY = "#e5e7eb";

export const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;

/** Aceita `abc123` ou `#ABC123`; devolve `#abc123` ou null se inválido. */
export function normalizeHex(value: string | null | undefined): string | null {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;
  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  return HEX_COLOR_RE.test(withHash) ? withHash.toLowerCase() : null;
}

function toRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function toHex(r: number, g: number, b: number): string {
  const clamp = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${clamp(r)}${clamp(g)}${clamp(b)}`;
}

/** Mistura com branco. `amount` 0 = cor original, 1 = branco puro. */
export function tint(hex: string, amount: number): string {
  const [r, g, b] = toRgb(hex);
  const a = Math.max(0, Math.min(1, amount));
  return toHex(r + (255 - r) * a, g + (255 - g) * a, b + (255 - b) * a);
}

/** Luminância relativa (WCAG 2.x). */
function luminance(hex: string): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = toRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * Preto ou branco — o que tiver melhor contraste sobre `background`.
 * Evita texto ilegível quando a empresa escolhe uma secundária escura.
 */
export function readableOn(background: string): string {
  const l = luminance(background);
  const contrastWithWhite = 1.05 / (l + 0.05);
  const contrastWithBlack = (l + 0.05) / 0.05;
  return contrastWithWhite >= contrastWithBlack ? "#ffffff" : "#111111";
}

export type DocPalette = {
  primary: string;
  secondary: string;
  /** Cor de texto legível sobre `secondary`. */
  onSecondary: string;
};

/**
 * Resolve a paleta final do documento.
 *
 * Sem secundária configurada, deriva um tom claro da primária — assim a
 * empresa só precisa escolher uma cor para o documento ficar coerente.
 */
export function resolveDocPalette(
  primary: string | null | undefined,
  secondary: string | null | undefined,
): DocPalette {
  const p = normalizeHex(primary);
  const s = normalizeHex(secondary);
  const resolvedPrimary = p ?? DOC_FALLBACK_PRIMARY;
  const resolvedSecondary = s ?? (p ? tint(p, 0.86) : DOC_FALLBACK_SECONDARY);
  return {
    primary: resolvedPrimary,
    secondary: resolvedSecondary,
    onSecondary: readableOn(resolvedSecondary),
  };
}
