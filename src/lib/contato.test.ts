import { describe, expect, it } from "vitest";
import { ehCelular, fotoDoMolde, telefone, telefoneNoTexto } from "./contato";

describe("contato do anúncio", () => {
  it("aceita só telefone possível", () => {
    expect(telefone("5562999990000")).toBe("62999990000");
    expect(telefone("(62) 3300-0000")).toBe("6233000000");
    for (const x of ["1234", "62199990000", "00000000000", "6269999000", null]) expect(telefone(x)).toBe("");
    expect(ehCelular("62999990000")).toBe(true);
    expect(ehCelular("6233000000")).toBe(false);
  });
  it("acha o número escrito no anúncio, mesmo disfarçado", () => {
    expect(telefoneNoTexto("Tratar .62.999.990.000 com o dono")).toBe("62999990000");
    expect(telefoneNoTexto("zap (62) 9 9999-0000")).toBe("62999990000");
    expect(telefoneNoTexto("+55 62 99999 0000")).toBe("62999990000");
    expect(telefoneNoTexto("Fixo 62 3300-0000 ou 62 99999-0000")).toBe("62999990000");
    expect(telefoneNoTexto("me chama 99999-0000")).toBe("62999990000");
  });
  it("não confunde preço, área, CRECI ou código com telefone", () => {
    for (const x of ["R$ 1.670.000,00", "Área 1.200 m² e 360 m²", "CRECI 13.180", "código 1526235594", "CEP 75020-900", "", null]) expect(telefoneNoTexto(x)).toBe("");
  });
  it("monta a foto do ZAP e recusa molde desconhecido", () => {
    expect(fotoDoMolde("https://r.com/a/{description}.webp?action={action}&dimension={width}x{height}")).toBe("https://r.com/a/foto.webp?action=crop&dimension=360x270");
    expect(fotoDoMolde("https://r.com/{outro}")).toBe("");
    expect(fotoDoMolde("javascript:x")).toBe("");
  });
});
