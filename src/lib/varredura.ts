import { type Dia, diasEntre, hoje, lerData } from "./datas";
import { brl, lerValor, novoId, semAcento } from "./formato";
import { achar, type Linha } from "./planilha";
import type { Anuncio, ImovelSite, Regras } from "./tipos";

/** Anúncio recém-lido, antes de entrar no acompanhamento */
export type Bruto = Pick<
  Anuncio,
  | "portal"
  | "url"
  | "titulo"
  | "tipo"
  | "bairro"
  | "cidade"
  | "preco"
  | "precoAnterior"
  | "area"
  | "quartos"
  | "anunciante"
  | "codAnunciante"
  | "particular"
  | "telefone"
  | "foto"
  | "publicadoEm"
>;

// biome-ignore lint: formato muda conforme o coletor
type Obj = any;

const txt = (v: unknown) => (v == null ? "" : String(v).trim());
const nro = (v: unknown): number => (typeof v === "number" ? v : Array.isArray(v) ? nro(v[0]) : lerValor(txt(v)));
const portalDaUrl = (u: string) => (/zapimoveis/.test(u) ? "ZAP Imóveis" : /vivareal/.test(u) ? "Viva Real" : /olx\.com/.test(u) ? "OLX" : /62imoveis/.test(u) ? "62imóveis" : "");
const DONO = /propriet|particular|direto com o dono|pessoa f[ií]sica|^owner$|^private$/i;

const UNIDADES: Record<string, string> = {
  home: "Casa",
  two_story_house: "Sobrado",
  condominium: "Casa em condomínio",
  apartment: "Apartamento",
  penthouse: "Cobertura",
  flat: "Apartamento",
  kitnet: "Apartamento",
  residential_allotment_land: "Lote",
  allotment_land: "Lote",
  commercial_allotment_land: "Lote",
  commercial_building: "Comercial",
  office: "Comercial",
  business: "Comercial",
  shed_deposit_warehouse: "Comercial",
  farm: "Rural",
  country_house: "Rural",
};
/** A OLX separa o tipo em texto livre */
const tipoOlx = (t: string) => {
  const s = semAcento(t);
  if (/condom/.test(s)) return "Casa em condomínio";
  if (/cobertura/.test(s)) return "Cobertura";
  if (/apartamento|kitnet|flat|loft/.test(s)) return "Apartamento";
  if (/casa|sobrado/.test(s)) return "Casa";
  if (/sitio|chacara|fazenda/.test(s)) return "Rural";
  if (/terreno|lote/.test(s)) return "Lote";
  return /comerc|galp|loja|sala|predio/.test(s) ? "Comercial" : "";
};
/** "24000m²" e afins. Abaixo de 10 m² é campo preenchido por obrigação. */
const areaOlx = (t: string) => {
  const n = lerValor(t.replace(/m²|m2/gi, ""));
  return n >= 10 ? n : 0;
};
const unidade = (t: unknown) => UNIDADES[txt(Array.isArray(t) ? t[0] : t).toLowerCase()] ?? "";

