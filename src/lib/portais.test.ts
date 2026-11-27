import { describe, expect, it } from "vitest";
import { lerCartao, presencaNosPortais, validarLeitura } from "./portais";
import type { ImovelSite } from "./tipos";

// cartões no formato da lista do Canal Pro, com códigos inventados
const PUBLICADO = [
  "Rua 1 - Bairro Exemplo, Anápolis - Goiás",
  "Venda",
  "Via Integração",
  "TS1001",
  "310 m²",
  "3",
  "3",
  "2",
  "R$ 2.150.000",
  "Criado em 26/11/2026",
  "•",
  "Atualizado em 27/11/2026",
  "Qualidade do anúncio",
  "8.8/10",
  "Publicado",
  "Destaque",
  "00",
  "00",
];
const BLOQUEADO = [
  "Rua 2 - Bairro Exemplo, Anápolis - Goiás",
  "Venda",
  "Via Integração",
  "TS1002",
  "220 m²",
  "R$ 1.650.000",
  "Identificamos que este anúncio está duplicado em sua conta.",
  "Contestar bloqueio",
  "Qualidade do anúncio",
  "9,1/10",
  "Bloqueado",
];
const SEM_FOTO = [
  "Rua 3 - Bairro Exemplo, Anápolis - Goiás",
  "Aluguel",
  "Via Integração",
  "ts1003",
  "50 m²",
  "R$ 3.000",
  "Este anúncio não pode ser ativado pois não possui a quantidade mínima de 5 imagens.",
  "7/10",
  "Não publicado",
];
const im = (cod: string, p: Partial<ImovelSite> = {}): ImovelSite =>
  ({ cod, titulo: `Imóvel ${cod}`, tipo: "Casa", bairro: "Bairro", cidade: "Anápolis", cond: null, fotos: 12, url: `https://site/${cod}`, ...p }) as ImovelSite;

describe("leitura do Canal Pro", () => {
  it("lê código, nota, situação, motivo e destaque do cartão", () => {
    expect(lerCartao(PUBLICADO)).toMatchObject({
      cod: "TS1001",
      negocio: "Venda",
      preco: 2_150_000,
      area: 310,
      nota: 8.8,
      situacao: "publicado",
      destaque: true,
      motivo: "",
      atualizado: "2026-11-27",
    });
    expect(lerCartao(BLOQUEADO)).toMatchObject({ cod: "TS1002", nota: 9.1, situacao: "bloqueado", motivo: expect.stringMatching(/duplicado/) });
    expect(lerCartao(SEM_FOTO)).toMatchObject({ cod: "TS1003", negocio: "Aluguel", situacao: "nao_publicado", motivo: expect.stringMatching(/5 imagens/) });
    expect(lerCartao(["sem", "nada"])).toBeNull();
  });
  it("só aceita a forma esperada vinda do robô", () => {
    expect(validarLeitura({ coletadoEm: "2026-11-27T08:00:00Z", cartoes: [PUBLICADO, PUBLICADO, BLOQUEADO, ["lixo"], 42] })?.anuncios.map((a) => a.cod)).toEqual([
      "TS1001",
      "TS1002",
    ]);
    for (const x of [null, {}, { coletadoEm: "ontem", cartoes: [] }, { coletadoEm: "2026-11-27", cartoes: "x" }, { coletadoEm: "2026-11-27", cartoes: [["a".repeat(500)]] }]) {
      const r = validarLeitura(x);
      expect(r === null || r.anuncios.length === 0).toBe(true);
    }
  });
});

describe("carteira nos portais", () => {
  const leitura = validarLeitura({ coletadoEm: "2026-11-27T08:00:00Z", cartoes: [PUBLICADO, BLOQUEADO, SEM_FOTO, [...PUBLICADO.slice(0, 3), "TS9999", ...PUBLICADO.slice(4)]] });
  it("diz a situação e o que fazer em cada imóvel", () => {
    const l = presencaNosPortais([im("TS1001"), im("ts1002"), im("TS1003", { fotos: 2 }), im("TS1004"), im("TS1005", { cidade: "Brasília" }), im("TS1006", { fotos: 3 })], leitura);
    const p = (c: string) => l.find((x) => x.cod.toUpperCase() === c);
    expect(p("TS1001")).toMatchObject({ presenca: "publicado", grave: false, problema: "" });
    expect(p("TS1002")).toMatchObject({ presenca: "bloqueado", grave: true, fazer: expect.stringMatching(/cópia/) });
    expect(p("TS1003")).toMatchObject({ presenca: "nao_publicado", fazer: "Subir pelo menos 5 fotos no Jetimob" });
    expect(p("TS1004")).toMatchObject({ presenca: "fora_do_canal", fazer: expect.stringMatching(/marcar o envio/) });
    expect(p("TS1005")?.problema).toMatch(/Brasília/);
    expect(p("TS1006")).toMatchObject({ presenca: "fora_do_canal", problema: expect.stringMatching(/só 3 fotos/) });
    expect(p("TS9999")).toMatchObject({ presenca: "so_no_canal", im: null });
  });
  it("sem leitura do robô ainda avisa das fotos", () => {
    const l = presencaNosPortais([im("TS1"), im("TS2", { fotos: 4 })], null);
    expect(l.map((x) => [x.presenca, x.grave])).toEqual([
      ["sem_leitura", false],
      ["sem_leitura", true],
    ]);
  });
});
