import { describe, expect, it } from "vitest";
import { criarTrava, DURACAO_DIAS, emitirPasse, passeVale, senhaConfere } from "./acesso";
import { linkSeguro, mesmaOrigem, politica } from "./protecao";

const T = 1_800_000_000_000;
const DIA = 864e5;

describe("passe de entrada", () => {
  it("vale até o prazo e só com a mesma senha", async () => {
    const p = await emitirPasse("s1", T);
    expect(await passeVale("s1", p, T)).toBe(true);
    expect(await passeVale("s1", p, T + DURACAO_DIAS * DIA + 1)).toBe(false);
    expect(await passeVale("s2", p, T)).toBe(false);
  });
  it("recusa validade esticada e lixo", async () => {
    const [ate, selo] = (await emitirPasse("s1", T)).split(".");
    expect(await passeVale("s1", `${Number(ate) + DIA}.${selo}`, T)).toBe(false);
    for (const x of ["", ".", "abc", `${ate}.`, `${ate}.${selo}.x`, `1e13.${selo}`]) expect(await passeVale("s1", x, T)).toBe(false);
  });
  it("confere a senha", async () => {
    expect(await senhaConfere("abc", "abc")).toBe(true);
    expect(await senhaConfere("abc", "abd")).toBe(false);
    expect(await senhaConfere("abc", "")).toBe(false);
  });
});

describe("trava de tentativas", () => {
  it("trava no oitavo erro, solta em 15 minutos e zera no acerto", () => {
    const t = criarTrava();
    for (let i = 0; i < 7; i++) t.errou("a", T);
    expect(t.travado("a", T)).toBe(false);
    t.errou("a", T);
    expect(t.travado("a", T)).toBe(true);
    expect(t.travado("b", T)).toBe(false);
    expect(t.travado("a", T + 16 * 60e3)).toBe(false);
    t.acertou("a");
    expect(t.travado("a", T)).toBe(false);
  });
});

describe("links e origem", () => {
  it("só https abre", () => {
    expect(linkSeguro("https://go.olx.com.br/x-1")).toBe("https://go.olx.com.br/x-1");
    for (const u of ["javascript:alert(1)", "data:text/html,x", "http://x.com", "https://a:b@x.com", "nada", "", undefined]) expect(linkSeguro(u)).toBeUndefined();
  });
  it("ação só do próprio painel", () => {
    const r = (h: Record<string, string>) => mesmaOrigem({ headers: new Headers(h) } as Request);
    expect(r({ "sec-fetch-site": "same-origin" })).toBe(true);
    expect(r({ "sec-fetch-site": "cross-site" })).toBe(false);
    expect(r({ origin: "https://p.com", host: "p.com" })).toBe(true);
    expect(r({ origin: "https://mau.com", host: "p.com" })).toBe(false);
    expect(r({ origin: "null", host: "p.com" })).toBe(false);
    expect(r({})).toBe(false);
  });
  it("política sem código solto em produção", () => {
    const p = politica("n1", false);
    expect(p).toContain("'nonce-n1'");
    expect(p).not.toContain("'unsafe-eval'");
    expect(/script-src[^;]*unsafe-inline/.test(p)).toBe(false);
    expect(p).toContain("frame-ancestors 'none'");
  });
});
