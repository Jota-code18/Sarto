import { fotoDoMolde, telefone, telefoneNoTexto } from "./contato";

/** Só roda no servidor: a chave da Apify nunca chega ao navegador. */
const BASE = process.env.APIFY_BASE ?? "https://api.apify.com/v2";
const ZAP = "fatihtahta~zap-imoveis-scraper";
const OLX = "solidcode~olx-brazil-scraper";
const TETO_MES = 4.95;
const PRECO_MIN = 1_000_000;
const OLX_URL = `https://www.olx.com.br/imoveis/estado-go/anapolis?ps=${PRECO_MIN}&sf=1`;

interface Busca {
  ator: string;
  completa: Porte;
  recente: Porte;
  entrada: (limite: number, completa: boolean) => object;
}
interface Porte {
  limite: number;
  teto: number;
}
const olx = (url: string, detalhes: boolean) => (limite: number) => ({ searchUrls: [url], searchQueries: [], maxResults: limite, sortBy: "newest", enrichDetails: detalhes });

/** Na ordem de prioridade do crédito. Depois dos de Anápolis a OLX emenda Goiânia: por isso o limite curto nos proprietários (f=p). Só eles vêm com o texto do anúncio, de onde sai o telefone. */
const BUSCAS: Busca[] = [
  { ator: OLX, completa: { limite: 60, teto: 0.22 }, recente: { limite: 60, teto: 0.22 }, entrada: olx(`${OLX_URL}&f=p`, true) },
  {
    ator: ZAP,
    completa: { limite: 800, teto: 1.6 },
    recente: { limite: 150, teto: 0.3 },
    entrada: (limite, completa) => ({ deal_type: "sale", location: "Anápolis", sort: "MOST_RECENT", min_price: PRECO_MIN, limit: limite, maximize_coverage: completa }),
  },
  { ator: OLX, completa: { limite: 800, teto: 0.98 }, recente: { limite: 100, teto: 0.12 }, entrada: olx(OLX_URL, false) },
];

export interface Rodada {
  id: string;
  ator: string;
  status: string;
  inicio: string;
  dataset: string;
  custo: number;
}

async function api(caminho: string, init?: RequestInit) {
  const r = await fetch(`${BASE}${caminho}`, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(25000),
    headers: { Authorization: `Bearer ${process.env.APIFY_TOKEN}`, "Content-Type": "application/json" },
  });
  if (!r.ok) throw new Error(r.status === 401 ? "A Apify recusou a chave" : `A Apify respondeu ${r.status}`);
  return r.json();
}

const rodada =
  (ator: string) =>
  (d: { id: string; status: string; startedAt: string; defaultDatasetId: string; usageTotalUsd?: number }): Rodada => ({
    id: d.id,
    ator,
    status: d.status,
    inicio: d.startedAt,
    dataset: d.defaultDatasetId,
    custo: d.usageTotalUsd ?? 0,
  });

/** Dos dois coletores, da mais nova para a mais antiga */
export async function rodadas(): Promise<Rodada[]> {
  const l = await Promise.all([ZAP, OLX].map(async (c) => (await api(`/acts/${c}/runs?desc=1&limit=20`)).data.items.map(rodada(c)) as Rodada[]));
  return l.flat().sort((x, y) => y.inicio.localeCompare(x.inicio));
}

export async function gastoDoMes(): Promise<number> {
  const j = await api("/users/me/limits");
  return Number(j.data?.current?.monthlyUsageUsd ?? 0);
}

const VIVA = new Set(["READY", "RUNNING", "TIMING-OUT", "ABORTING"]);
export const rodando = (r: Rodada) => VIVA.has(r.status);
/** Interrompida por tempo ou teto ainda entrega o que já foi pago */
export const entregou = (r: Rodada) => r.status === "SUCCEEDED" || r.status === "TIMED-OUT" || r.status === "ABORTED";
const doMes = (r: Rodada) => r.inicio.startsWith(new Date().toISOString().slice(0, 7));

