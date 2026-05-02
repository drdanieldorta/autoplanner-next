import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Chromium da @sparticuz traz binários (.br) que NÃO podem ser
  // realocados pelo bundler — precisam ficar em node_modules/@sparticuz/
  // chromium/bin para o launcher achar em runtime na Vercel.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
};

export default nextConfig;
