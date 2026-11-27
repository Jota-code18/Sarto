import { type NextRequest, NextResponse } from "next/server";
import { COOKIE, passeVale } from "@/lib/acesso";
import { politica } from "@/lib/protecao";

/** Abrem sem senha: a entrada, a chamada da Vercel e o robô do Canal Pro (conferem o próprio segredo) e o envio de erros */
const LIVRES = /^\/(entrar|api\/agendada|api\/canalpro|monitor)(\/|$)/;

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const senha = process.env.PAINEL_SENHA;
  if (senha && !LIVRES.test(pathname) && !(await passeVale(senha, req.cookies.get(COOKIE)?.value ?? ""))) {
    if (pathname.startsWith("/api/")) return Response.json({ erro: "Entre de novo no painel" }, { status: 401 });
    const url = req.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = "";
    return NextResponse.redirect(url);
  }
  const nonce = btoa(crypto.randomUUID());
  const csp = politica(nonce, process.env.NODE_ENV === "development");
  const headers = new Headers(req.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const r = NextResponse.next({ request: { headers } });
  r.headers.set("Content-Security-Policy", csp);
  return r;
}

// tudo passa por aqui, menos a marca e os arquivos do Next
export const config = { matcher: ["/((?!_next/static|_next/image|icon.svg|marca/).*)"] };
