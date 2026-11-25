import { describe, expect, it } from "vitest";
import { limparEvento, limparTexto, limparUrl } from "./observar";

describe("evento sem dado pessoal", () => {
  it("limpa endereço e texto", () => {
    expect(limparUrl("https://viacep.com.br/ws/75000000/json/?x=1#y")).toBe("https://viacep.com.br/ws/#/json/");
    expect(limparTexto('Falha em "Maria da Silva" 123.456.789-09 maria@x.com (62) 99999-0000')).not.toMatch(/Maria|maria|123|9999/);
    expect(limparTexto("Cannot read properties of undefined")).toBe("Cannot read properties of undefined");
  });
  it("tira usuário, cookies, cabeçalhos, cliques e variáveis", () => {
    const e = limparEvento({
      user: { ip_address: "1.1.1.1" },
      extra: { a: 1 },
      transaction: "/api/cliente/12345678909?x=1",
      request: { url: "https://p.com/leads?nome=Maria", cookies: { sarto_acesso: "x" }, headers: { a: "b" }, data: "x" },
      breadcrumbs: [
        { category: "ui.click", message: "Maria" },
        { category: "fetch", data: { url: "https://brasilapi.com.br/api/cnpj/v1/12345678000199?n=Maria", status_code: 200, body: "Maria" } },
      ],
      exception: { values: [{ value: "CPF 12345678909", stacktrace: { frames: [{ vars: { nome: "Maria" } }] } }] },
      spans: [{ description: "GET https://x.com/75000000?q=Maria", data: { q: "Maria" } }],
    });
    expect(JSON.stringify(e)).not.toMatch(/Maria|sarto_acesso|123456|1\.1\.1\.1|75000000/);
    expect(e.breadcrumbs).toHaveLength(1);
  });
});
