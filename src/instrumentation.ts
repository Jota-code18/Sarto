import * as Sentry from "@sentry/nextjs";
import { OBSERVAR } from "@/lib/observar";

/** Servidor: erros e rastreamento por OpenTelemetry. Sem DSN, não faz nada. */
export function register() {
  if (OBSERVAR.dsn) Sentry.init(OBSERVAR);
}

export const onRequestError: typeof Sentry.captureRequestError = (...a) => {
  if (OBSERVAR.dsn) Sentry.captureRequestError(...a);
};
