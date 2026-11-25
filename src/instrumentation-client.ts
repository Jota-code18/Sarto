import { OBSERVAR } from "@/lib/observar";

type Navegou = (url: string, tipo: "push" | "replace" | "traverse") => void;
let navegou: Navegou | undefined;

// só baixa o Sentry quando há DSN
if (OBSERVAR.dsn)
  void import("@sentry/nextjs").then((S) => {
    S.init(OBSERVAR);
    navegou = S.captureRouterTransitionStart as Navegou;
  });

export const onRouterTransitionStart: Navegou = (url, tipo) => navegou?.(url, tipo);
