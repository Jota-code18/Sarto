/** Só roda no servidor: a chave da Apify nunca chega ao navegador. */
const BASE = process.env.APIFY_BASE ?? "https://api.apify.com/v2";
export const COLETOR = "fatihtahta~zap-imoveis-scraper";
const TETO_MES = 4.95;
const COMPLETA = { limite: 1600, teto: 3.2 };
const RECENTE = { limite: 300, teto: 0.6 };
const PRECO_MIN = 1_000_000;

export interface Rodada {
  id: string;
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

const rodada = (d: { id: string; status: string; startedAt: string; defaultDatasetId: string; usageTotalUsd?: number }): Rodada => ({ id: d.id, status: d.status, inicio: d.startedAt, dataset: d.defaultDatasetId, custo: d.usageTotalUsd ?? 0 });

export async function rodadas(): Promise<Rodada[]> {
  const j = await api(`/acts/${COLETOR}/runs?desc=1&limit=20`);
  return j.data.items.map(rodada);
}

export async function gastoDoMes(): Promise<number> {
  const j = await api("/users/me/limits");
  return Number(j.data?.current?.monthlyUsageUsd ?? 0);
}

const VIVA = new Set(["READY", "RUNNING", "TIMING-OUT", "ABORTING"]);
export const rodando = (r: Rodada) => VIVA.has(r.status);

/** Uma completa por mês, só as mais recentes nas outras. Nunca passa do crédito gratuito. */
export async function iniciar(intervaloHoras: number): Promise<{ ok: boolean; motivo?: string }> {
  const rs = await rodadas();
  if (rs.some(rodando)) return { ok: true, motivo: "Já há uma varredura em andamento" };
  const ultima = rs.find((r) => r.status === "SUCCEEDED");
  // conta também as que falharam, para não gastar em repetição
  const recente = rs[0] && Date.now() - Date.parse(rs[0].inicio) < (rs[0].status === "SUCCEEDED" ? intervaloHoras : 1) * 36e5;
  if (recente) return { ok: false, motivo: "A última varredura é recente. Tente mais tarde." };
  const mes = new Date().toISOString().slice(0, 7);
  const completa = !ultima || !rs.some((r) => r.status === "SUCCEEDED" && r.inicio.startsWith(mes));
  const p = completa ? COMPLETA : RECENTE;
  const gasto = await gastoDoMes();
  if (gasto + p.teto > TETO_MES) return { ok: false, motivo: `Crédito gratuito do mês no fim (US$ ${gasto.toFixed(2)} de 5). Volta no próximo ciclo.` };
  await api(`/acts/${COLETOR}/runs?maxTotalChargeUsd=${p.teto}&timeout=1800`, {
    method: "POST",
    body: JSON.stringify({ deal_type: "sale", location: "Anápolis", sort: "MOST_RECENT", min_price: PRECO_MIN, limit: p.limite, maximize_coverage: completa }),
  });
  return { ok: true };
}

/** Só os campos que o painel usa: descrição, telefone e foto ficam de fora */
export async function itens(dataset: string, offset: number) {
  return api(`/datasets/${encodeURIComponent(dataset)}/items?clean=1&offset=${offset}&limit=400&fields=identity,source_context,timestamps,content,pricing,location,attributes,entities`).then((l: Record<string, never>[]) =>
    l.map((o: Record<string, any>) => ({
      identity: { external_id: o.identity?.external_id },
      source_context: { url: o.source_context?.url },
      timestamps: { created_at: o.timestamps?.created_at },
      content: { title: o.content?.title },
      pricing: { amount: o.pricing?.amount, offers: o.pricing?.offers },
      location: { neighborhood: o.location?.neighborhood, city: o.location?.city },
      attributes: { unit_types: o.attributes?.unit_types, rooms: o.attributes?.rooms, area: o.attributes?.area },
      entities: { seller: { name: o.entities?.seller?.name, license_number: o.entities?.seller?.license_number } },
    })),
  );
}
