// Robô do Canal Pro: roda no computador da Sarto, onde o login já foi feito e o código do e-mail confirmado.
// Não guarda senha. Lê "Meus anúncios" (situação, nota e motivo) e manda para o painel.
//
//   npm run canalpro:entrar   abre o navegador do robô para você entrar uma vez (com o código do e-mail)
//   npm run canalpro          lê e envia; agendado toda segunda depois da carteira
//
// Precisa do arquivo .env.robo nesta pasta com PAINEL_URL e CANALPRO_ROBO_TOKEN (nunca vai para o git).
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const PERFIL = path.join(process.env.LOCALAPPDATA ?? process.env.HOME ?? ".", "SartoRobo", "canalpro");
const LISTA = "https://canal-pro.grupozap.com/ZAP_OLX/0/anuncios";
const entrar = process.argv.includes("--entrar");
mkdirSync(PERFIL, { recursive: true });

const ctx = await chromium.launchPersistentContext(PERFIL, { headless: !entrar, viewport: { width: 1280, height: 900 }, locale: "pt-BR" });
const page = ctx.pages()[0] ?? (await ctx.newPage());

if (entrar) {
  await page.goto("https://canal-pro.grupozap.com/login");
  console.log("Entre no Canal Pro na janela que abriu (com o código do e-mail, se pedir). Depois feche a janela.");
  await new Promise((ok) => ctx.on("close", ok));
  process.exit(0);
}

const { PAINEL_URL, CANALPRO_ROBO_TOKEN } = process.env;
if (!PAINEL_URL || !CANALPRO_ROBO_TOKEN) {
  console.error("Falta PAINEL_URL ou CANALPRO_ROBO_TOKEN no .env.robo");
  process.exit(2);
}

await page.goto(LISTA, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(6000);
if (/\/login/.test(page.url())) {
  console.error("O Canal Pro pediu login de novo. Rode: npm run canalpro:entrar");
  await ctx.close();
  process.exit(3);
}

// cada cartão começa no endereço ("..., Cidade - Goiás") e vai até o próximo
const ler = () =>
  page.evaluate(() => {
    // biome-ignore lint/performance/useDomNodeTextContent: precisa das quebras de linha da tela
    const L = document.body.innerText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const ix = L.map((x, i) => (/ - [A-ZÁÉÍÓÚ][a-záéíóúãõç ]+$/.test(x) && x.includes(",") ? i : -1)).filter((i) => i >= 0);
    return ix.map((i, k) => L.slice(i, ix[k + 1] ?? i + 25));
  });

const cartoes = new Map();
let anterior = "";
for (let pagina = 1; pagina <= 60; pagina++) {
  let lidos = [];
  for (let t = 0; t < 40; t++) {
    lidos = await ler();
    if (lidos.length && lidos[0].join("|") !== anterior) break;
    await page.waitForTimeout(500);
  }
  anterior = lidos[0]?.join("|") ?? "";
  for (const c of lidos) cartoes.set(c.join("|"), c);
  const proxima = page.locator('[aria-label="próxima página"]').first();
  if (!(await proxima.count()) || (await proxima.getAttribute("aria-disabled")) === "true") break;
  await proxima.click();
}
await ctx.close();

const corpo = { coletadoEm: new Date().toISOString(), cartoes: [...cartoes.values()] };
const r = await fetch(new URL("/api/canalpro", PAINEL_URL), {
  method: "POST",
  headers: { Authorization: `Bearer ${CANALPRO_ROBO_TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify(corpo),
});
const resposta = await r.json().catch(() => ({}));
if (!r.ok) {
  console.error(`O painel recusou: ${resposta.erro ?? r.status}`);
  process.exit(4);
}
console.log(`${resposta.anuncios} anúncios do Canal Pro enviados ao painel (${corpo.cartoes.length} cartões lidos).`);
