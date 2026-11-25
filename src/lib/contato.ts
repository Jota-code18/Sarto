import { soDigitos } from "./formato";

/** Telefone brasileiro com DDD, ou vazio se não for um número possível */
export function telefone(t: unknown): string {
  let d = soDigitos(String(t ?? ""));
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  if (d.length > 11 && d.startsWith("0")) d = d.slice(1);
  if (/^[1-9][1-9]9\d{8}$/.test(d) || /^[1-9][1-9][2-5]\d{7}$/.test(d)) return d;
  return "";
}

export const ehCelular = (t: string) => /^\d\d9\d{8}$/.test(t);

const SEP = String.raw`[\s.\-]{0,3}`;
const COM_DDD = new RegExp(String.raw`(?<![\d,])(?:\+?55${SEP})?\(?0?([1-9][1-9])\)?${SEP}((?:9${SEP})?\d(?:${SEP}\d){7})(?!\d|,\d)`, "g");
const SEM_DDD = /(?<![\d.,])9\d{4}[\s.-]?\d{4}(?![\d,])/g;

/** Número que o próprio anunciante escreveu no texto do anúncio. Celular vem primeiro. */
export function telefoneNoTexto(texto: unknown, ddd = "62"): string {
  const t = String(texto ?? "")
    .replace(/R\$\s*[\d.,]+/g, " ")
    .replace(/creci\S*\s*[\d./-]+/gi, " ");
  // dez dígitos colados costumam ser código: só valem com DDD de Goiás ou do DF
  const achados = [...t.matchAll(COM_DDD)].map((m) => (/^\d{10}$/.test(m[0]) && !/^6[1-4]/.test(m[0]) ? "" : telefone(m[1] + m[2])));
  if (!achados.some(Boolean)) achados.push(...[...t.matchAll(SEM_DDD)].map((m) => telefone(ddd + m[0])));
  return achados.find(ehCelular) ?? achados.find(Boolean) ?? "";
}

/** O ZAP manda o endereço da foto como molde */
export function fotoDoMolde(u: unknown): string {
  const t = String(u ?? "")
    .replace(/\{description\}/g, "foto")
    .replace(/\{action\}/g, "crop")
    .replace(/\{width\}/g, "360")
    .replace(/\{height\}/g, "270");
  return t.startsWith("https://") && !t.includes("{") ? t : "";
}
