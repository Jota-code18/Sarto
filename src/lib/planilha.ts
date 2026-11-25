import { lerCsv } from "./extrato";
import { semAcento } from "./formato";

export type Linha = Record<string, string>;

const chave = (c: string) =>
  semAcento(c)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

const desfazer = (t: string) =>
  t
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");

const textos = (xml: string) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => desfazer(m[1])).join("");

const coluna = (ref: string) => [...ref.replace(/\d+/g, "")].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;

/** Só o que a importação precisa do .xlsx: primeira aba, texto e número. */
export async function lerXlsx(dados: ArrayBuffer): Promise<Linha[]> {
  const { default: PizZip } = await import("pizzip");
  const z = new PizZip(dados);
  const comp = [...(z.file("xl/sharedStrings.xml")?.asText() ?? "").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textos(m[1]));
  const abas = Object.keys(z.files).filter((f) => /^xl\/worksheets\/sheet\d+\.xml$/.test(f)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const xml = abas.length ? (z.file(abas[0])?.asText() ?? "") : "";
  const linhas: string[][] = [];
  for (const l of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const cels: string[] = [];
    for (const c of l[1].matchAll(/<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = /r="([A-Z]+\d+)"/.exec(c[1])?.[1];
      const tipo = /t="(\w+)"/.exec(c[1])?.[1];
      const v = /<v>([\s\S]*?)<\/v>/.exec(c[2] ?? "")?.[1] ?? "";
      const i = ref ? coluna(ref) : cels.length;
      cels[i] = tipo === "s" ? (comp[Number(v)] ?? "") : tipo === "inlineStr" ? textos(c[2] ?? "") : desfazer(v);
    }
    linhas.push(Array.from(cels, (x) => (x ?? "").trim()));
  }
  // relatórios costumam ter título antes do cabeçalho: começa na 1ª linha com 2 ou mais colunas
  const ini = linhas.findIndex((l) => l.filter(Boolean).length >= 2);
  if (ini < 0) return [];
  const cab = linhas[ini].map(chave);
  return linhas
    .slice(ini + 1)
    .filter((l) => l.some(Boolean))
    .map((l) => Object.fromEntries(cab.map((c, i) => [c || `coluna_${i}`, l[i] ?? ""])));
}

/** Lê .xlsx, .csv ou .json e devolve objetos. JSON volta como veio, sem achatar. */
export async function lerArquivo(f: File): Promise<unknown[]> {
  if (/\.xlsx$/i.test(f.name)) return lerXlsx(await f.arrayBuffer());
  const buf = await f.arrayBuffer();
  let t = new TextDecoder("utf-8").decode(buf);
  if (t.includes("�")) t = new TextDecoder("windows-1252").decode(buf);
  if (/\.jsonl?$/i.test(f.name) || /^\s*[[{]/.test(t)) {
    try {
      const j = JSON.parse(t);
      return Array.isArray(j) ? j : [j];
    } catch {
      return t
        .split(/\r?\n/)
        .filter((l) => l.trim())
        .map((l) => JSON.parse(l));
    }
  }
  return lerCsv(t);
}

/** Valor da primeira coluna cujo nome casa */
export function achar(o: Linha, re: RegExp) {
  const k = Object.keys(o).find((x) => re.test(x) && String(o[x] ?? "").trim() !== "");
  return k ? String(o[k]).trim() : "";
}
