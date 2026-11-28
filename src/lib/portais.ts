/**
 * Carteira x portais: cruza os imóveis do site com o que o Canal Pro mostra (publicado, bloqueado,
 * não publicado e o motivo) e diz o que fazer em cada caso. Sem dependências: o robô local também usa.
 */
import type { Campo } from "./qualidade";
import type { ImovelSite } from "./tipos";

type SituacaoCanal = "publicado" | "nao_publicado" | "bloqueado" | "processando";
export interface AnuncioCanal {
  cod: string;
  negocio: string;
  preco: number;
  area: number;
  nota: number | null;
  situacao: SituacaoCanal;
  motivo: string;
  destaque: boolean;
  atualizado: string | null;
}
interface QualidadeCanal {
  cod: string;
  nota: number | null;
  classe: string;
  faltando: Campo[];
}
export interface LeituraCanal {
  coletadoEm: string;
  anuncios: AnuncioCanal[];
  /** do relatório "Qualidade dos Anúncios", baixado pelo robô */
  qualidade?: QualidadeCanal[];
}

const SITUACOES: Record<string, SituacaoCanal> = { publicado: "publicado", "não publicado": "nao_publicado", bloqueado: "bloqueado", "em processamento": "processando" };
const MOTIVO = /^(Identificamos|Este anúncio não pode|Preço incompat|Anúncio Desativado|Anúncio bloqueado|Endereço|Informações)/i;
const digitos = (t: string) => Number(t.replace(/\D/g, "")) || 0;

/** Um cartão da lista "Meus anúncios", linha por linha, como o Canal Pro mostra */
export function lerCartao(linhas: string[]): AnuncioCanal | null {
  const l = linhas.map((x) => x.trim()).filter(Boolean);
  const neg = l.findIndex((x) => /^(Venda|Aluguel|Venda\/Aluguel|Temporada)$/i.test(x));
  if (neg < 0) return null;
  const cod = l.slice(neg + 1, neg + 4).find((x) => /^[A-Za-z]{0,4}\d{2,}$/.test(x));
  if (!cod) return null;
  const sit = l.map((x) => SITUACOES[x.toLowerCase()]).find(Boolean);
  const nota = l.map((x) => /^(\d+(?:[.,]\d+)?)\/10$/.exec(x)).find(Boolean);
  const at = l.map((x) => /^Atualizado em (\d\d)\/(\d\d)\/(\d{4})/.exec(x)).find(Boolean);
  return {
    cod: cod.toUpperCase(),
    negocio: l[neg],
    preco: digitos(l.find((x) => /^R\$/.test(x)) ?? ""),
    area: digitos((l.find((x) => /m²$/.test(x)) ?? "").replace(/m²$/, "")),
    nota: nota ? Number(nota[1].replace(",", ".")) : null,
    situacao: sit ?? "publicado",
    motivo: l.find((x) => MOTIVO.test(x)) ?? "",
    destaque: l.includes("Destaque"),
    atualizado: at ? `${at[3]}-${at[2]}-${at[1]}` : null,
  };
}

/** Confere o que veio do robô antes de guardar: só a forma esperada, sem texto livre além do motivo */
export function validarLeitura(x: unknown): LeituraCanal | null {
  const o = x as { coletadoEm?: unknown; cartoes?: unknown };
  if (!o || typeof o.coletadoEm !== "string" || !Array.isArray(o.cartoes) || o.cartoes.length > 5000) return null;
  const anuncios = o.cartoes
    .filter((c): c is string[] => Array.isArray(c) && c.length < 80 && c.every((s) => typeof s === "string" && s.length < 400))
    .map(lerCartao)
    .filter((a): a is AnuncioCanal => !!a);
  const vistos = new Map(anuncios.map((a) => [a.cod, a]));
  return Number.isNaN(Date.parse(o.coletadoEm)) ? null : { coletadoEm: new Date(o.coletadoEm).toISOString(), anuncios: [...vistos.values()] };
}

export type Presenca = "publicado" | "bloqueado" | "nao_publicado" | "processando" | "fora_do_canal" | "so_no_canal" | "fora_do_relatorio" | "sem_leitura";
export interface LinhaPresenca {
  cod: string;
  im: ImovelSite | null;
  canal: AnuncioCanal | null;
  presenca: Presenca;
  /** o problema, em português */
  problema: string;
  /** o que fazer, e onde */
  fazer: string;
  grave: boolean;
}

