import { gastoDoMes, iniciar, itens, rodadas, rodando } from "@/lib/apify";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Sem senha no painel, qualquer visitante gastaria o crédito: fica desligado. A senha em si é conferida no proxy. */
const falta = () => [!process.env.APIFY_TOKEN && "APIFY_TOKEN", !process.env.PAINEL_SENHA && "PAINEL_SENHA"].filter(Boolean);
const erro = (e: unknown) => Response.json({ erro: e instanceof Error ? e.message : "Falha na Apify" }, { status: 502 });

export async function GET(req: Request) {
  const f = falta();
  if (f.length) return Response.json({ ligada: false, falta: f });
  try {
    const q = new URL(req.url).searchParams;
    const rs = await rodadas();
    const pedida = q.get("rodada");
    if (pedida) {
      const r = rs.find((x) => x.id === pedida);
      if (!r) return Response.json({ erro: "Varredura não encontrada" }, { status: 404 });
      return Response.json({ itens: await itens(r, Math.max(0, Number(q.get("offset")) || 0)) });
    }
    // últimos 35 dias, da mais antiga para a mais nova: o painel traz as que ainda não leu
    const prontas = rs.filter((r) => r.status === "SUCCEEDED" && Date.now() - Date.parse(r.inicio) < 35 * 864e5).reverse();
    const falhou = [...new Set(rs.map((r) => r.ator))].some((c) => { const r = rs.find((x) => x.ator === c)!; return !rodando(r) && r.status !== "SUCCEEDED"; });
    return Response.json({ ligada: true, rodando: rs.some(rodando), prontas: prontas.map((r) => ({ id: r.id, inicio: r.inicio })), falhou, gasto: await gastoDoMes() });
  } catch (e) {
    return erro(e);
  }
}

export async function POST() {
  if (falta().length) return Response.json({ erro: "Varredura desligada" }, { status: 503 });
  try {
    return Response.json(await iniciar(12));
  } catch (e) {
    return erro(e);
  }
}