/** Uma completa por mês, só as mais recentes nas outras. Nunca passa do crédito gratuito. */
export async function iniciar(intervaloHoras: number): Promise<{ ok: boolean; motivo?: string }> {
  const rs = await rodadas();
  if (rs.some(rodando)) return { ok: true, motivo: "Já há uma varredura em andamento" };
  // conta também a que falhou, para não gastar em repetição
  const livre = (ator: string) => {
    const r = rs.find((x) => x.ator === ator);
    return !r || Date.now() - Date.parse(r.inicio) >= (entregou(r) ? intervaloHoras : 1) * 36e5;
  };
  const fila = BUSCAS.filter((b) => livre(b.ator));
  if (!fila.length) return { ok: false, motivo: "A última varredura é recente. Tente mais tarde." };
  const gasto = await gastoDoMes();
  let reservado = 0;
  let iniciadas = 0;
  let falha: unknown;
  for (const b of fila) {
    const completa = !rs.some((r) => r.ator === b.ator && entregou(r) && doMes(r));
    // sem crédito para a completa, ainda vale buscar as novidades
    const p = completa && gasto + reservado + b.completa.teto <= TETO_MES ? b.completa : b.recente;
    if (gasto + reservado + p.teto > TETO_MES) continue;
    reservado += p.teto; // mesmo se a resposta falhar, a rodada pode ter começado
    try {
      await api(`/acts/${b.ator}/runs?maxTotalChargeUsd=${p.teto}&timeout=7200`, { method: "POST", body: JSON.stringify(b.entrada(p.limite, p === b.completa)) });
      iniciadas++;
    } catch (e) {
      falha = e;
    }
  }
  if (iniciadas) return falha ? { ok: true, motivo: "Parte da varredura não iniciou" } : { ok: true };
  if (falha) throw falha;
  return { ok: false, motivo: `Crédito gratuito do mês no fim (US$ ${gasto.toFixed(2)} de 5). Volta no próximo ciclo.` };
}

/** Só os campos que o painel usa. Do texto do anúncio sai apenas o telefone; o texto fica no servidor. */
export async function itens({ dataset, ator }: Rodada, offset: number) {
  const campos =
    ator === OLX
      ? "listingId,url,title,description,categoryName,neighborhood,city,price,oldPrice,priceDisplay,properties,seller,isBusiness,postedAt,thumbnailUrl,photos"
      : "identity,source_context,timestamps,content,pricing,location,attributes,entities,media,contact";
  // biome-ignore lint/suspicious/noExplicitAny: formato muda conforme o coletor
  const l: Record<string, any>[] = await api(`/datasets/${encodeURIComponent(dataset)}/items?clean=1&offset=${offset}&limit=400&fields=${campos}`);
  if (ator === OLX)
    return l.map((o) => ({
      listingId: o.listingId,
      url: o.url,
      title: o.title,
      categoryName: o.categoryName,
      neighborhood: o.neighborhood,
      city: o.city,
      price: o.price,
      oldPrice: o.oldPrice,
      priceDisplay: o.priceDisplay ?? "",
      properties: o.properties,
      seller: { name: o.seller?.name, type: o.seller?.type },
      isBusiness: o.isBusiness,
      postedAt: o.postedAt,
      foto: fotoDoMolde(o.photos?.[0] ?? o.thumbnailUrl),
      telefone: telefoneNoTexto(`${o.title ?? ""} ${o.description ?? ""}`),
    }));
  return l.map((o) => ({
    identity: { external_id: o.identity?.external_id },
    source_context: { url: o.source_context?.url },
    timestamps: { created_at: o.timestamps?.created_at },
    content: { title: o.content?.title },
    pricing: { amount: o.pricing?.amount, offers: o.pricing?.offers },
    location: { neighborhood: o.location?.neighborhood, city: o.location?.city },
    attributes: {
      unit_types: o.attributes?.unit_types,
      property_type: o.attributes?.property_type,
      rooms: o.attributes?.rooms,
      area: o.attributes?.area,
      publisher_type: o.attributes?.publisher_type,
    },
    entities: { seller: { name: o.entities?.seller?.name, license_number: o.entities?.seller?.license_number } },
    foto: fotoDoMolde(o.media?.images?.[0]?.url),
    telefone: telefone(o.contact?.whatsapp) || (o.contact?.phones ?? []).map(telefone).find(Boolean) || "",
  }));
}
