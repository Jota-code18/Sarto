import { describe, expect, it } from "vitest";
import { acharEmpreendimento as achar, EMPREENDIMENTOS, mediana, precoEstranho } from "./empreendimentos";

describe("empreendimento escrito de qualquer jeito", () => {
  it("aceita erro de digitação, acento, espaço e letra dobrada", () => {
    for (const t of ["Casa no Anaville", "CASA NO ANAVILE", "casa no ana ville", "Residencial Anavillle", "anavile 4 suítes"]) expect(achar(t), t).toBe("Anaville");
    for (const t of ["Alphaville Anápolis", "Alfaville", "alpha ville", "Condomínio Alphavile"]) expect(achar(t), t).toBe("Alphaville");
    expect(achar("Sobrado no Grand Trianom")).toBe("Grand Trianon");
    expect(achar("Residencial Sun Flower")).toBe("Sunflower");
    expect(achar("Vale dos Passáros")).toBe("Vale dos Pássaros");
    expect(achar("Riviera D'Itália, 3 quartos")).toBe("Riviera de Itália");
    expect(achar("Edifício Rio Elfrates")).toBe("Rio Eufrates");
    expect(achar("Ed. Firense")).toBe("Firenze");
    expect(achar("Gênesis Office, sala 12")).toBe("Genesis");
    expect(achar("Belvedere du Parque")).toBe("Belvedere du Parque");
    expect(achar("ipiranga park residencial")).toBe("Ipiranga Parque");
  });
  it("o mais específico ganha", () => {
    expect(achar("Lote no Terras Alphaville")).toBe("Terras Alphaville");
    expect(achar("Condomínio Terras Alpha Anápolis")).toBe("Terras Alphaville");
    expect(achar("Lote no Alphaville")).toBe("Alphaville");
  });
  it("não confunde palavra parecida", () => {
    for (const t of ["Piso porcelanato", "Audi Q3", "casa caprichada", "Jundiaí, 3 quartos", "Vila Jaiara", "Rio Jordão", "caramelo", "Residencial Opus", ""])
      expect(achar(t), t).toBe("");
  });
  it("nomes extras da Sarto também contam", () => {
    expect(achar("Casa no Recanto das Emas", ["Recanto das Emas"])).toBe("Recanto das Emas");
    expect(achar("Casa no Recanto das Emas")).toBe("");
  });
  it("lista sem nome repetido e com busca", () => {
    const n = EMPREENDIMENTOS.map((e) => e.nome);
    expect(new Set(n).size).toBe(n.length);
    expect(EMPREENDIMENTOS.every((e) => e.busca.length >= 4)).toBe(true);
  });
});

describe("preço estranho", () => {
  it("marca valor muito fora da mediana e valor de ágio", () => {
    const m = mediana([2e6, 2.2e6, 2.5e6, 1.9e6, 3e6]);
    expect(m).toBe(2.2e6);
    expect(precoEstranho(180_000, m)).toBe(true);
    expect(precoEstranho(25_000, 0)).toBe(true);
    expect(precoEstranho(2_100_000, m)).toBe(false);
    expect(precoEstranho(1_500_000, 0)).toBe(false);
    expect(mediana([1, 2])).toBe(0);
  });
});
