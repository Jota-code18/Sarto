/** Apify de mentira: mesma forma de resposta, sem rede e sem custo */
import http from "node:http";

let rodadas = [];
let anotado = {};
const PRONTA_EM = 600;
const item = (o) => JSON.parse(JSON.stringify(o));
const OLX = [
  {
    listingId: "1",
    url: "https://go.olx.com.br/grande-goiania-e-anapolis/imoveis/sobrado-1508484603",
    title: "Sobrado de teste no Anavile",
    description: "Falar com o dono 62 9 9999-0000",
    categoryName: "Casas",
    city: "Anápolis",
    neighborhood: "Setor de teste",
    price: 1733000,
    priceDisplay: "R$ 1.733.000",
    seller: { type: "private", name: "Dono de teste", id: "9", phoneAvailable: true },
    isBusiness: false,
    postedAt: "2026-11-20T10:00:00+00:00",
    properties: [
      { name: "real_estate_type", value: "Venda - casa em rua pública" },
      { name: "size", value: "377m²" },
      { name: "rooms", value: "4" },
    ],
  },
  {
    listingId: "3",
    url: "https://go.olx.com.br/grande-goiania-e-anapolis/terrenos/lote-1508484605",
    title: "Lote no Alphavile, só o ágio",
    categoryName: "Terrenos, sítios e fazendas",
    city: "Anápolis",
    price: 40000,
    priceDisplay: "R$ 40.000",
    seller: { type: "business" },
    properties: [{ name: "size", value: "450m²" }],
  },
  {
    listingId: "2",
    url: "https://go.olx.com.br/goiania/imoveis/casa-1508484604",
    title: "Casa de teste em Goiânia",
    categoryName: "Casas",
    city: "Goiânia",
    price: 1500000,
    priceDisplay: "R$",
    seller: { type: "private" },
    properties: [],
  },
];
const ZAP = [
  {
    identity: { external_id: "T1" },
    source_context: { url: "https://www.zapimoveis.com.br/imovel/casa-teste-id-2891363600/" },
    content: { title: "Casa de teste em condomínio", description: "No Grand Trianom. Texto que não pode sair do servidor" },
    pricing: { amount: 2200000 },
    location: { neighborhood: "Jundiaí", city: "Anápolis" },
    attributes: { area: { usable_area: 200 }, rooms: { bedrooms: 3 }, unit_types: ["HOME"] },
    entities: { seller: { name: "Imobiliária de teste", license_number: "1" } },
    contact: { phones: ["6233000000"] },
  },
];

http
  .createServer((q, r) => {
    const u = new URL(q.url, "http://x");
    const json = (o, s = 200) => {
      r.statusCode = s;
      r.setHeader("content-type", "application/json");
      r.end(JSON.stringify(o));
    };
    if (u.pathname === "/") return json({ ok: true });
    if (u.pathname === "/zerar") {
      rodadas = [];
      anotado = {};
      return json({});
    }
    if (q.headers.authorization !== "Bearer simulado") return json({}, 401);
    if (u.pathname === "/key-value-stores" && q.method === "POST") return json({ data: { id: "loja" } });
    if (u.pathname === "/key-value-stores/loja/records/buscas") {
      if (q.method === "PUT") {
        let b = "";
        q.on("data", (d) => (b += d));
        q.on("end", () => {
          anotado = JSON.parse(b);
          json({});
        });
        return;
      }
      return json(anotado);
    }
    const ator = u.pathname.split("/")[2];
    if (q.method === "POST") {
      const d = { id: `r${rodadas.length}`, ator, startedAt: new Date().toISOString(), defaultDatasetId: /olx/.test(ator) ? "olx" : "zap", criada: Date.now() };
      rodadas.unshift(d);
      return json({ data: { ...d, status: "READY" } });
    }
    if (u.pathname.startsWith("/acts/"))
      return json({
        data: {
          items: rodadas
            .filter((x) => x.ator === ator)
            .map((x) => ({ ...x, status: Date.now() - x.criada < PRONTA_EM ? "RUNNING" : /zap/.test(x.ator) ? "TIMED-OUT" : "SUCCEEDED" })),
        },
      });
    if (u.pathname === "/users/me/limits") return json({ data: { current: { monthlyUsageUsd: rodadas.length * 0.1 } } });
    return json(Number(u.searchParams.get("offset")) ? [] : item(u.pathname.includes("olx") ? OLX : ZAP));
  })
  .listen(3991);