const CIDADE = "anapolis";
const sem = (t: string | null | undefined) => (t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function oQueFazer(a: AnuncioCanal): string {
  if (/5 imagens|imagens/i.test(a.motivo)) return "Subir pelo menos 5 fotos no Jetimob";
  if (/duplicad/i.test(a.motivo)) return "Apagar a cópia no Jetimob ou contestar o bloqueio no Canal Pro";
  if (/lan[cç]amento/i.test(a.motivo)) return "Se for imóvel pronto, contestar no Canal Pro; se for lançamento, anunciar como lançamento";
  if (/pre[cç]o/i.test(a.motivo)) return "Conferir preço e área no Jetimob";
  return "Abrir o anúncio no Canal Pro e ver o aviso";
}

/** Cada imóvel do site com a situação no Canal Pro, mais o que só existe no Canal Pro */
/** `comNota`: os códigos do último relatório de qualidade importado, usados quando o robô ainda não rodou */
export function presencaNosPortais(carteira: ImovelSite[], leitura: LeituraCanal | null, comNota?: Set<string>): LinhaPresenca[] {
  // sem o robô, o relatório de qualidade importado diz quem está publicado: só anúncio no ar tem nota
  if (!leitura && comNota?.size) return porRelatorio(carteira, comNota);
  const canal = new Map((leitura?.anuncios ?? []).map((a) => [a.cod.toUpperCase(), a]));
  const linhas: LinhaPresenca[] = carteira.map((im) => {
    const a = canal.get(im.cod.toUpperCase()) ?? null;
    const fotos = (im.fotos ?? 0) < 5 ? `só ${im.fotos ?? 0} fotos` : "";
    if (!leitura) {
      return fotos
        ? { cod: im.cod, im, canal: null, presenca: "sem_leitura", problema: `Com ${fotos}, o Canal Pro não publica`, fazer: "Subir pelo menos 5 fotos no Jetimob", grave: true }
        : { cod: im.cod, im, canal: null, presenca: "sem_leitura", problema: "", fazer: "", grave: false };
    }
    if (!a) {
      const fora = im.cidade && !sem(im.cidade).includes(CIDADE);
      return {
        cod: im.cod,
        im,
        canal: null,
        presenca: "fora_do_canal",
        problema: `Está no site e não chegou ao Canal Pro${fora ? ` (imóvel em ${im.cidade})` : ""}${fotos ? `, ${fotos}` : ""}`,
        fazer: fora ? "Confirmar se deve ir aos portais; se sim, marcar ZAP e OLX no Jetimob" : "No Jetimob, marcar o envio para ZAP e OLX e conferir os campos obrigatórios",
        grave: true,
      };
    }
    if (a.situacao === "publicado") {
      return {
        cod: im.cod,
        im,
        canal: a,
        presenca: "publicado",
        problema: fotos ? `Publicado, mas ${fotos}` : "",
        fazer: fotos ? "Subir mais fotos antes que o Canal Pro tire do ar" : "",
        grave: false,
      };
    }
    return {
      cod: im.cod,
      im,
      canal: a,
      presenca: a.situacao,
      problema: a.motivo || (a.situacao === "processando" ? "Em processamento no Canal Pro" : "Fora do ar sem motivo informado"),
      fazer: oQueFazer(a),
      grave: a.situacao !== "processando",
    };
  });
  const noSite = new Set(carteira.map((i) => i.cod.toUpperCase()));
  for (const a of canal.values())
    if (!noSite.has(a.cod))
      linhas.push({
        cod: a.cod,
        im: null,
        canal: a,
        presenca: "so_no_canal",
        problema: `No Canal Pro (${a.situacao === "publicado" ? "publicado" : a.situacao.replace("_", " ")}) e não no site`,
        fazer: "Conferir se o imóvel saiu da carteira ou se é novo e o site ainda não atualizou",
        grave: false,
      });
  return linhas;
}

function porRelatorio(carteira: ImovelSite[], comNota: Set<string>): LinhaPresenca[] {
  return carteira.map((im) => {
    const fotos = (im.fotos ?? 0) < 5 ? `só ${im.fotos ?? 0} fotos` : "";
    if (comNota.has(im.cod.toUpperCase()))
      return {
        cod: im.cod,
        im,
        canal: null,
        presenca: "publicado",
        problema: fotos ? `Publicado, mas ${fotos}` : "",
        fazer: fotos ? "Subir mais fotos antes que o Canal Pro tire do ar" : "",
        grave: false,
      };
    const fora = im.cidade && !sem(im.cidade).includes(CIDADE);
    return {
      cod: im.cod,
      im,
      canal: null,
      presenca: "fora_do_relatorio",
      problema: `Não está no relatório de qualidade do Canal Pro: bloqueado, sem publicar ou fora do Canal Pro${fora ? ` (imóvel em ${im.cidade})` : ""}${fotos ? `, ${fotos}` : ""}`,
      fazer: fotos ? "Subir pelo menos 5 fotos no Jetimob" : "Ver o motivo no Canal Pro, ou rodar o robô, que traz o motivo",
      grave: true,
    };
  });
}
