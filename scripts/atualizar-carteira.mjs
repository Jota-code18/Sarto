// Lê a carteira pública do site da Sarto (sitemap + páginas de imóvel) e gera
// public/data/carteira.json. Só usa dados que qualquer visitante do site vê.
// Uso: node scripts/atualizar-carteira.mjs [--cache pasta]
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://www.sartoimoveis.com.br";
const UA = { "User-Agent": "Mozilla/5.0 (painel-sarto; leitura da propria carteira)" };
const posCache = process.argv.indexOf("--cache");
const CACHE = posCache > 0 ? process.argv[posCache + 1] : null;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function baixar(url) {
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(40000) });
      if (r.status === 404 || r.status === 410) return null;
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.text();
    } catch (e) {
      if (t === 2) throw e;
      await espera(2000 * (t + 1));
    }
  }
}

// O site é Next: os dados vêm em blocos self.__next_f.push([1,"..."])
function decodificar(html) {
  let s = "";
  for (const seg of html.split('self.__next_f.push([1,"').slice(1)) {
    const fim = seg.indexOf('"])</script>');
    if (fim > 0) s += JSON.parse(`"${seg.slice(0, fim)}"`);
  }
  return s;
}

// Lê um valor JSON que começa em `ini`, sem precisar saber onde termina
function lerJson(s, ini) {
  let nivel = 0;
  let aspas = false;
  for (let k = ini; k < s.length; k++) {
    const c = s[k];
    if (aspas) {
      if (c === "\\") k++;
      else if (c === '"') aspas = false;
    } else if (c === '"') aspas = true;
    else if (c === "{" || c === "[") nivel++;
    else if (c === "}" || c === "]") {
      nivel--;
      if (nivel === 0) return JSON.parse(s.slice(ini, k + 1));
    }
  }
}

export function extrair(html, url) {
  const s = decodificar(html);
  const idx = new Map();
  for (const m of s.matchAll(/(?<![0-9a-f])([0-9a-f]{1,3}):(?=[[{])/g)) {
    if (!idx.has(m[1])) idx.set(m[1], []);
    idx.get(m[1]).push(m.index + m[0].length);
  }
  const ref = (v) => {
    if (typeof v !== "string" || !v.startsWith("$")) return v;
    for (const p of idx.get(v.slice(1)) ?? []) {
      try {
        const r = lerJson(s, p);
        if (r !== undefined) return r;
      } catch {}
    }
    return null;
  };
  const k = s.indexOf(',"typeId":');
  if (k < 0) return null;
  const im = lerJson(s, s.lastIndexOf('{"title":', k));
  if (!im?.contracts) return null;

  const ad = ref(im.address) ?? {};
  const bh = ref(im.buildingHead) ?? {};
  const contratos = (ref(im.contracts) ?? []).map(ref).filter(Boolean);
  const fotos = (ref(im.images) ?? []).map(ref).filter(Boolean);
  const valor = (c) => ref(c)?.value || null;
  let desc = im.description ?? "";
  if (/^\$[0-9a-f]+$/.test(desc)) {
    const m = new RegExp(`(?<![0-9a-f])${desc.slice(1)}:T([0-9a-f]+),`).exec(s);
    // o tamanho vem em bytes, não em caracteres
    desc = m
      ? Buffer.from(s.slice(m.index + m[0].length), "utf8").subarray(0, parseInt(m[1], 16)).toString("utf8")
      : "";
  }
  const titulo = (bh.title || im.title || "").replace(/\s+/g, " ").trim();
  const preco = (id) => {
    const c = contratos.find((x) => x.id === id);
    const v = c && ref(c.price)?.value;
    return v ? v / 100 : null;
  };
  const venda = preco(1);
  const aluguel = preco(2);
  const capa400 = [(fotos[0]?.srcset ?? "").split(" ")[0], fotos[0]?.src].find((u) => /^https:/.test(u ?? "")) ?? null;

  // preço citado no texto que não bate com nenhum preço cadastrado
  const citados = [...`${titulo}\n${desc}`.matchAll(/R\$\s*(\d{1,3}(?:\.\d{3})+|\d{4,})(?:,\d{2})?(?!\d)/g)].map((m) =>
    Number(m[1].replace(/\./g, "")),
  );
  const base = [venda, aluguel].filter(Boolean);
  const perto = citados.filter((c) => base.some((b) => c > b * 0.6 && c < b * 1.6));
  const bate = perto.some((c) => base.some((b) => Math.abs(c - b) < 1));
  const divergente = perto.length > 0 && !bate ? perto[0] : null;

  return {
    cod: String(im.code),
    titulo,
    tipo: im.type,
    bairro: ad.neighborhood ?? null,
    cidade: ad.city ?? null,
    cond: bh.residential ?? null,
    venda,
    aluguel,
    quartos: im.rooms ?? null,
    suites: im.suites ?? null,
    banheiros: im.bathrooms ?? null,
    vagas: im.garage ?? null,
    area: valor(im.privateArea) || valor(im.usefulArea) || valor(im.totalArea),
    terreno: valor(im.terrainArea),
    condominio: valor(im.condominiumValue) ? valor(im.condominiumValue) / 100 : null,
    excl: !!im.exclusivity,
    fotos: fotos.length,
    precoNoTexto: divergente,
    capa: capa400,
    url,
  };
}

async function main() {
  const xml = await baixar(`${SITE}/sitemap-imoveis.xml`);
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => u.includes("/imovel/"));
  console.log(`${urls.length} imóveis no sitemap`);
  const saida = [];
  let falhas = 0;
  const fila = [...urls];
  async function operario() {
    for (let u = fila.shift(); u; u = fila.shift()) {
      try {
        const cod = u.split("/").pop();
        const html = CACHE ? await readFile(path.join(CACHE, `${cod}.html`), "utf8") : await baixar(u);
        const o = html && extrair(html, u);
        if (o) saida.push(o);
        else falhas++;
        if (!CACHE) await espera(300);
      } catch (e) {
        falhas++;
        console.error("falhou", u, e.message);
      }
    }
  }
  await Promise.all([1, 2, 3].map(operario));
  // proteção: se o site mudar de formato, não apaga a carteira que já temos
  if (saida.length < urls.length * 0.8) {
    console.error(`Só ${saida.length} de ${urls.length} lidos. Arquivo mantido.`);
    process.exit(1);
  }
  saida.sort((a, b) => a.cod.localeCompare(b.cod));
  const destino = path.join(RAIZ, "public", "data");
  await mkdir(destino, { recursive: true });
  const linhas = saida.map((o) => JSON.stringify(o)).join(",\n");
  await writeFile(
    path.join(destino, "carteira.json"),
    `{"atualizadoEm":"${new Date().toISOString()}","fonte":"${SITE}","imoveis":[\n${linhas}\n]}\n`,
  );
  console.log(`${saida.length} gravados, ${falhas} falhas`);
}

await main();
