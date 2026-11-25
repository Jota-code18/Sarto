/** Senha única e opcional do painel (variável PAINEL_SENHA). Sem ela, o painel abre direto. */
export const COOKIE = "sarto_acesso";

export async function carimbo(senha: string) {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(senha), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const s = await crypto.subtle.sign("HMAC", k, enc.encode("painel-sarto-v1"));
  return [...new Uint8Array(s)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Comparação que não vaza o tamanho do acerto pelo tempo */
export function igual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
