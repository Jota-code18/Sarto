import type { Page } from "@playwright/test";
import PizZip from "pizzip";
import { dadosDemo } from "../src/lib/exemplo.fixture";
import { REGRAS } from "../src/lib/regras";

/** Abre o painel já com os dados de exemplo, que só existem em teste */
export async function comExemplos(page: Page, perfil = "socios") {
  const estado = JSON.stringify({ state: { dados: dadosDemo(), regras: REGRAS, perfil, usuarioId: null }, version: 3 });
  await page.addInitScript((e) => localStorage.getItem("sarto-painel") ?? localStorage.setItem("sarto-painel", e), estado);
}

/** Um .xlsx mínimo, só com a primeira aba, como o Canal Pro exporta o relatório de qualidade */
export function xlsx(linhas: string[][]) {
  const cel = (v: string, c: number, r: number) => `<c r="${String.fromCharCode(65 + c)}${r}" t="inlineStr"><is><t>${v}</t></is></c>`;
  const z = new PizZip();
  z.file(
    "xl/worksheets/sheet1.xml",
    `<worksheet><sheetData>${linhas.map((l, r) => `<row r="${r + 1}">${l.map((v, c) => cel(v, c, r + 1)).join("")}</row>`).join("")}</sheetData></worksheet>`,
  );
  return Buffer.from(z.generate({ type: "uint8array" }));
}

/** Cabeçalho do relatório "Qualidade dos Anúncios" do Canal Pro; os códigos usados nos testes são inventados */
export const CABECALHO_QUALIDADE = [
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
