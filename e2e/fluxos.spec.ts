import { expect, type Page, test } from "@playwright/test";
import { dadosDemo } from "../src/lib/exemplo.fixture";
import { comExemplos } from "./apoio";

const COM_SENHA = "http://localhost:3457";

async function entrar(page: Page) {
  await page.goto(`${COM_SENHA}/entrar`);
  await page.getByLabel("Senha do painel").fill("senha-de-teste");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(`${COM_SENHA}/`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

test.describe("acesso", () => {
  test("sem senha ninguém vê tela nem API", async ({ page, request }) => {
    await page.goto(`${COM_SENHA}/leads`);
    await expect(page).toHaveURL(`${COM_SENHA}/entrar`);
    expect((await request.get(`${COM_SENHA}/api/coleta`)).status()).toBe(401);
    expect((await request.get(`${COM_SENHA}/data/carteira.json`, { maxRedirects: 0 })).status()).toBe(307);
  });
  test("senha errada avisa e a certa entra", async ({ page }) => {
    await page.goto(`${COM_SENHA}/entrar`);
    await page.getByLabel("Senha do painel").fill("errada");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("Senha incorreta.")).toBeVisible();
    await entrar(page);
  });
  test("chamada semanal exige o segredo e cookie inventado não entra", async ({ request }) => {
    expect((await request.get(`${COM_SENHA}/api/agendada`)).status()).toBe(401);
    expect((await request.get(`${COM_SENHA}/api/coleta`, { headers: { cookie: `sarto_acesso=${Date.now() + 9e9}.${"0".repeat(64)}` } })).status()).toBe(401);
  });
  test("outro site não inicia varredura", async ({ page, request }) => {
    await entrar(page);
    const cookie = (await page.context().cookies()).map((c) => `${c.name}=${c.value}`).join("; ");
    const r = await request.post(`${COM_SENHA}/api/coleta`, { headers: { cookie, origin: "https://outro.com" } });
    expect(r.status()).toBe(403);
  });
});

test.describe("varredura completa", () => {
  test.describe.configure({ mode: "serial" });
  test("varre, traz, filtra a cidade e oferece contato", async ({ page, request }, info) => {
    test.skip(info.project.name !== "computador", "uma rodada basta");
    await request.get("http://localhost:3991/zerar");
    await entrar(page);
    await page.goto(`${COM_SENHA}/varredura`);
    await page.getByRole("button", { name: "Varrer agora" }).click();
    await expect(page.getByRole("button", { name: "Sobrado de teste no Anavile" })).toBeVisible({ timeout: 30000 });
    // coleta do ZAP interrompida por tempo também entra
    await expect(page.getByRole("button", { name: "Casa de teste em condomínio" })).toBeVisible();
    await expect(page.getByText("Casa de teste em Goiânia")).toHaveCount(0);
    // erro de escrita e preço só do ágio não tiram o anúncio da lista
    const lote = page.getByRole("row").filter({ hasText: "Lote no Alphavile" });
    await expect(lote.getByText("preço a conferir")).toBeVisible();
    await expect(lote.getByText(/^Alphaville/)).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: "Casa de teste em condomínio" }).getByText("Grand Trianon")).toBeVisible();
    const linha = page.getByRole("row").filter({ hasText: "Sobrado de teste" });
    await expect(linha.getByText("377 m²")).toBeVisible();
    await expect(linha.getByText(/4.597\/m²/)).toBeVisible();
    await expect(linha.getByRole("link", { name: /Abrir .* em OLX/ })).toHaveAttribute("href", /^https:\/\/go\.olx\.com\.br/);
    await expect(linha.getByRole("link", { name: /WhatsApp/ })).toHaveAttribute("href", /wa\.me\/5562999990000/);
    // no Início, o dono aparece com o link ao lado do nome
    await page.goto(`${COM_SENHA}/`);
    await expect(page.getByText("Donos para abordar")).toBeVisible();
    await expect(page.getByRole("link", { name: /Abrir Sobrado de teste/ })).toBeVisible();
    await page.goto(`${COM_SENHA}/varredura`);
    await page.getByRole("button", { name: "Varrer agora" }).click();
    await expect(page.getByText("A última varredura é recente")).toBeVisible();
    // recarregar não duplica
    await page.reload();
    await expect(page.getByRole("button", { name: "Sobrado de teste no Anavile" })).toHaveCount(1);
  });
  test("a API não devolve texto do anúncio nem dado a mais", async ({ page }, info) => {
    test.skip(info.project.name !== "computador", "uma rodada basta");
    await entrar(page);
    const corpo = await page.evaluate(async () => {
      const e = await (await fetch("/api/coleta")).json();
      return JSON.stringify(await Promise.all(e.prontas.map(async (p: { id: string }) => (await fetch(`/api/coleta?rodada=${p.id}`)).json())));
    });
    expect(corpo).toContain("62999990000");
    expect(corpo).not.toMatch(/description|não pode sair|Falar com o dono|phoneAvailable/);
  });
});

test.describe("cadastro", () => {
  test("lead salvo continua depois de recarregar", async ({ page }) => {
    await page.goto("/leads");
    await page
      .getByRole("button", { name: /Novo lead/ })
      .first()
      .click();
    const g = page.getByRole("dialog");
    await g.getByLabel(/^Nome/).fill("Pessoa de teste");
    await g.getByLabel(/^WhatsApp/).fill("62999990000");
    await g.getByLabel(/^De onde veio/).selectOption({ index: 1 });
    await g.getByRole("button", { name: "Salvar lead" }).click();
    await expect(page.getByText("Pessoa de teste").first()).toBeVisible();
    await page.reload();
    await expect(page.getByText("Pessoa de teste").first()).toBeVisible();
  });
  test("usuário cadastrado vira opção e respeita o perfil", async ({ page, isMobile }) => {
    await page.goto("/usuarios");
    await page.getByRole("button", { name: "Novo usuário" }).click();
    const g = page.getByRole("dialog");
    await g.getByLabel(/^Nome/).fill("Corretora de teste");
    await g.getByLabel(/^E-mail/).fill("teste@example.com");
    await g.getByRole("button", { name: "Salvar usuário" }).click();
    if (isMobile) await page.getByRole("button", { name: "Menu" }).click();
    await page.getByLabel("Usando como").filter({ visible: true }).selectOption({ label: "Corretora de teste (Corretores)" });
    await page.goto("/financeiro");
    await expect(page.getByText("Esta seção não faz parte do perfil de Corretora de teste.")).toBeVisible();
  });
  test("navegador que estava na demonstração perde só o inventado", async ({ page }) => {
    const { leads } = dadosDemo();
    const dados = {
      leads: [
        { ...leads[0], nome: "Inventado" },
        { ...leads[0], nome: "Lead de verdade", id: "abc123wxyz", corretorId: "" },
      ],
    };
    const estado = JSON.stringify({ state: { dados, modo: "demo", perfil: "socios" }, version: 2 });
    await page.addInitScript((e) => localStorage.getItem("sarto-painel") ?? localStorage.setItem("sarto-painel", e), estado);
    await page.goto("/leads");
    await expect(page.getByText("Lead de verdade").first()).toBeVisible();
    await expect(page.getByText("Inventado")).toHaveCount(0);
  });
  test("menu do celular abre, fecha com Esc e navega", async ({ page, isMobile }) => {
    test.skip(!isMobile, "só no celular");
    await comExemplos(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Menu" }).click();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Menu" }).click();
    await page.getByRole("link", { name: "Cobranças e repasses" }).click();
    await expect(page).toHaveURL(/cobrancas/);
  });
});
