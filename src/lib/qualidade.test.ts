import PizZip from "pizzip";
import { describe, expect, it } from "vitest";
import { naFaixa, noUltimoRelatorio, porImovel, lerNotas } from "./notas";
import { lerXlsx } from "./planilha";
import { presencaNosPortais } from "./portais";
import { CAMPOS, ehRelatorioDeQualidade, faltandoNaLinha, ondeGanhar } from "./qualidade";
import type { ImovelSite } from "./tipos";

// o cabeçalho é o do relatório "Qualidade dos Anúncios" do Canal Pro; os códigos e notas são inventados
const CAB = [
  "Id Listing",
  "Código do Anúncio",
  "Tipo de Transação",
  "Tipo do Imóvel",
  "Endereço",
  "Condomínio",
  "IPTU",
  "Imagem",
  "Tour Virtual",
  "Vídeo",
  "Descrição",
  "Nota de Qualidade",
  "Classificação",
];
const LINHAS = [
  ["1", "TS2001", "VENDA", "CASA", "SIM", "SIM", "NÃO", "NÃO", "NÃO", "NÃO", "SIM", "7.8", "Boa"],
  ["2", "TS2002", "VENDA", "APARTAMENTO", "SIM", "SIM", "SIM", "SIM", "NÃO", "NÃO", "SIM", "9.2", "Ótima"],
  ["3", "TS2003", "LOCAÇÃO", "CASA", "SIM", "SIM", "SIM", "NÃO", "NÃO", "NÃO", "NÃO", "8.4", "Muito Boa"],
];

/** Um .xlsx mínimo, com a primeira aba em texto, como o Canal Pro exporta */
function xlsx(linhas: string[][]) {
  const cel = (v: string, c: number, r: number) => `<c r="${String.fromCharCode(65 + c)}${r}" t="inlineStr"><is><t>${v}</t></is></c>`;
  const rows = linhas.map((l, r) => `<row r="${r + 1}">${l.map((v, c) => cel(v, c, r + 1)).join("")}</row>`).join("");
  const z = new PizZip();
  z.file("xl/worksheets/sheet1.xml", `<worksheet><sheetData>${rows}</sheetData></worksheet>`);
  return z.generate({ type: "uint8array" });
}

describe("relatório de qualidade do Canal Pro", () => {
  it("lê do .xlsx a nota, a classificação e o que falta, sem virar alerta", async () => {
    const linhas = await lerXlsx(xlsx([["Qualidade dos Anúncios"], CAB, ...LINHAS]));
    expect(ehRelatorioDeQualidade(linhas[0])).toBe(true);
    const n = lerNotas(linhas, "Canal Pro", "2026-11-27");
    expect(n).toHaveLength(3);
    expect(n[0]).toMatchObject({ cod: "TS2001", nota: 7.8, classe: "Boa", motivo: "", faltando: ["imagem", "iptu", "tour", "video"] });
    expect(n[1].faltando).toEqual(["tour", "video"]);
    // relatório de qualidade não entra em "Requer atenção"
    expect(porImovel(n).get("TS2001")).toMatchObject({ atencao: [], classe: "Boa", faltando: ["imagem", "iptu", "tour", "video"] });
  });

  it("planilha comum de nota não ganha lista do que falta", () => {
    const [n] = lerNotas([{ codigo: "TS2009", nota: "8" }], "Canal Pro", "2026-11-27");
    expect(n.faltando).toBeUndefined();
    expect(faltandoNaLinha({ endereco: "sim", video: "Não" })).toEqual(["video"]);
  });

  it("mostra primeiro onde a carteira mais ganha nota", () => {
    const g = ondeGanhar([{ faltando: ["imagem", "video"] }, { faltando: ["imagem", "descricao"] }, { faltando: [] }]);
    expect(g.map((x) => [x.campo, x.anuncios])).toEqual([
      ["imagem", 2],
      ["descricao", 1],
      ["video", 1],
    ]);
    expect(g[0].fazer).toBe(CAMPOS.imagem.fazer);
    // os pesos são os que o Canal Pro mostra: somam 100 com o preço contado uma vez
    const { endereco, descricao, imagem, iptu, tour, video } = CAMPOS;
    expect(endereco.pontos + descricao.pontos + imagem.pontos + iptu.pontos + tour.pontos + video.pontos).toBe(100);
  });

  it("separa as notas por faixa", () => {
    expect([7.9, 8, 8.9, 9, null].map((x) => naFaixa(x, "abaixo8"))).toEqual([true, false, false, false, false]);
    expect([7.9, 8, 8.9, 9, null].map((x) => naFaixa(x, "8a9"))).toEqual([false, true, true, false, false]);
    expect([7.9, 8, 8.9, 9, null].map((x) => naFaixa(x, "9mais"))).toEqual([false, false, false, true, false]);
    expect([7.9, null].map((x) => naFaixa(x, "sem"))).toEqual([false, true]);
    expect(naFaixa(null, "")).toBe(true);
  });
});

describe("nos portais sem o robô", () => {
  const im = (cod: string, p: Partial<ImovelSite> = {}): ImovelSite =>
    ({ cod, titulo: `Imóvel ${cod}`, tipo: "Casa", bairro: "Bairro", cidade: "Anápolis", cond: null, fotos: 12, url: `https://site/${cod}`, ...p }) as ImovelSite;

  it("usa só o último relatório importado", async () => {
    const velho = lerNotas(await lerXlsx(xlsx([CAB, ["0", "TS2005", "", "", "SIM", "SIM", "SIM", "SIM", "NÃO", "NÃO", "SIM", "8", "Boa"]])), "Canal Pro", "2026-11-01");
    const novo = lerNotas(await lerXlsx(xlsx([CAB, ...LINHAS])), "Canal Pro", "2026-11-27");
    const manual = lerNotas([{ codigo: "TS2006", nota: "9" }], "Canal Pro", "2026-11-28");
    expect(velho).toHaveLength(1);
    expect([...noUltimoRelatorio([...velho, ...novo, ...manual])].sort()).toEqual(["TS2001", "TS2002", "TS2003"]);
  });

  it("quem está no relatório está publicado; quem não está, fora do relatório", () => {
    const p = presencaNosPortais([im("TS2001"), im("TS2004"), im("TS2007", { fotos: 3 })], null, new Set(["TS2001"]));
    expect(p.map((x) => [x.cod, x.presenca, x.grave])).toEqual([
      ["TS2001", "publicado", false],
      ["TS2004", "fora_do_relatorio", true],
      ["TS2007", "fora_do_relatorio", true],
    ]);
    expect(p[2].fazer).toMatch(/5 fotos/);
    // com o robô, vale a leitura dele
    expect(presencaNosPortais([im("TS2001")], { coletadoEm: "2026-11-27T10:00:00Z", anuncios: [] }, new Set(["TS2001"]))[0].presenca).toBe("fora_do_canal");
  });
});
