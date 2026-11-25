export const brl = (v: number | null | undefined, centavos = true) =>
  v == null
    ? "—"
    : v.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: centavos ? 2 : 0,
        maximumFractionDigits: centavos ? 2 : 0,
      });

export function brlCurto(v: number) {
  if (Math.abs(v) >= 1e6) return `R$ ${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (Math.abs(v) >= 1e4) return `R$ ${Math.round(v / 1e3).toLocaleString("pt-BR")} mil`;
  return brl(v, false);
}

export const num = (v: number, casas = 0) => v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

const pct = (v: number, casas = 2) => `${num(v, casas)}%`;

/** Lê "1.234,56", "1234,56", "1234.56" ou "R$ 1.234" */
export function lerValor(t: string): number {
  const s = t.replace(/[^\d,.-]/g, "");
  if (!s) return 0;
  const limpo = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : /\.\d{3}(\.|$)/.test(s) ? s.replace(/\./g, "") : s;
  return Number(limpo) || 0;
}

export const arred = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

export const soDigitos = (t: string) => (t ?? "").replace(/\D/g, "");

export function mascaraDoc(t: string) {
  const d = soDigitos(t);
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return t ?? "";
}

export function mascaraTel(t: string) {
  const d = soDigitos(t).replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return t ?? "";
}

export function cpfValido(t: string) {
  const d = soDigitos(t);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const dv = (n: number) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

export function cnpjValido(t: string) {
  const d = soDigitos(t);
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const dv = (n: number) => {
    const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const r = pesos.reduce((a, p, i) => a + p * Number(d[i]), 0) % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(12) === Number(d[12]) && dv(13) === Number(d[13]);
}

export const docValido = (t: string) => (soDigitos(t).length > 11 ? cnpjValido(t) : cpfValido(t));

export function linkWhats(tel: string, texto: string) {
  const d = soDigitos(tel);
  const n = d.length >= 12 ? d : d ? `55${d}` : "";
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
}

const UN = [
  "",
  "um",
  "dois",
  "três",
  "quatro",
  "cinco",
  "seis",
  "sete",
  "oito",
  "nove",
  "dez",
  "onze",
  "doze",
  "treze",
  "quatorze",
  "quinze",
  "dezesseis",
  "dezessete",
  "dezoito",
  "dezenove",
];
const DEZ = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CEM = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function ate999(n: number): string {
  if (n === 100) return "cem";
  const p: string[] = [];
  if (n >= 100) p.push(CEM[Math.floor(n / 100)]);
  const r = n % 100;
  if (r > 0 && r < 20) p.push(UN[r]);
  else if (r >= 20) {
    p.push(DEZ[Math.floor(r / 10)]);
    if (r % 10) p.push(UN[r % 10]);
  }
  return p.join(" e ");
}

function inteiroExtenso(n: number): string {
  if (n === 0) return "zero";
  const bases: [number, string, string][] = [
    [1e9, "bilhão", "bilhões"],
    [1e6, "milhão", "milhões"],
    [1e3, "mil", "mil"],
    [1, "", ""],
  ];
  const partes: { texto: string; valor: number }[] = [];
  let resto = n;
  for (const [base, um, varios] of bases) {
    const g = Math.floor(resto / base);
    resto %= base;
    if (!g) continue;
    const texto = base === 1 ? ate999(g) : base === 1e3 ? (g === 1 ? "mil" : `${ate999(g)} mil`) : `${ate999(g)} ${g === 1 ? um : varios}`;
    partes.push({ texto, valor: g });
  }
  return partes.reduce((acc, p, i) => {
    if (i === 0) return p.texto;
    const ultima = i === partes.length - 1;
    const comE = ultima && (p.valor < 100 || p.valor % 100 === 0);
    return `${acc}${comE ? " e " : ", "}${p.texto}`;
  }, "");
}

export function valorExtenso(v: number): string {
  const c = Math.round(v * 100);
  const reais = Math.floor(c / 100);
  const cent = c % 100;
  const p: string[] = [];
  if (reais) p.push(`${inteiroExtenso(reais)}${reais >= 1e6 && reais % 1e6 === 0 ? " de" : ""} ${reais === 1 ? "real" : "reais"}`);
  if (cent) p.push(`${inteiroExtenso(cent)} ${cent === 1 ? "centavo" : "centavos"}`);
  return p.length ? p.join(" e ") : "zero real";
}

export const semAcento = (t: string) => (t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export const novoId = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

export function baixarArquivo(nome: string, conteudo: BlobPart, tipo = "text/plain;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** CSV com ; e BOM, que abre certo no Excel em português */
export function csv(linhas: (string | number | null | undefined)[][]) {
  const cel = (v: string | number | null | undefined) => {
    let t = v == null ? "" : typeof v === "number" ? String(v).replace(".", ",") : v;
    // impede que a planilha trate o texto como fórmula
    if (typeof v === "string" && /^[=+@\t]|^-[^\d]/.test(t)) t = `'${t}`;
    return /[";\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return `﻿${linhas.map((l) => l.map(cel).join(";")).join("\r\n")}`;
}
