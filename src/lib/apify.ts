import { fotoDoMolde, telefone, telefoneNoTexto } from "./contato";
import { acharEmpreendimento, EMPREENDIMENTOS } from "./empreendimentos";

/** Só roda no servidor: a chave da Apify nunca chega ao navegador. */
const BASE = process.env.APIFY_BASE ?? "https://api.apify.com/v2";
const ZAP = "fatihtahta~zap-imoveis-scraper";
const OLX = "solidcode~olx-brazil-scraper";
/** Crédito gratuito por padrão. Com plano pago, APIFY_TETO_MES sobe o teto e a varredura passa a cobrir a cidade inteira. */
const TETO_MES = Math.max(1, Number(process.env.APIFY_TETO_MES) || 4.95);
const PAGO = TETO_MES >= 25;
const OLX_VENDA = "https://www.olx.com.br/imoveis/venda/estado-go/anapolis";
const OLX_ALUGUEL = "https://www.olx.com.br/imoveis/aluguel/estado-go/anapolis";

interface Busca {
  /** identifica a busca entre as rodadas do mesmo coletor */
  id: string;
  ator: string;
  /** primeira do mês */
  completa: Porte;
  /** semanas seguintes; sem ela, a busca é só mensal */
  recente?: Porte;
  entrada: (limite: number, completa: boolean) => object;
}
interface Porte {
  limite: number;
  teto: number;
}
const olx = (urls: string[], detalhes: boolean) => (limite: number) => ({ searchUrls: urls, searchQueries: [], maxResults: limite, sortBy: "newest", enrichDetails: detalhes });
const zap = (limite: number, completa: boolean) => ({ deal_type: "sale", location: "Anápolis", sort: "MOST_RECENT", limit: limite, maximize_coverage: completa });

/**
 * Sem preço mínimo: lote e anúncio só com o ágio também entram. Na ordem de prioridade do crédito.
 * Os proprietários vêm com o texto do anúncio, de onde sai o telefone.
 * No gratuito, a OLX busca cada empreendimento uma vez por mês, e toda semana entram as novidades da cidade.
 */
const BUSCAS: Busca[] = [
  { id: "donos", ator: OLX, completa: { limite: 50, teto: 0.18 }, recente: { limite: 50, teto: 0.18 }, entrada: olx([`${OLX_VENDA}?sf=1&f=p`], true) },
  PAGO
    ? { id: "zap", ator: ZAP, completa: { limite: 9000, teto: 18 }, recente: { limite: 300, teto: 0.6 }, entrada: zap }
    : { id: "zap", ator: ZAP, completa: { limite: 200, teto: 0.4 }, recente: { limite: 200, teto: 0.4 }, entrada: zap },
  PAGO
    ? { id: "olx", ator: OLX, completa: { limite: 9000, teto: 10.8 }, recente: { limite: 300, teto: 0.36 }, entrada: olx([`${OLX_VENDA}?sf=1`], false) }
    : { id: "olx", ator: OLX, completa: { limite: 220, teto: 0.27 }, recente: { limite: 220, teto: 0.27 }, entrada: olx([`${OLX_VENDA}?sf=1`], false) },
  // aluguel para a captação da locação
  { id: "aluguel", ator: OLX, completa: { limite: 100, teto: 0.12 }, recente: { limite: 100, teto: 0.12 }, entrada: olx([`${OLX_ALUGUEL}?sf=1`], false) },
  ...(PAGO
    ? []
    : [
        {
          id: "empreendimentos",
          ator: OLX,
          completa: { limite: 800, teto: 0.96 },
          entrada: olx(
            EMPREENDIMENTOS.map((e) => `${OLX_VENDA}?q=${encodeURIComponent(e.busca)}`),
            false,
          ),
        },
      ]),
];

