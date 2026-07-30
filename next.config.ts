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
  //
  // ⚠️ REGRA DURA: toda rota nova que gere PDF PRECISA de uma entrada aqui.
  // Esquecer não quebra `npm run build` nem o dev — quebra só em produção,
  // com um erro obscuro de executável não encontrado.
  outputFileTracingIncludes: {
    "/api/contratos/envio-manual": [
      "./node_modules/@sparticuz/chromium/**/*",
    ],
    "/api/prescricoes/gerar": ["./node_modules/@sparticuz/chromium/**/*"],
    "/api/prescricoes/[id]/pdf": ["./node_modules/@sparticuz/chromium/**/*"],
  },
};

export default nextConfig;
