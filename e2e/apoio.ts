import type { Page } from "@playwright/test";
import { dadosDemo } from "../src/lib/exemplo.fixture";
import { REGRAS } from "../src/lib/regras";

/** Abre o painel já com os dados de exemplo, que só existem em teste */
export async function comExemplos(page: Page, perfil = "socios") {
  const estado = JSON.stringify({ state: { dados: dadosDemo(), regras: REGRAS, perfil, usuarioId: null }, version: 3 });
  await page.addInitScript((e) => localStorage.getItem("sarto-painel") ?? localStorage.setItem("sarto-painel", e), estado);
}
