import { lerData } from "./datas";
import { lerValor, semAcento } from "./formato";

export interface LinhaExtrato {
  data: string;
  descricao: string;
  valor: number;
  fitid?: string;
}

/** OFX é SGML: as tags de folha nem sempre são fechadas */
export function lerOfx(t: string): LinhaExtrato[] {
  const tag = (b: string, n: string) => new RegExp(`<${n}>([^<\\r\\n]*)`, "i").exec(b)?.[1].trim() ?? "";
  return t
    .split(/<STMTTRN>/i)
    .slice(1)
    .map((b) => {
      const d = tag(b, "DTPOSTED");
      return {
        data: d ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : "",
        descricao: tag(b, "MEMO") || tag(b, "NAME"),
        valor: Number(tag(b, "TRNAMT").replace(",", ".")) || 0,
        fitid: tag(b, "FITID") || undefined,
      };
    })
    .filter((x) => x.data && x.valor);
}

function partirCsv(linha: string, sep: string) {
  const out: string[] = [];
  let cur = "";
  let asp = false;
  for (const c of linha) {
    if (c === '"') asp = !asp;
    else if (c === sep && !asp) {
      out.push(cur.trim());
      cur = "";
    } else cur += c;
  }
  out.push(cur.trim());
  return out;
}

/** Planilha genérica: devolve objetos com o cabeçalho sem acento */
export function lerCsv(t: string): Record<string, string>[] {
  const linhas = t.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (linhas.length < 2) return [];
  const sep = [";", "\t", ","].sort((a, b) => linhas[0].split(b).length - linhas[0].split(a).length)[0];
  const cab = partirCsv(linhas[0], sep).map((c) => semAcento(c).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""));
  return linhas.slice(1).map((l) => {
    const p = partirCsv(l, sep);
    return Object.fromEntries(cab.map((c, i) => [c, p[i] ?? ""]));
  });
}

export function lerExtratoCsv(t: string): LinhaExtrato[] {
  return lerCsv(t)
    .map((o) => {
      const k = Object.keys(o);
      const col = (re: RegExp) => o[k.find((x) => re.test(x)) ?? ""] ?? "";
      const cred = lerValor(col(/credito|entrada/));
      const deb = lerValor(col(/debito|saida/));
      const bruto = col(/^valor/);
      return {
        data: lerData(col(/data|date/)) ?? "",
        descricao: col(/descri|historico|lancamento|memo|title/),
        valor: bruto ? lerValor(bruto) : cred ? Math.abs(cred) : -Math.abs(deb),
      };
    })
    .filter((x) => x.data && x.valor);
}

const REGRAS: [RegExp, string][] = [
  [/aluguel|locacao/, "Locação"],
  [/comiss/, "Comissões"],
  [/energia|equatorial|saneago|agua/, "Água e energia"],
  [/internet|telefon|vivo|claro|tim\b/, "Telefone e internet"],
  [/jetimob|canal pro|zap|olx|62 ?imoveis|clicksign|jotform|clickup|software|google|anthropic/, "Ferramentas"],
  [/meta|facebook|instagram|anuncio|marketing/, "Marketing"],
  [/tarifa|iof|juros|manutencao de conta/, "Tarifas bancárias"],
  [/darf|das\b|iss|imposto|simples/, "Impostos"],
  [/salario|folha|pro.?labore/, "Pessoal"],
  [/repasse/, "Repasse a proprietário"],
];
export const CATEGORIAS = [...new Set(REGRAS.map(([, c]) => c)), "Escritório", "Outros"];
export const categorizar = (d: string) => REGRAS.find(([re]) => re.test(semAcento(d)))?.[1] ?? "Outros";