/** Reconhece as saídas dos coletores da Apify (Zap e Viva Real, OLX) e planilha comum */
export function normalizar(x: unknown): Bruto | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Obj;
  let a: Bruto;
  if (o.identity && o.pricing) {
    // fatihtahta/zap-imoveis-scraper e vivareal-scraper
    const url = txt(o.source_context?.url);
    const v = o.entities?.seller ?? {};
    const r = o.attributes ?? {};
    a = {
      portal: portalDaUrl(url),
      url,
      titulo: txt(o.content?.title),
      tipo: unidade(r.unit_types) || unidade(r.property_type),
      bairro: txt(o.location?.neighborhood),
      cidade: txt(o.location?.city),
      preco: nro(o.pricing.offers?.find((f: Obj) => f.business_type === "sale")?.amount ?? o.pricing.amount),
      precoAnterior: 0,
      area: nro(r.area?.usable_area) || nro(r.area?.total_area),
      quartos: nro(r.rooms?.bedrooms),
      anunciante: txt(v.name),
      codAnunciante: txt(o.identity.external_id),
      particular: !v.license_number && (DONO.test(txt(v.name)) || /owner/i.test(txt(r.publisher_type))),
      telefone: txt(o.telefone) || undefined,
      foto: txt(o.foto) || undefined,
      publicadoEm: lerData(txt(o.timestamps?.created_at)) ?? undefined,
    };
  } else if (o.listingId && (o.seller || o.priceDisplay)) {
    // solidcode/olx-brazil-scraper
    const p = (n: RegExp) => txt((o.properties ?? []).find((q: Obj) => n.test(semAcento(txt(q?.name))))?.value);
    const dono = o.seller?.type === "private" || o.isBusiness === false;
    a = {
      portal: "OLX",
      url: txt(o.url),
      titulo: txt(o.title),
      tipo: tipoOlx(p(/real_estate_type|re_types/)) || tipoOlx(txt(o.categoryName)),
      bairro: txt(o.neighborhood),
      cidade: txt(o.city),
      preco: nro(o.price),
      precoAnterior: nro(o.oldPrice),
      area: areaOlx(p(/^size$|area|tamanho/)),
      quartos: nro(p(/^rooms$|quarto/)),
      anunciante: txt(o.seller?.name) || (dono ? "Proprietário" : ""),
      codAnunciante: "",
      particular: dono,
      telefone: txt(o.telefone) || undefined,
      foto: txt(o.foto) || undefined,
      publicadoEm: lerData(txt(o.postedAt)) ?? undefined,
    };
  } else if (o.advertiserName !== undefined || o.usableArea !== undefined) {
    // gio21/vivareal-zap-scraper e parecidos
    const url = txt(o.url);
    a = {
      portal: portalDaUrl(url),
      url,
      titulo: txt(o.title),
      tipo: txt(o.unitTypeLabel) || unidade(o.unitType),
      bairro: txt(o.neighborhood),
      cidade: txt(o.city),
      preco: nro(o.price),
      precoAnterior: nro(o.previousPrice ?? o.previousValues?.price),
      area: nro(o.usableArea) || nro(o.totalArea),
      quartos: nro(o.bedrooms),
      anunciante: txt(o.advertiserName),
      codAnunciante: txt(o.externalId),
      particular: DONO.test(txt(o.advertiserType)) || DONO.test(txt(o.advertiserName)),
      publicadoEm: lerData(txt(o.createdAt)) ?? undefined,
    };
  } else {
    const l = o as Linha;
    const url = achar(l, /url|link/);
    a = {
      portal: achar(l, /portal|fonte|site/) || portalDaUrl(url) || "Planilha",
      url,
      titulo: achar(l, /titulo|title|anuncio/) || achar(l, /endereco/),
      tipo: achar(l, /tipo/),
      bairro: achar(l, /bairro|condominio|neighborhood/),
      cidade: achar(l, /cidade|city/),
      preco: lerValor(achar(l, /^preco$|^valor|^price/)),
      precoAnterior: lerValor(achar(l, /anterior/)),
      area: lerValor(achar(l, /area|m2|metr/)),
      quartos: lerValor(achar(l, /quarto|dorm|bedroom/)),
      anunciante: achar(l, /anunciante|imobiliaria|advertiser/),
      codAnunciante: achar(l, /codigo|external/),
      particular: DONO.test(achar(l, /anunciante|imobiliaria|advertiser/)),
      publicadoEm: lerData(achar(l, /publicado|data|created/)) ?? undefined,
    };
  }
  if (!a.titulo) a.titulo = [a.tipo || "Imóvel", a.bairro].filter(Boolean).join(", ");
  return a.preco > 0 ? a : null;
}

