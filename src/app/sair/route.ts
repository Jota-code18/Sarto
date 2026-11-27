import { COOKIE } from "@/lib/acesso";
import { mesmaOrigem } from "@/lib/protecao";

/** Apaga o passe deste aparelho. Para derrubar todos os aparelhos, troque a PAINEL_SENHA. */
export async function POST(req: Request) {
  if (!mesmaOrigem(req)) return new Response(null, { status: 403 });
  const r = new Response(null, { status: 303, headers: { Location: "/entrar" } });
  r.headers.append("Set-Cookie", `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
  return r;
}
