/** Datas em ISO curto (aaaa-mm-dd), sempre no fuso local de quem usa. */
export type Dia = string;

const p2 = (n: number) => String(n).padStart(2, "0");
export const isoDe = (d: Date): Dia => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export const hoje = (): Dia => isoDe(new Date());
export const agora = () => new Date().toISOString();
export const paraData = (d: Dia) => {
  const [a, m, dd] = d.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, dd);
};
export const maisDias = (d: Dia, n: number) => {
  const x = paraData(d);
  x.setDate(x.getDate() + n);
  return isoDe(x);
};
/** Soma meses sem estourar o fim do mês (31/01 + 1 = 28/02) */
export const maisMeses = (d: Dia, n: number) => {
  const x = paraData(d);
  const dia = x.getDate();
  x.setDate(1);
  x.setMonth(x.getMonth() + n);
  const ult = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
  x.setDate(Math.min(dia, ult));
  return isoDe(x);
};
export const diasEntre = (a: Dia, b: Dia) => Math.round((paraData(b).getTime() - paraData(a).getTime()) / 864e5);
export const competencia = (d: Dia) => d.slice(0, 7);
export const diaNoMes = (comp: string, dia: number): Dia => {
  const [a, m] = comp.split("-").map(Number);
  const ult = new Date(a, m, 0).getDate();
  return `${comp}-${p2(Math.min(dia, ult))}`;
};
export const maisComp = (comp: string, n: number) => competencia(maisMeses(`${comp}-01`, n));

export const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro",
  "dezembro",
];
export const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export const br = (d?: Dia | null) => (d ? d.slice(0, 10).split("-").reverse().join("/") : "—");
export const brCurto = (d?: Dia | null) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : "—");
export const brComp = (c: string) => `${MESES[Number(c.slice(5, 7)) - 1].slice(0, 3)}/${c.slice(2, 4)}`;
export const brCompLongo = (c: string) => `${MESES[Number(c.slice(5, 7)) - 1]} de ${c.slice(0, 4)}`;
export const brHora = (iso: string) => {
  const d = new Date(iso);
  return `${p2(d.getDate())}/${p2(d.getMonth() + 1)} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
};
export const diaSemana = (d: Dia) => DIAS[paraData(d).getDay()];
export const porExtenso = (d: Dia) => {
  const x = paraData(d);
  return `${x.getDate()} de ${MESES[x.getMonth()]} de ${x.getFullYear()}`;
};
/** Segunda-feira da semana de `d` */
export const segundaDe = (d: Dia) => maisDias(d, -((paraData(d).getDay() + 6) % 7));

export function prazo(d: Dia, ref = hoje()) {
  const n = diasEntre(ref, d);
  if (n === 0) return "hoje";
  if (n === 1) return "amanhã";
  if (n === -1) return "ontem";
  return n > 0 ? `em ${n} dias` : `há ${-n} dias`;
}

/** Lê 24/11/2026 ou 2026-11-24 */
export function lerData(t: string): Dia | null {
  const m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(t);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const i = /(\d{4})-(\d{2})-(\d{2})/.exec(t);
  return i ? i[0] : null;
}
