import type { Dia } from "./datas";
import { achar, type Linha } from "./planilha";
import type { NotaPortal } from "./tipos";

/**
 * A nota e o alerta vêm sempre de fora (Canal Pro e Jetimob). O painel não
 * calcula, não pondera e não classifica: só guarda, ordena e mostra.
 */

const COD = /^cod|codigo|referencia|id_externo|external|^ref$/;
const NOTA = /nota|qualidade|lqs|score|pontuacao/;
const MOTIVO = /alerta|motivo|pendencia|sugest|melhor|incomplet|atencao|critica|observ/;
const PORTAL = /portal|canal|veiculo|fonte/;

export const idNota = (cod: string, portal: string) => `${portal}|${cod}`.toLowerCase();

function numero(t: string): number | null {
  const m = /-?\d+(?:[.,]\d+)?/.exec(t.replace(/\s/g, ""));
  return m ? Number(m[0].replace(",", ".")) : null;
}

export function lerNotas(linhas: Linha[], portalPadrao: string, em: Dia): NotaPortal[] {
  const m = new Map<string, NotaPortal>();
  for (const l of linhas) {
    const cod = achar(l, COD);
    const nota = numero(achar(l, NOTA));
    const motivo = achar(l, MOTIVO);
    if (!cod || (nota == null && !motivo)) continue;
    const portal = achar(l, PORTAL) || portalPadrao;
    const id = idNota(cod, portal);
    m.set(id, { id, cod, portal, nota, motivo, em });
  }
  return [...m.values()];
}

/** Junta com o que já existe, guardando a nota anterior para mostrar a variação */
export function juntarNotas(antigas: NotaPortal[], novas: NotaPortal[]): NotaPortal[] {
  const m = new Map(antigas.map((n) => [n.id, n]));
  for (const n of novas) {
    const a = m.get(n.id);
    const mudou = a && a.nota != null && n.nota != null && a.nota !== n.nota;
    m.set(n.id, {
      ...n,
      nota: n.nota ?? a?.nota ?? null,
      anterior: mudou ? (a.nota ?? undefined) : a?.anterior,
    });
  }
  return [...m.values()];
}

export interface ResumoNota {
  nota: number | null;
  anterior?: number;
  atencao: NotaPortal[];
  todas: NotaPortal[];
}

/** Por imóvel: a menor nota entre os portais, porque é a que precisa de trabalho */
export function porImovel(notas: NotaPortal[]): Map<string, ResumoNota> {
  const m = new Map<string, ResumoNota>();
  for (const n of notas) {
    const k = n.cod.toUpperCase();
    const r = m.get(k) ?? { nota: null, atencao: [], todas: [] };
    r.todas.push(n);
    if (n.nota != null && (r.nota == null || n.nota < r.nota)) {
      r.nota = n.nota;
      r.anterior = n.anterior;
    }
    if (n.motivo) r.atencao.push(n);
    m.set(k, r);
  }
  return m;
}

export const mostrarNota = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
