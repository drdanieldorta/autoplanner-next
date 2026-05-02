import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Chromium da @sparticuz traz binários (.br) que NÃO podem ser
  // realocados pelo bundler — precisam ficar em node_modules/@sparticuz/
  // chromium/bin para o launcher achar em runtime na Vercel.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  // Externalizar evita bundling, mas o file tracer da Vercel ainda
  // precisa SABER que os binários do Chromium devem ser copiados pro
  // deployment — eles são lidos em runtime via path resolvido por
  // chromium.executablePath(), nunca via import. Sem isso a pasta
  // bin/ some no /var/task da função serverless.
  outputFileTracingIncludes: {
    "/api/contratos/envio-manual": [
      "./node_modules/@sparticuz/chromium/**/*",
    ],
  },
};

export default nextConfig;
