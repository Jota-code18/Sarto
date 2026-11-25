/** Erro que chegou à tela vai para a observabilidade, se ligada */
export function avisarErro(e: Error) {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) void import("@sentry/nextjs").then((S) => S.captureException(e));
}