export interface Rodada {
  id: string;
  ator: string;
  status: string;
  inicio: string;
  dataset: string;
  custo: number;
  /** qual busca, guardada no nome da rodada da Apify */
  busca: string;
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
  (d: {
    id: string;
    status: string;
    startedAt: string;
    defaultDatasetId: string;
    usageTotalUsd?: number;
    options?: { build?: string };
    meta?: { userAgent?: string };
    generalAccess?: string;
    buildNumber?: string;
    title?: string;
  }): Rodada => ({
    id: d.id,
    ator,
    status: d.status,
    inicio: d.startedAt,
    dataset: d.defaultDatasetId,
    custo: d.usageTotalUsd ?? 0,
    busca: "",
  });

/** A Apify não guarda qual busca gerou a rodada: o painel anota num armazenamento da própria conta */
const ANOTACOES = "sarto-varredura";
async function anotacoes(): Promise<{ loja: string; buscas: Record<string, string> }> {
  const loja = (await api(`/key-value-stores?name=${ANOTACOES}`, { method: "POST" })).data.id as string;
  const r = await fetch(`${BASE}/key-value-stores/${loja}/records/buscas`, {
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Bearer ${process.env.APIFY_TOKEN}` },
  });
  const buscas = r.ok ? await r.json().catch(() => ({})) : {};
  return { loja, buscas: buscas && typeof buscas === "object" ? buscas : {} };
}
/** Guarda e lê um registro no mesmo armazenamento (ex.: a leitura do Canal Pro) */
export async function guardarRegistro(chave: string, valor: unknown) {
  const { loja } = await anotacoes();
  await api(`/key-value-stores/${loja}/records/${encodeURIComponent(chave)}`, { method: "PUT", body: JSON.stringify(valor) });
}
export async function lerRegistro(chave: string): Promise<unknown> {
  const { loja } = await anotacoes();
  const r = await fetch(`${BASE}/key-value-stores/${loja}/records/${encodeURIComponent(chave)}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Bearer ${process.env.APIFY_TOKEN}` },
  });
  return r.ok ? r.json().catch(() => null) : null;
}

async function anotar(id: string, busca: string) {
  const { loja, buscas } = await anotacoes();
  // guarda só as 200 mais novas
  const novas = Object.fromEntries([...Object.entries({ ...buscas, [id]: busca })].slice(-200));
  await api(`/key-value-stores/${loja}/records/buscas`, { method: "PUT", body: JSON.stringify(novas) });
}

/** Dos dois coletores, da mais nova para a mais antiga */
export async function rodadas(): Promise<Rodada[]> {
  const [l, { buscas }] = await Promise.all([
    Promise.all([ZAP, OLX].map(async (c) => (await api(`/acts/${c}/runs?desc=1&limit=30`)).data.items.map(rodada(c)) as Rodada[])),
    anotacoes(),
  ]);
  return l
    .flat()
    .map((r) => ({ ...r, busca: buscas[r.id] ?? "" }))
    .sort((x, y) => y.inicio.localeCompare(x.inicio));
}

export async function gastoDoMes(): Promise<number> {
  const j = await api("/users/me/limits");
  return Number(j.data?.current?.monthlyUsageUsd ?? 0);
}

const VIVA = new Set(["READY", "RUNNING", "TIMING-OUT", "ABORTING"]);
export const rodando = (r: Rodada) => VIVA.has(r.status);
/** Interrompida por tempo ou teto ainda entrega o que já foi pago */
export const tetoDoMes = () => TETO_MES;
export const entregou = (r: Rodada) => r.status === "SUCCEEDED" || r.status === "TIMED-OUT" || r.status === "ABORTED";
const doMes = (r: Rodada) => r.inicio.startsWith(new Date().toISOString().slice(0, 7));

/** Uma completa por mês, só as mais recentes nas outras. Nunca passa do teto do mês. */
export async function iniciar(intervaloHoras: number): Promise<{ ok: boolean; motivo?: string }> {
  const rs = await rodadas();
  if (rs.some(rodando)) return { ok: true, motivo: "Já há uma varredura em andamento" };
  // conta também a que falhou, para não gastar em repetição
  const daBusca = (b: Busca) => rs.filter((x) => x.ator === b.ator && (x.busca === b.id || (!x.busca && b.id !== "empreendimentos")));
  const livre = (b: Busca) => {
    const r = daBusca(b)[0];
    return !r || Date.now() - Date.parse(r.inicio) >= (entregou(r) ? intervaloHoras : 1) * 36e5;
  };
  const fila = BUSCAS.filter((b) => livre(b) && (b.recente || !daBusca(b).some((r) => entregou(r) && doMes(r))));
  if (!fila.length) return { ok: false, motivo: "A última varredura é recente. Tente mais tarde." };
  const gasto = await gastoDoMes();
  let reservado = 0;
  let iniciadas = 0;
  let falha: unknown;
  for (const b of fila) {
    const completa = !daBusca(b).some((r) => entregou(r) && doMes(r));
    // sem crédito para a completa, ainda vale buscar as novidades
    const p = completa && gasto + reservado + b.completa.teto <= TETO_MES ? b.completa : b.recente;
    if (!p || gasto + reservado + p.teto > TETO_MES) continue;
    reservado += p.teto; // mesmo se a resposta falhar, a rodada pode ter começado
    try {
      const r = await api(`/acts/${b.ator}/runs?maxTotalChargeUsd=${p.teto}&timeout=7200`, { method: "POST", body: JSON.stringify(b.entrada(p.limite, p === b.completa)) });
      await anotar(r.data.id, b.id).catch(() => undefined);
      iniciadas++;
    } catch (e) {
      falha = e;
    }
  }
  if (iniciadas) return falha ? { ok: true, motivo: "Parte da varredura não iniciou" } : { ok: true };
  if (falha) throw falha;
  return { ok: false, motivo: `Crédito do mês no fim (US$ ${gasto.toFixed(2)} de ${TETO_MES.toFixed(0)}). Volta no próximo ciclo.` };
}

/** Só os campos que o painel usa. Do texto do anúncio sai apenas o telefone; o texto fica no servidor. */
export async function itens({ dataset, ator, busca }: Rodada, offset: number) {
  const negocio = busca === "aluguel" ? "aluguel" : undefined;
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
      seller: { name: o.seller?.name, type: o.seller?.type, id: o.seller?.id },
      isBusiness: o.isBusiness,
      postedAt: o.postedAt,
      foto: fotoDoMolde(o.photos?.[0] ?? o.thumbnailUrl),
      telefone: telefoneNoTexto(`${o.title ?? ""} ${o.description ?? ""}`),
      empreendimento: acharEmpreendimento(`${o.title ?? ""} ${o.neighborhood ?? ""} ${o.description ?? ""}`),
      negocio,
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
    entities: {
      seller: {
        name: o.entities?.seller?.name,
        license_number: o.entities?.seller?.license_number,
        account_id: o.entities?.seller?.account_id ?? o.entities?.seller?.advertiser_id,
      },
    },
    foto: fotoDoMolde(o.media?.images?.[0]?.url),
    telefone: telefone(o.contact?.whatsapp) || (o.contact?.phones ?? []).map(telefone).find(Boolean) || "",
    empreendimento: acharEmpreendimento(`${o.content?.title ?? ""} ${o.location?.neighborhood ?? ""} ${o.content?.description ?? ""}`),
  }));
}
