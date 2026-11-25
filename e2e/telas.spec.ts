import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { MENU } from "../src/lib/telas";
import { comExemplos } from "./apoio";

const TELAS = MENU.flatMap((g) => g.itens);

test.describe("todas as telas", () => {
  for (const cheio of [false, true])
    for (const tela of TELAS)
      test(`${tela.href} ${cheio ? "com dados" : "vazia"}`, async ({ page, isMobile }) => {
        const erros: string[] = [];
        page.on("pageerror", (e) => erros.push(e.message));
        page.on("console", (m) => /Content Security Policy|hydrat/i.test(m.text()) && erros.push(m.text()));
        if (cheio) await comExemplos(page);
        await page.goto(tela.href);
        await expect(page.locator("h1").first()).toBeVisible();

        const sobra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(sobra, "rolagem lateral").toBeLessThanOrEqual(0);
        if (isMobile) {
          const cortados = await page.evaluate(() =>
            [...document.querySelectorAll<HTMLElement>("main *")]
              .filter((e) => {
                const r = e.getBoundingClientRect();
                return r.width > 0 && r.height > 0 && r.right > window.innerWidth + 1 && !e.closest("[role=tablist]") && !e.closest(".sr-only, thead");
              })
              .slice(0, 5)
              .map((e) => `${e.tagName}.${e.className}`),
          );
          expect(cortados, "conteúdo fora da tela").toEqual([]);
          const pequenos = await page.evaluate(() =>
            [...document.querySelectorAll<HTMLElement>("main button, main select, main summary, main input:not([type=checkbox]):not([type=radio]):not([type=file])")]
              .filter((e) => {
                const r = e.getBoundingClientRect();
                return r.width > 0 && r.height < 40 && getComputedStyle(e).display !== "inline" && !e.closest(".sr-only, thead");
              })
              .slice(0, 5)
              .map((e) => `${e.tagName} ${e.textContent?.slice(0, 24)} ${Math.round(e.getBoundingClientRect().height)}px`),
          );
          expect.soft(pequenos, "alvo de toque pequeno").toEqual([]);
        }
        const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
        expect
          .soft(
            axe.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 160)} | ${v.nodes[0]?.failureSummary?.slice(0, 200)}`),
            "acessibilidade",
          )
          .toEqual([]);
        expect(erros).toEqual([]);
      });
});
