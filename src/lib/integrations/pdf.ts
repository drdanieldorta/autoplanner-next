import "server-only";

import puppeteer, { type Browser, type LaunchOptions } from "puppeteer-core";

/**
 * HTML → PDF via Puppeteer.
 *
 * Estratégia em três modos selecionados por env:
 *
 * 1. **Vercel / serverless** (`process.env.VERCEL` set OU
 *    `process.env.AWS_LAMBDA_FUNCTION_NAME` set):
 *    usa @sparticuz/chromium — versão slim (~50MB) feita pra runtime serverless.
 *
 * 2. **Local dev** com Chrome instalado: aponte
 *    `PUPPETEER_EXECUTABLE_PATH=/caminho/para/chrome` no `.env.local`.
 *    Caminhos comuns:
 *      - macOS: /Applications/Google Chrome.app/Contents/MacOS/Google Chrome
 *      - Windows: C:/Program Files/Google/Chrome/Application/chrome.exe
 *      - Linux: /usr/bin/google-chrome
 *
 * 3. **CI / build**: pula execução real e devolve buffer vazio
 *    se `process.env.PDF_DISABLE` for "1". Útil pra `next build`.
 *
 * A interface é uma função única: `generatePdfFromHtml(html, options)`.
 * Trocar engine no futuro (Cloud Run, queue+workers) é mudar este arquivo.
 */

export type GeneratePdfOptions = {
  format?: "A4" | "Letter";
  printBackground?: boolean;
  /** margens em CSS (ex: "20mm" ou "0.75in") */
  margin?: { top?: string; right?: string; bottom?: string; left?: string };
  /**
   * Cabeçalho/rodapé repetidos em toda página. Usado pela folha de execução
   * de enfermagem, que é documento clínico e não pode ter página órfã sem
   * identificação do paciente.
   *
   * ⚠️ Ao ligar `displayHeaderFooter`, SEMPRE passe os dois templates. Com
   * apenas `footerTemplate`, o Chrome injeta o cabeçalho padrão dele (data
   * de impressão + título do documento) no topo de todas as páginas.
   * Passar `headerTemplate: "<div></div>"` suprime isso.
   */
  displayHeaderFooter?: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
};

export class PdfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfError";
  }
}

async function launchBrowser(): Promise<Browser> {
  const isServerless = !!(
    process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
  );

  if (isServerless) {
    // dynamic import — @sparticuz/chromium só faz sentido em ambiente serverless
    const chromium = (await import("@sparticuz/chromium")).default;
    const opts: LaunchOptions = {
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    };
    return puppeteer.launch(opts);
  }

  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (!executablePath) {
    throw new PdfError(
      "PUPPETEER_EXECUTABLE_PATH não configurado. Em dev, aponte para o Chrome local. Ex: C:/Program Files/Google/Chrome/Application/chrome.exe",
    );
  }
  return puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

export async function generatePdfFromHtml(
  html: string,
  options: GeneratePdfOptions = {},
): Promise<Buffer> {
  if (process.env.PDF_DISABLE === "1") {
    return Buffer.alloc(0);
  }

  const format = options.format ?? "A4";
  const printBackground = options.printBackground ?? true;
  const margin = options.margin ?? {
    top: "20mm",
    right: "15mm",
    bottom: "20mm",
    left: "15mm",
  };

  let browser: Browser | null = null;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format,
      printBackground,
      margin,
      ...(options.displayHeaderFooter
        ? {
            displayHeaderFooter: true,
            // Vazio explícito: sem isso o Chrome injeta o cabeçalho dele.
            headerTemplate: options.headerTemplate ?? "<div></div>",
            footerTemplate: options.footerTemplate ?? "<div></div>",
          }
        : {}),
    });
    return Buffer.from(pdf);
  } catch (err) {
    throw new PdfError(
      err instanceof Error ? err.message : "Erro ao gerar PDF",
    );
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // ignore
      }
    }
  }
}
