import { iniciar } from "@/lib/apify";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Chamada pela Vercel toda segunda. Fica fora da senha, mas só inicia se a última tem 6 dias ou mais. */
export async function GET() {
  if (!process.env.APIFY_TOKEN || !process.env.PAINEL_SENHA) return new Response(null, { status: 204 });
  try {
    await iniciar(24 * 6);
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 502 });
  }
}
