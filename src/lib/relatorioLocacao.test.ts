import { describe, expect, it } from "vitest";
import { dadosDemo } from "./exemplo.fixture";
import { REGRAS } from "./regras";
import { type Base, geral, relatorioLocacao } from "./relatorioLocacao";
import type { Cobranca, Contrato, Repasse } from "./tipos";

const REF = "2026-11-27";
const k = (id: string, p: Partial<Contrato> = {}): Contrato => ({
  id,
  codigo: id,
  imovel: `Imóvel ${id}`,
  endereco: "",
  bairro: "",
  proprietario: { nome: "P", doc: "", tel: "", email: "", pix: "" },
  inquilino: { nome: "I", doc: "", tel: "", email: "" },
  aluguel: 3000,
  condominio: 0,
  iptuMensal: 0,
  encargosNoBoleto: false,
  diaVencimento: 10,
  diaRepasse: 15,
  inicio: "2026-01-10",
  fim: "2028-01-10",
  indice: "IGP-M",
  ultimoReajuste: "2026-06-10",
  garantia: "Fiador",
  garantiaVence: "2028-01-10",
  seguroVence: "2027-06-10",
  imoveisDoDono: 1,
  multaPct: 10,
  jurosMes: 1,
  status: "ativo",
  checklist: {
    documentos: { em: "", por: "" },
    vistoria: { em: "", por: "" },
    garantia: { em: "", por: "" },
    seguro: { em: "", por: "" },
    energia: { em: "", por: "" },
    agua: { em: "", por: "" },
    chaves: { em: "", por: "" },
  },
  saida: {},
  obs: "",
  ...p,
});
const cob = (contratoId: string, comp: string, p: Partial<Cobranca> = {}): Cobranca => ({
  id: `${contratoId}${comp}${Math.random()}`,
  contratoId,
  comp,
  vencimento: `${comp}-10`,
  aluguel: 3000,
  encargos: 0,
  extra: 0,
  extraMotivo: "",
  avisos: [],
  ...p,
});
const rep = (contratoId: string, comp: string, p: Partial<Repasse> = {}): Repasse => ({
  id: `r${contratoId}${comp}`,
  contratoId,
  comp,
  bruto: 3000,
  taxaPct: 10,
  taxa: 300,
  descontos: 0,
  descontoMotivo: "",
  liquido: 2700,
  previsto: `${comp}-15`,
  status: "pago",
  pagoEm: `${comp}-12`,
  ...p,
});
const base = (p: Partial<Base>): Base => ({ contratos: [], cobrancas: [], repasses: [], contasInquilino: [], chamados: [], multas: [], funil: [], ...p });
const ind = (r: ReturnType<typeof relatorioLocacao>, id: string) => r.indicadores.find((i) => i.id === id);

describe("relatório da locação", () => {
  it("carteira certinha: tudo no lugar e dito como certo", () => {
    const r = relatorioLocacao(
      base({
        contratos: [k("a"), k("b")],
        cobrancas: [cob("a", "2026-11", { pagoEm: "2026-11-09", valorPago: 3000 }), cob("b", "2026-11", { pagoEm: "2026-11-10" })],
        repasses: [rep("a", "2026-11"), rep("b", "2026-11")],
      }),
      REGRAS,
      "2026-11",
      REF,
    );
    expect(r.fora.map((x) => x.texto)).toEqual([]);
    expect(geral(r)).toBe("ok");
    expect(ind(r, "recebimento")?.estado).toBe("ok");
    expect(ind(r, "repasse_prazo")).toMatchObject({ estado: "ok", valor: expect.stringContaining("100%") });
    expect(r.certo).toEqual(expect.arrayContaining(["Nenhum aluguel em atraso", "Todos os repasses saíram no prazo", "Todos os contratos com seguro incêndio em dia"]));
  });
  it("acha o que o Jetimob não mostra: contrato sem cobrança, cobrança repetida, pago sem repasse", () => {
    const r = relatorioLocacao(
      base({
        contratos: [k("a"), k("b"), k("c")],
        cobrancas: [cob("a", "2026-11"), cob("a", "2026-11"), cob("b", "2026-11", { pagoEm: "2026-11-10" })],
      }),
      REGRAS,
      "2026-11",
      REF,
    );
    const textos = r.fora.map((f) => `${f.imovel}: ${f.texto}`);
    expect(textos).toEqual(
      expect.arrayContaining([
        "Imóvel c: Contrato ativo sem cobrança de 11/2026",
        "Imóvel a: 2 cobranças na mesma competência 11/2026",
        "Imóvel b: Aluguel de 11/2026 pago há 17 dias e sem repasse calculado",
      ]),
    );
    expect(ind(r, "cobranca_mes")?.estado).toBe("fora");
  });
  it("atraso, inadimplência, repasse atrasado e seguro", () => {
    const r = relatorioLocacao(
      base({
        contratos: [k("a", { seguroVence: "" }), k("b"), k("c"), k("d")],
        cobrancas: [
          cob("a", "2026-10"),
          cob("b", "2026-11", { pagoEm: "2026-11-20" }),
          cob("c", "2026-11", { pagoEm: "2026-11-09" }),
          cob("d", "2026-11", { pagoEm: "2026-11-09" }),
        ],
        repasses: [rep("b", "2026-11", { status: "aprovado", pagoEm: undefined }), rep("c", "2026-11", { pagoEm: "2026-11-25" }), rep("d", "2026-11")],
      }),
      REGRAS,
      "2026-11",
      REF,
    );
    expect(ind(r, "inadimplencia")).toMatchObject({ estado: "fora", valor: expect.stringContaining("25%") });
    expect(ind(r, "idade_atraso")?.estado).toBe("fora");
    expect(ind(r, "repasse_prazo")).toMatchObject({ valor: "50% (1 de 2)", estado: "fora" });
    expect(ind(r, "repasse_pendente")?.estado).toBe("fora");
    expect(ind(r, "seguro")).toMatchObject({ valor: "3 de 4", estado: "fora" });
    expect(r.fora[0].gravidade).toBe("fora");
    expect(r.fora.map((f) => f.texto)).toEqual(
      expect.arrayContaining(["Sem seguro incêndio cadastrado", expect.stringMatching(/atrasado há 48 dias/), expect.stringMatching(/Repasse de 11\/2026 .* não feito/)]),
    );
    expect(geral(r)).toBe("fora");
  });
  it("sem contratos não inventa número", () => {
    const r = relatorioLocacao(base({}), REGRAS, "2026-11", REF);
    expect(r.indicadores.filter((i) => i.estado === "sem_dado").map((i) => i.id)).toEqual(expect.arrayContaining(["recebimento", "inadimplencia", "seguro", "carteira"]));
    expect(r.fora).toEqual([]);
  });
  it("roda com a carteira de exemplo inteira", () => {
    const d = dadosDemo();
    const r = relatorioLocacao(d, REGRAS);
    expect(r.indicadores.length).toBeGreaterThan(15);
    expect(r.fora.every((f) => f.imovel && f.texto)).toBe(true);
  });
});
