import { type Dia, maisDias, MESES } from "./datas";
import { lerValor, semAcento } from "./formato";
import { idNota } from "./notas";
import type { NotaPortal } from "./tipos";
import type { Bruto } from "./varredura";

/**
 * Captura: um favorito do navegador que a pessoa clica com a página de busca
 * aberta. Ele lê os anúncios que já estão na tela dela e deixa pronto para
 * colar aqui. Não abre página sozinho, não faz login e não contorna bloqueio.
 */
export interface Captura {
  sarto: 1;
  host: string;
  titulo: string;
  itens: { u: string; t: string }[];
}

// Texto puro, e não função: o compilador do site reescreveria uma função e o favorito quebraria.
// Roda dentro da página do portal, sem rede e sem dependência.
export const CODIGO_FAVORITO = String.raw`(function(){
var h=location.hostname,itens=[],vistos={};
function poe(u,t){
  t=t.replace(/[ \t]+/g," ").trim().slice(0,900);
  if(u in vistos){if(t.length<itens[vistos[u]].t.length)itens[vistos[u]].t=t;return}
  vistos[u]=itens.length;itens.push({u:u,t:t});
}
if(/jetimob\.com$/.test(h)){
  document.querySelectorAll(".alert-dropdown").forEach(function(a){
    var c=a,l=null;
    for(var i=0;i<9&&c&&!l;i++){c=c.parentElement;l=c?c.querySelector('a[href*="/imoveis/"]'):null}
    if(l)poe(l.pathname.replace(/\/editar$/,""),(a.textContent||"").replace(/Editar\s*$/,""));
  });
}else{
  var re=/olx\.com\.br$/.test(h)?/-\d{8,}$/:/\/imovel\//;
  document.querySelectorAll("a[href]").forEach(function(a){
    if(!re.test(a.pathname)||(/olx/.test(h)&&!/\/imoveis\//.test(a.pathname)))return;
    var b=a;
    for(var i=0;i<6&&b&&!/R\$/.test(b.innerText||"");i++)b=b.parentElement;
    var t=b?b.innerText:"";
    if(!/R\$/.test(t)||t.length<40||t.length>1400)return;
    poe(a.origin+a.pathname,t);
  });
}
var fora=JSON.stringify({sarto:1,host:h,titulo:document.title,itens:itens});
var d=document.createElement("div");
d.style.cssText="position:fixed;z-index:2147483647;right:20px;top:20px;width:300px;background:#262626;color:#f5f5f4;padding:18px;font:14px/1.5 sans-serif";
var p=document.createElement("p");p.style.margin="0 0 12px";
p.textContent=itens.length?itens.length+(itens.length===1?" item lido":" itens lidos")+" nesta p\u00e1gina.":"Nada reconhecido nesta p\u00e1gina. Role at\u00e9 o fim e tente de novo.";
d.appendChild(p);
function botao(txt,f){
  var b=document.createElement("button");b.textContent=txt;
  b.style.cssText="background:#f5f5f4;color:#262626;border:0;padding:8px 14px;margin-right:8px;font:inherit;cursor:pointer";
  b.onclick=f;d.appendChild(b);return b;
}
if(itens.length){
  var c=botao("Copiar para o painel",function(){
    function ok(){c.textContent="Copiado"}
    function antigo(){var ta=document.createElement("textarea");ta.value=fora;document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove();ok()}
    if(navigator.clipboard)navigator.clipboard.writeText(fora).then(ok,antigo);else antigo();
  });
}
botao("Fechar",function(){d.remove()});
document.body.appendChild(d);
window.__capturaSarto=fora;
})()`;

export const favorito = () => `javascript:${encodeURIComponent(CODIGO_FAVORITO)};void 0`;

export function lerCaptura(texto: string): Captura | null {
  try {
    const j = JSON.parse(texto);
    return j?.sarto === 1 && Array.isArray(j.itens) && typeof j.host === "string" ? j : null;
  } catch {
    return null;
  }
}

const portalDe = (host: string) =>
  /zapimoveis/.test(host) ? "ZAP Imóveis" : /vivareal/.test(host) ? "Viva Real" : /olx/.test(host) ? "OLX" : /62imoveis/.test(host) ? "62imóveis" : host;

const linhasDe = (t: string) =>
  t
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