const semPontos = (t: string) =>
  semAcento(t)
    .replace(/\b(residencial|condominio|cond|setor|bairro|jardim|parque|vila|loteamento|horizontal)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Mesmo anúncio em coletas diferentes: número do anúncio no fim do endereço */
const chaveAnuncio = (a: Pick<Anuncio, "portal" | "url" | "titulo" | "bairro" | "area">) => {
  const n = /(\d{6,})\/?(?:[?#].*)?$/.exec(a.url)?.[1];
  return n ? `${a.portal}|${n}` : `${a.portal}|${a.url || `${semPontos(a.titulo)}|${semPontos(a.bairro)}|${a.area}`}`;
};

export interface Resultado {
  lista: Anuncio[];
  novos: number;
  baixaram: number;
  iguais: number;
  foraDaCidade: number;
}

/** Junta uma coleta: anúncio conhecido mantém situação e observação; preço menor vira sinal */
export function mesclar(atuais: Anuncio[], brutos: Bruto[], cidade: string, ref: Dia = hoje()): Resultado {
  const m = new Map(atuais.map((a) => [chaveAnuncio(a), a]));
  const r: Resultado = { lista: [], novos: 0, baixaram: 0, iguais: 0, foraDaCidade: 0 };
  const alvo = semAcento(cidade).trim();
  for (const b of brutos) {
    if (alvo && b.cidade && !semAcento(b.cidade).includes(alvo)) {
      r.foraDaCidade++;
      continue;
    }
    const k = chaveAnuncio(b);
    const a = m.get(k);
    if (!a) {
      r.novos++;
      m.set(k, { ...b, id: novoId(), primeiraVez: ref, vistoEm: ref, status: "abordar", obs: "" });
      continue;
    }
    const baixou = b.preco < a.preco;
    if (baixou) r.baixaram++;
    else r.iguais++;
    m.set(k, {
      ...a,
      ...b,
      anunciante: b.anunciante || a.anunciante,
      area: b.area || a.area,
      quartos: b.quartos || a.quartos,
      bairro: b.bairro || a.bairro,
      telefone: b.telefone ?? a.telefone,
      foto: b.foto ?? a.foto,
      publicadoEm: a.publicadoEm ?? b.publicadoEm,
      precoAnterior: baixou ? a.preco : b.preco === a.preco ? Math.max(a.precoAnterior, b.precoAnterior) : b.precoAnterior,
      id: a.id,
      primeiraVez: a.primeiraVez,
      vistoEm: ref,
      status: a.status,
      obs: a.obs,
    });
  }
  r.lista = [...m.values()];
  return r;
}

const perto = (x: number, y: number, tol: number) => x > 0 && y > 0 && Math.abs(x - y) / Math.max(x, y) <= tol;

function lugares(a: { bairro: string; titulo: string; url: string }) {
  return semPontos(`${a.bairro} ${a.titulo} ${a.url.replace(/[-/]/g, " ")}`);
}
function mesmoLugar(a: { bairro: string; titulo: string; url: string }, nomes: string[]) {
  const onde = ` ${lugares(a)} `;
  return nomes.map(semPontos).some((n) => n.length >= 4 && onde.includes(` ${n} `));
}

/** Dois anúncios do mesmo imóvel, em imobiliárias ou portais diferentes */
function mesmoImovel(a: Anuncio, b: Anuncio) {
  if (!perto(a.area, b.area, 0.02) || !perto(a.preco, b.preco, 0.08)) return false;
  if (a.quartos && b.quartos && Math.abs(a.quartos - b.quartos) > 1) return false;
  return mesmoLugar(a, [b.bairro]) || mesmoLugar(b, [a.bairro]);
}

/** O que a Sarto já tem: anúncio dela mesma ou imóvel igual na carteira do site */
function naCarteiraDaSarto(a: Anuncio, carteira: ImovelSite[]): ImovelSite | "sarto" | null {
  const daSarto = /\bsarto\b/i.test(a.anunciante) || /\b36\.?221\b/.test(a.anunciante);
  if (daSarto) return carteira.find((i) => a.codAnunciante && i.cod.toUpperCase() === a.codAnunciante.toUpperCase()) ?? "sarto";
  return (
    carteira.find(
      (i) =>
        (perto(a.area, i.area ?? 0, 0.02) || perto(a.area, i.terreno ?? 0, 0.01)) &&
        perto(a.preco, i.venda ?? 0, 0.06) &&
        !(a.quartos && (i.quartos ?? i.suites) && Math.abs(a.quartos - (i.quartos ?? i.suites ?? 0)) > 1) &&
        mesmoLugar(a, [i.bairro ?? "", i.cond ?? ""]),
    ) ?? null
  );
}

export function dentroPadrao(a: Pick<Anuncio, "preco" | "bairro" | "titulo" | "url">, r: Regras) {
  if (a.preco < r.padraoPrecoMin || (r.padraoPrecoMax > 0 && a.preco > r.padraoPrecoMax)) return false;
  const nomes = r.padraoBairros.split(/[,;\n]/).filter((x) => x.trim());
  return !nomes.length || mesmoLugar(a, nomes);
}

export interface Grupo {
  id: string;
  principal: Anuncio;
  outros: Anuncio[];
  sarto: ImovelSite | "sarto" | null;
  noPadrao: boolean;
  novo: boolean;
  baixou: number;
  parado: number;
  particular: boolean;
  peso: number;
  motivos: string[];
}

/** Quem dá para chamar: o dono com telefone, depois qualquer telefone, depois o anúncio do dono */
export function melhorContato(g: Pick<Grupo, "principal" | "outros">): Anuncio {
  const l = [g.principal, ...g.outros];
  return l.find((a) => a.particular && a.telefone) ?? l.find((a) => a.particular) ?? l.find((a) => a.telefone) ?? g.principal;
}

export const precoM2 = (a: Pick<Anuncio, "preco" | "area">) => (a.area >= 10 ? a.preco / a.area : 0);

/** Uma linha por imóvel: junta repetidos, marca o que já é da Sarto e ordena por chance de captar */
export function montarGrupos(anuncios: Anuncio[], carteira: ImovelSite[], r: Regras, ref: Dia = hoje()): Grupo[] {
  const grupos: Anuncio[][] = [];
  // compara só dentro da mesma faixa de área, para não cruzar milhares com milhares
  const porArea = new Map<number, number[]>();
  for (const a of anuncios) {
    const faixa = Math.round(a.area / 10);
    const candidatos = [faixa - 1, faixa, faixa + 1].flatMap((f) => porArea.get(f) ?? []);
    const i = a.area ? candidatos.find((g) => grupos[g].some((b) => mesmoImovel(a, b))) : undefined;
    const g = i ?? grupos.push([]) - 1;
    grupos[g].push(a);
    porArea.set(faixa, [...(porArea.get(faixa) ?? []), g]);
  }
  return grupos
    .map((g): Grupo => {
      const ord = [...g].sort((x, y) => Number(y.particular) - Number(x.particular) || Number(y.status !== "abordar") - Number(x.status !== "abordar") || x.preco - y.preco);
      const p = ord[0];
      const sarto = g.map((a) => naCarteiraDaSarto(a, carteira)).find(Boolean) ?? null;
      const particular = g.some((a) => a.particular);
      const baixou = Math.max(0, ...g.map((a) => (a.precoAnterior > a.preco ? a.precoAnterior - a.preco : 0)));
      const pub = g
        .map((a) => a.publicadoEm)
        .filter((d): d is string => !!d)
        .sort()[0];
      const parado = pub ? diasEntre(pub, ref) : 0;
      const novo = diasEntre(p.primeiraVez, ref) < 7;
      const motivos: string[] = [];
      if (particular) motivos.push("do próprio dono");
      if (baixou) motivos.push(`baixou ${brl(baixou, false)}`);
      if (parado >= 90) motivos.push(`parado há ${parado} dias`);
      if (g.length > 1) motivos.push(`em ${g.length} anúncios`);
      const peso = (particular ? 4 : 0) + (parado >= 90 ? 2 : 0) + (baixou ? 2 : 0) + (g.length > 1 ? 1 : 0);
      return { id: p.id, principal: p, outros: ord.slice(1), sarto, noPadrao: g.some((a) => dentroPadrao(a, r)), novo, baixou, parado, particular, peso, motivos };
    })
    .sort((x, y) => y.peso - x.peso || y.principal.preco - x.principal.preco);
}

/** Custo da coleta na Apify, com os preços publicados em novembro de 2026 */
const APIFY = { zapPorMil: 1.99, olxPorMil: 1.2, gratis: 5, starter: 19, dolar: 5.86 };
export function custoApify(anunciosZap: number, anunciosOlx: number, coletasMes: number) {
  const usd = ((anunciosZap * APIFY.zapPorMil + anunciosOlx * APIFY.olxPorMil) / 1000) * coletasMes;
  const pago = usd <= APIFY.gratis ? 0 : Math.max(APIFY.starter, usd);
  return { uso: usd, pago, reais: pago * APIFY.dolar };
}
