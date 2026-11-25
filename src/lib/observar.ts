/** Parte do Sentry que independe de tela. O evento sai sem nada que identifique cliente. */
interface Migalha {
  category?: string;
  message?: string;
  data?: Record<string, unknown>;
}
interface Evento {
  message?: string;
  user?: unknown;
  request?: { url?: string; headers?: unknown; cookies?: unknown; data?: unknown; query_string?: unknown };
  breadcrumbs?: Migalha[];
  exception?: { values?: { value?: string; stacktrace?: { frames?: { vars?: unknown }[] } }[] };
  extra?: unknown;
  spans?: { description?: string; data?: unknown }[];
  transaction?: string;
}

/** Endereço sem busca, sem âncora e com número longo mascarado (CEP, CPF, CNPJ, telefone, anúncio) */
export const limparUrl = (u: string) => u.replace(/[?#].*$/, "").replace(/\d{5,}/g, "#");

/** Texto livre: e-mail, sequência numérica e valor entre aspas somem */
export const limparTexto = (t: string) =>
  t
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]")
    .replace(/https?:\/\/\S+/g, limparUrl)
    .replace(/\d[\d.\-/() ]{5,}\d/g, "[número]")
    .replace(/"[^"]{3,}"/g, '"…"');

export function limparEvento<E>(evento: E): E {
  const e = evento as Evento;
  delete e.user;
  delete e.extra;
  if (e.request) e.request = e.request.url ? { url: limparUrl(e.request.url) } : {};
  if (e.message) e.message = limparTexto(e.message);
  if (e.transaction) e.transaction = limparUrl(e.transaction);
  // clique e console carregam texto da tela: ficam só navegação e rede
  e.breadcrumbs = e.breadcrumbs
    ?.filter((m) => m.category === "navigation" || m.category === "fetch" || m.category === "xhr")
    .map((m) => ({
      category: m.category,
      data: Object.fromEntries(
        Object.entries(m.data ?? {})
          .filter(([k]) => ["url", "from", "to", "method", "status_code"].includes(k))
          .map(([k, v]) => [k, typeof v === "string" ? limparUrl(v) : v]),
      ),
    }));
  for (const x of e.exception?.values ?? []) {
    if (x.value) x.value = limparTexto(x.value);
    for (const f of x.stacktrace?.frames ?? []) delete f.vars;
  }
  for (const s of e.spans ?? []) {
    if (s.description) s.description = limparTexto(limparUrl(s.description));
    delete s.data;
  }
  return evento;
}

export const OBSERVAR = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "local",
  dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false, databaseQueryData: false, stackFrameVariables: false },
  // fração baixa: cabe na cota gratuita
  tracesSampleRate: 0.2,
  // no modo em fluxo a limpeza abaixo seria ignorada
  traceLifecycle: "static" as const,
  beforeSend: limparEvento,
  beforeSendTransaction: limparEvento,
};
