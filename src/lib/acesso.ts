/** Senha única e opcional do painel (variável PAINEL_SENHA). Sem ela, o painel abre direto. */
export const COOKIE = "sarto_acesso";
export const DURACAO_DIAS = 14;

async function assinar(senha: string, texto: string) {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(senha), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const s = await crypto.subtle.sign("HMAC", k, enc.encode(texto));
  return [...new Uint8Array(s)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Comparação que não vaza o tamanho do acerto pelo tempo */
function igual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/** Passe com validade dentro da assinatura: cookie copiado deixa de valer sozinho */
export async function emitirPasse(senha: string, agora = Date.now()) {
  const ate = String(agora + DURACAO_DIAS * 864e5);
  return `${ate}.${await assinar(senha, `painel-sarto-v2|${ate}`)}`;
}

export async function passeVale(senha: string, passe: string, agora = Date.now()) {
  const [ate, selo, resto] = passe.split(".");
  if (!ate || !selo || resto !== undefined || !/^\d{13}$/.test(ate) || Number(ate) < agora) return false;
  return igual(selo, await assinar(senha, `painel-sarto-v2|${ate}`));
}

export async function senhaConfere(certa: string, dada: string) {
  const k = "comparacao-sarto";
  return igual(await assinar(k, dada), await assinar(k, certa));
}

const JANELA = 15 * 60e3;
const LIMITE = 8;

/** Trava por endereço depois de 8 erros em 15 minutos. Vale por instância: com o Supabase a trava passa a ser dele. */
export function criarTrava() {
  const erros = new Map<string, number[]>();
  const recentes = (ip: string, agora: number) => (erros.get(ip) ?? []).filter((t) => agora - t < JANELA);
  return {
    travado: (ip: string, agora = Date.now()) => recentes(ip, agora).length >= LIMITE,
    errou(ip: string, agora = Date.now()) {
      if (erros.size > 5000) erros.clear();
      erros.set(ip, [...recentes(ip, agora), agora]);
    },
    acertou: (ip: string) => void erros.delete(ip),
  };
}
