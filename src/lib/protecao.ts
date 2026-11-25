/** Só o que o painel usa. Origem nova entra aqui, com motivo. */
const CONSULTAS = ["https://viacep.com.br", "https://comunicaapi.pje.jus.br", "https://brasilapi.com.br", "https://publica.cnpj.ws", "https://api.bcb.gov.br"];
const IMAGENS = ["https://img.olx.com.br", "https://resizedimgs.zapimoveis.com.br", "https://resizedimgs.vivareal.com", "https://s01.jetimgs.com"];

export function politica(nonce: string, dev: boolean) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${IMAGENS.join(" ")}`,
    "font-src 'self'",
    `connect-src 'self' ${CONSULTAS.join(" ")}${dev ? " ws:" : ""}`,
    "worker-src 'self' blob:",
    "frame-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

/** Link vindo de fora (portal, coleta, captura) só abre se for https */
export function linkSeguro(u: string | undefined): string | undefined {
  if (!u) return undefined;
  try {
    const x = new URL(u);
    return x.protocol === "https:" && !x.username && !x.password ? x.href : undefined;
  } catch {
    return undefined;
  }
}

/** Ação que gasta crédito só parte do próprio painel */
export function mesmaOrigem(req: Request) {
  const site = req.headers.get("sec-fetch-site");
  if (site) return site === "same-origin";
  const origem = req.headers.get("origin");
  return !!origem && URL.canParse(origem) && new URL(origem).host === req.headers.get("host");
}
