import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  env: { NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV },
  poweredByHeader: false,
  // o código que vai ao navegador não leva o mapa do fonte
  productionBrowserSourceMaps: false,
  // a pasta do usuário também tem package-lock.json; fixa a raiz aqui
  turbopack: { root: __dirname },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

// o envio passa por /monitor, no próprio domínio: a política de conteúdo não precisa abrir para fora
export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(config, {
      tunnelRoute: "/monitor",
      silent: true,
      telemetry: false,
      sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN, deleteSourcemapsAfterUpload: true },
    })
  : config;
