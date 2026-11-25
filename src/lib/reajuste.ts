import { arred } from "./formato";
import { lerData, maisComp } from "./datas";

/** Séries mensais do Banco Central (SGS), gratuitas e sem cadastro */
const SERIES = { "IGP-M": 189, IPCA: 433, INPC: 188 } as const;
export type Indice = keyof typeof SERIES;
export interface PontoIndice {
  comp: string;
  valor: number;
}

/** Pede por período: o atalho "ultimos/N" do BCB recusa mais de 20 pontos */
export async function buscarIndice(i: Indice, compReajuste: string): Promise<PontoIndice[]> {
  const ini = `01/${maisComp(compReajuste, -15).split("-").reverse().join("/")}`;
  const fim = `01/${maisComp(compReajuste, 1).split("-").reverse().join("/")}`;
  const r = await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${SERIES[i]}/dados?formato=json&dataInicial=${ini}&dataFinal=${fim}`);
  if (!r.ok) throw new Error(`Banco Central respondeu ${r.status}`);
  const j = (await r.json()) as { data: string; valor: string }[];
  return j.map((x) => ({ comp: (lerData(x.data) ?? "").slice(0, 7), valor: Number(x.valor) })).filter((x) => x.comp);
}

/**
 * Acumulado dos 12 meses que fecham no mês anterior ao reajuste.
 * Se o índice desse mês ainda não saiu, usa os 12 últimos publicados e avisa.
 */
export function acumulado12(serie: PontoIndice[], compReajuste: string) {
  const ord = [...serie].sort((a, b) => a.comp.localeCompare(b.comp));
  const fim = maisComp(compReajuste, -1);
  const ate = ord.filter((p) => p.comp <= fim).slice(-12);
  if (ate.length < 12) return null;
  const ultimo = ate[ate.length - 1].comp;
  const fator = ate.reduce((f, p) => f * (1 + p.valor / 100), 1);
  return { pct: arred((fator - 1) * 100), fator, de: ate[0].comp, ate: ultimo, completo: ultimo === fim };
}

/** Índice negativo não reduz o aluguel: prática comum em contrato. A decisão final é de quem aprova. */
export function novoAluguel(atual: number, pctAcum: number) {
  const aplicado = Math.max(0, pctAcum);
  return { aplicado, valor: arred(atual * (1 + aplicado / 100)) };
}
