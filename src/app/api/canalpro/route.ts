import { cookies } from "next/headers";
import { COOKIE, passeVale, senhaConfere } from "@/lib/acesso";
import { guardarRegistro, lerRegistro } from "@/lib/apify";
import { lerXlsx } from "@/lib/planilha";
import { validarLeitura } from "@/lib/portais";
import { faltandoNaLinha } from "@/lib/qualidade";

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
  // relatório "Qualidade dos Anúncios" em .xlsx, em base64: nota, classificação e o que falta.
  // Não é guardado como arquivo: só o código, a nota, a classificação e os SIM/NÃO seguem.
  const rel = (corpo as { relatorio?: unknown }).relatorio;
  const bytes = typeof rel === "string" && rel.length < LIMITE ? Buffer.from(rel, "base64") : null;
  // .xlsx é um zip: o conteúdo precisa começar como zip, seja qual for o nome
  if (bytes && bytes[0] === 0x50 && bytes[1] === 0x4b) {
    try {
      const linhas = await lerXlsx(bytes);
      leitura.qualidade = linhas
        .slice(0, 5000)
        .map((l) => ({
          cod: String(l.codigo_do_anuncio ?? "")
            .trim()
            .toUpperCase(),
          nota: Number(String(l.nota_de_qualidade ?? "").replace(",", ".")) || null,
          classe: String(l.classificacao ?? "").slice(0, 40),
          faltando: faltandoNaLinha(l),
        }))
        .filter((q) => q.cod);
    } catch {
      // sem relatório, fica a nota dos cartões
    }
  }
  try {
    await guardarRegistro("canalpro", leitura);
  } catch {
    return recusa(502, "Não consegui guardar a leitura");
  }
  return Response.json({ ok: true, anuncios: leitura.anuncios.length, qualidade: leitura.qualidade?.length ?? 0 });
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