const valorLinha = (l: string) => {
  const m = /^R\$\s*([\d.]+)(?:,\d{2})?$/.exec(l);
  return m ? lerValor(m[1]) : 0;
};
const capital = (t: string) => t.toLowerCase().replace(/(^|[\s(/-])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase());

function dataSolta(t: string, ref: Dia): Dia | undefined {
  const s = semAcento(t);
  if (/\bhoje\b/.test(s)) return ref;
  if (/\bontem\b/.test(s)) return maisDias(ref, -1);
  const c = /(\d{2})\/(\d{2})\/(\d{2,4})/.exec(s);
  if (c) return `${c[3].length === 2 ? `20${c[3]}` : c[3]}-${c[2]}-${c[1]}`;
  const e = /(\d{1,2}) de (\w{3})/.exec(s);
  const mes = e ? MESES.findIndex((m) => semAcento(m).startsWith(e[2])) : -1;
  if (!e || mes < 0) return undefined;
  const d = `${ref.slice(0, 4)}-${String(mes + 1).padStart(2, "0")}-${e[1].padStart(2, "0")}`;
  return d > ref ? `${Number(ref.slice(0, 4)) - 1}${d.slice(4)}` : d;
}

function tipoDe(t: string) {
  const s = semAcento(t);
  if (/condominio/.test(s) && /casa|sobrado/.test(s)) return "Casa em condomínio";
  if (/sobrado/.test(s)) return "Sobrado";
  if (/cobertura/.test(s)) return "Cobertura";
  if (/apartamento|\bap\b|flat|studio|loft|kitnet/.test(s)) return "Apartamento";
  if (/lote|terreno/.test(s)) return "Lote";
  if (/sala|galpao|comercial|loja|predio/.test(s)) return "Comercial";
  if (/fazenda|chacara|sitio|rural/.test(s)) return "Rural";
  if (/casa/.test(s)) return "Casa";
  return "";
}

const vazio = (portal: string, url: string): Bruto => ({ portal, url, titulo: "", tipo: "", bairro: "", cidade: "", preco: 0, precoAnterior: 0, area: 0, quartos: 0, anunciante: "", codAnunciante: "", particular: false });

function cartaoGrupoZap(portal: string, u: string, t: string): Bruto | null {
  const L = linhasDe(t);
  // lançamento de construtora ("A partir de") não é captação
  if (L.some((l) => /^a partir de/i.test(l))) return null;
  const i = L.findIndex((l) => /para (comprar|alugar) com|à venda com|para comprar em/i.test(l));
  const a = vazio(portal, u);
  const ant = i > 0 ? L[i - 1] : "";
  a.anunciante = /fotos?$|destaque|premium|lan[çc]amento|tour|v[íi]deo|^\+?\d+$/i.test(ant) ? "" : ant;
  a.particular = /propriet[áa]rio|particular/i.test(a.anunciante);
  const ps = L.map(valorLinha).filter(Boolean);
  a.preco = ps.length > 1 && ps[1] < ps[0] && ps[1] > ps[0] * 0.5 ? ps[1] : (ps[0] ?? 0);
  a.precoAnterior = ps.length > 1 && a.preco === ps[1] ? ps[0] : 0;
  const tit = i >= 0 ? L[i] : "";
  a.area = lerValor(/(\d[\d.]*)\s*m²/.exec(tit)?.[1] ?? L.find((l) => /^\d[\d.]*\s*m²$/.test(l)) ?? "");
  a.quartos = Number(/(\d+)\s*quarto/.exec(tit)?.[1] ?? 0);
  const lugar = L.map((l) => /^(.+),\s*([^,]+)$/.exec(l)).find((m) => m && !/R\$|m²|\d{3,}/.test(m[0]) && /^[A-ZÀ-Ú]/.test(m[2]) && !/quarto|banheiro|vaga/i.test(m[0]));
  a.bairro = lugar?.[1] ?? "";
  a.cidade = lugar?.[2] ?? "";
  a.tipo = tipoDe(tit || u);
  // o nome do condomínio só aparece no endereço do anúncio
  const cond = /condominio-(?:residencial-)?([a-z-]+?)(?:-bairros|-anapolis|-com-garagem|-go-|-\d)/.exec(u)?.[1];
  a.titulo = [a.tipo || "Imóvel", a.area ? `${a.area} m²` : "", cond ? `Cond. ${capital(cond.replace(/-/g, " "))}` : a.bairro].filter(Boolean).join(", ");
  return a.preco ? a : null;
}

function cartaoOlx(portal: string, u: string, t: string, ref: Dia): Bruto | null {
  const L = linhasDe(t);
  const a = vazio(portal, u);
  a.titulo = L[0] ?? "";
  a.particular = L.some((l) => /direto com o propriet/i.test(l));
  a.anunciante = a.particular ? "Proprietário" : "";
  const ps = L.map(valorLinha).filter(Boolean);
  a.preco = ps.length > 1 && ps[1] < ps[0] && ps[1] > ps[0] * 0.5 ? ps[1] : (ps[0] ?? 0);
  a.precoAnterior = ps.length > 1 && a.preco === ps[1] ? ps[0] : 0;
  const im = L.findIndex((l) => /^\d[\d.]*\s*m²$/.test(l));
  a.area = im >= 0 ? lerValor(L[im]) : 0;
  a.quartos = im >= 0 && /^\d{1,2}$/.test(L[im + 1] ?? "") ? Number(L[im + 1]) : 0;
  const lugar = L.map((l) => /^([^,\d]+),\s*([^,\d]+)$/.exec(l)).filter(Boolean).pop();
  a.cidade = lugar?.[1].trim() ?? "";
  a.bairro = lugar?.[2].trim() ?? "";
  a.tipo = tipoDe(a.titulo);
  a.publicadoEm = dataSolta(L.slice(-3).join(" "), ref);
  return a.preco && a.titulo ? a : null;
}

function cartao62(portal: string, u: string, t: string, ref: Dia): Bruto | null {
  const L = linhasDe(t);
  const a = vazio(portal, u);
  const e = L.findIndex((l) => l.split(",").length >= 2 && !/R\$/.test(l));
  const partes = e >= 0 ? L[e].split(",").map((x) => capital(x.trim())) : [];
  a.cidade = partes.at(-1) ?? "";
  a.bairro = partes.at(-2) ?? "";
  a.titulo = e >= 0 && L[e + 1] && !/^R\$/.test(L[e + 1]) ? capital(L[e + 1]) : partes.join(", ");
  a.preco = L.map(valorLinha).find(Boolean) ?? 0;
  a.area = lerValor(L.find((l) => /^\d[\d.,]*\s*m²$/.test(l)) ?? "");
  a.quartos = Number(/^(\d+) quartos?$/i.exec(L.find((l) => /^\d+ quartos?$/i.test(l)) ?? "")?.[1] ?? 0);
  const c = L.findIndex((l) => /^creci/i.test(l));
  const creci = c >= 0 ? (/\d{3,}/.exec(L.slice(c, c + 2).join(" "))?.[0] ?? "") : "";
  a.anunciante = creci ? `CRECI ${creci}` : "Proprietário";
  a.particular = !creci;
  a.tipo = tipoDe(u.split("/imovel/")[1] ?? a.titulo);
  a.publicadoEm = dataSolta(t, ref);
  return a.preco ? a : null;
}

export function anunciosDaCaptura(c: Captura, ref: Dia): Bruto[] {
  const portal = portalDe(c.host);
  return c.itens
    .map((i) =>
      /zapimoveis|vivareal/.test(c.host)
        ? cartaoGrupoZap(portal, i.u, i.t)
        : /olx/.test(c.host)
          ? cartaoOlx(portal, i.u, i.t, ref)
          : /62imoveis/.test(c.host)
            ? cartao62(portal, i.u, i.t, ref)
            : null,
    )
    .filter((x): x is Bruto => !!x);
}

/** Tela Portais do Jetimob: imóveis que "requerem atenção", com o motivo que o Jetimob dá */
export function notasDaCaptura(c: Captura, em: Dia): NotaPortal[] {
  if (!/jetimob\.com$/.test(c.host)) return [];
  const portal = /canalpro/i.test(c.titulo) ? "Canal Pro (Jetimob)" : `Jetimob ${c.titulo.split(">").pop()?.trim() ?? ""}`.trim();
  return c.itens.map((i) => {
    const cod = i.u.split("/").pop() ?? "";
    return { id: idNota(cod, portal), cod, portal, nota: null, motivo: i.t.replace(/\s+/g, " ").replace(/^Alerta\s*/i, "").replace(/^Informações incompletas:\s*/i, "").trim() || "Informações incompletas", em };
  });
}
