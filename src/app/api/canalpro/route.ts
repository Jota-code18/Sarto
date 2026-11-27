import { cookies } from "next/headers";
import { COOKIE, passeVale, senhaConfere } from "@/lib/acesso";
import { guardarRegistro, lerRegistro } from "@/lib/apify";
import { validarLeitura } from "@/lib/portais";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const LIMITE = 3 * 1024 * 1024;
const recusa = (status: number, erro: string) => Response.json({ erro }, { status });

/**
 * O robô do computador da Sarto manda aqui o que leu no Canal Pro, com a chave CANALPRO_ROBO_TOKEN.
 * A tela lê com o passe do painel. Fica fora do proxy porque o robô não tem passe; cada método confere o seu.
 */
export async function POST(req: Request) {
  const chave = process.env.CANALPRO_ROBO_TOKEN;
  if (!chave || chave.length < 24 || !process.env.APIFY_TOKEN) return recusa(503, "Robô do Canal Pro desligado");
  const dada = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  if (!(await senhaConfere(chave, dada))) return recusa(401, "Chave do robô inválida");
  const texto = await req.text();
  if (texto.length > LIMITE) return recusa(413, "Leitura grande demais");
  let corpo: unknown;
  try {
    corpo = JSON.parse(texto);
  } catch {
    return recusa(400, "Leitura inválida");
  }
  const leitura = validarLeitura(corpo);
  if (!leitura?.anuncios.length) return recusa(400, "Nenhum anúncio na leitura");
  try {
    await guardarRegistro("canalpro", leitura);
  } catch {
    return recusa(502, "Não consegui guardar a leitura");
  }
  return Response.json({ ok: true, anuncios: leitura.anuncios.length });
}

export async function GET() {
  const senha = process.env.PAINEL_SENHA;
  if (senha && !(await passeVale(senha, (await cookies()).get(COOKIE)?.value ?? ""))) return recusa(401, "Entre de novo no painel");
  if (!process.env.APIFY_TOKEN) return Response.json({ leitura: null });
  try {
    return Response.json({ leitura: validarLeituraGuardada(await lerRegistro("canalpro")) });
  } catch {
    return recusa(502, "Não consegui ler a última leitura");
  }
}

/** O que está guardado já foi validado; confere só a forma, sem reprocessar */
function validarLeituraGuardada(x: unknown) {
  const o = x as { coletadoEm?: unknown; anuncios?: unknown };
  return o && typeof o.coletadoEm === "string" && Array.isArray(o.anuncios) ? o : null;
}
