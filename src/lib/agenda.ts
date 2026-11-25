import { type Dia, diasEntre, maisDias, paraData } from "./datas";
import type { Evento, Regras } from "./tipos";

export const AGENDAS: { id: string; nome: string }[] = [
  { id: "reunioes", nome: "Reuniões" },
  { id: "videomaker", nome: "Videomaker" },
  { id: "visitas", nome: "Visitas" },
  { id: "marketing", nome: "Marketing" },
  { id: "vistorias", nome: "Vistorias" },
  { id: "pessoal", nome: "Por pessoa" },
];

export const min = (h: string) => {
  const [a, b] = h.split(":").map(Number);
  return a * 60 + (b || 0);
};
export const hora = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** Eventos de um dia, incluindo os semanais */
export function doDia(eventos: Evento[], d: Dia) {
  const ds = paraData(d).getDay();
  return eventos
    .filter((e) => (e.semanal ? e.data <= d && paraData(e.data).getDay() === ds : e.data === d))
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
}

/** Por que esse horário do videomaker não cabe. Lista vazia = cabe. */
export function conflitosVideo(novo: Pick<Evento, "id" | "data" | "inicio" | "fim">, eventos: Evento[], r: Regras): string[] {
  const p: string[] = [];
  const dia = doDia(eventos, novo.data).filter((e) => e.agenda === "videomaker" && e.id !== novo.id);
  if (min(novo.fim) <= min(novo.inicio)) p.push("O fim precisa ser depois do início");
  if (min(novo.inicio) < min(r.videoInicio) || min(novo.fim) > min(r.videoFim))
    p.push(`Fora do horário do videomaker (${r.videoInicio} às ${r.videoFim})`);
  if (dia.length >= r.videoPorDia) p.push(`Limite de ${r.videoPorDia} gravações por dia já atingido`);
  for (const e of dia) {
    const folga = r.videoDeslocamentoMin;
    if (min(novo.inicio) < min(e.fim) + folga && min(e.inicio) < min(novo.fim) + folga)
      p.push(`Bate com "${e.titulo}" (${e.inicio} às ${e.fim}) contando ${folga} min de deslocamento`);
  }
  const ds = paraData(novo.data).getDay();
  if (ds === 0) p.push("Domingo");
  return p;
}

/** Entrega em dias úteis (pula sábado e domingo) */
export function prazoEntrega(d: Dia, uteis: number): Dia {
  let x = d;
  for (let n = 0; n < uteis; ) {
    x = maisDias(x, 1);
    const ds = paraData(x).getDay();
    if (ds !== 0 && ds !== 6) n++;
  }
  return x;
}

export function horariosLivres(d: Dia, duracao: number, eventos: Evento[], r: Regras): string[] {
  const out: string[] = [];
  for (let m = min(r.videoInicio); m + duracao <= min(r.videoFim); m += 30)
    if (!conflitosVideo({ id: "", data: d, inicio: hora(m), fim: hora(m + duracao) }, eventos, r).length) out.push(hora(m));
  return out;
}

const icsData = (d: Dia, h: string) => `${d.replace(/-/g, "")}T${h.replace(":", "")}00`;
const icsTexto = (t: string) => t.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");
const DIAS_ICS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

/** Arquivo .ics: importa no Google Agenda, Outlook ou iPhone, sem API */
export function ics(eventos: Evento[], carimbo = new Date()) {
  const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Sarto//Painel//PT-BR", "CALSCALE:GREGORIAN", "X-WR-TIMEZONE:America/Sao_Paulo"];
  const st = `${carimbo.toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`;
  for (const e of eventos) {
    L.push("BEGIN:VEVENT", `UID:${e.id}@painel-sarto`, `DTSTAMP:${st}`);
    L.push(`DTSTART;TZID=America/Sao_Paulo:${icsData(e.data, e.inicio)}`, `DTEND;TZID=America/Sao_Paulo:${icsData(e.data, e.fim)}`);
    if (e.semanal) L.push(`RRULE:FREQ=WEEKLY;BYDAY=${DIAS_ICS[paraData(e.data).getDay()]}`);
    L.push(`SUMMARY:${icsTexto(e.titulo)}`);
    if (e.local) L.push(`LOCATION:${icsTexto(e.local)}`);
    const desc = [e.quem && `Quem: ${e.quem}`, e.obs].filter(Boolean).join("\n");
    if (desc) L.push(`DESCRIPTION:${icsTexto(desc)}`);
    L.push("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Lembrete", "TRIGGER:-PT60M", "END:VALARM", "END:VEVENT");
  }
  L.push("END:VCALENDAR");
  return L.join("\r\n");
}

export function linkGoogle(e: Evento) {
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: e.titulo,
    dates: `${icsData(e.data, e.inicio)}/${icsData(e.data, e.fim)}`,
    ctz: "America/Sao_Paulo",
    location: e.local,
    details: [e.quem && `Quem: ${e.quem}`, e.obs].filter(Boolean).join("\n"),
  });
  if (e.semanal) p.set("recur", "RRULE:FREQ=WEEKLY");
  return `https://calendar.google.com/calendar/render?${p}`;
}

/** Aniversário mm-dd: dias que faltam a partir de `ref` */
export function faltaAniversario(mmdd: string, ref: Dia) {
  const ano = Number(ref.slice(0, 4));
  let d = `${ano}-${mmdd}`;
  if (d < ref) d = `${ano + 1}-${mmdd}`;
  return diasEntre(ref, d);
}
