import { type NextRequest, NextResponse } from "next/server";
import { carimbo, COOKIE, igual } from "@/lib/acesso";

export async function proxy(req: NextRequest) {
  const senha = process.env.PAINEL_SENHA;
  if (!senha) return NextResponse.next();
  const c = req.cookies.get(COOKIE)?.value ?? "";
  if (igual(c, await carimbo(senha))) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/entrar";
  url.search = "";
  return NextResponse.redirect(url);
}

// tudo passa pela senha, menos a própria tela de entrada, a marca e os arquivos do Next
export const config = { matcher: ["/((?!entrar|_next/static|_next/image|icon.svg|marca/).*)"] };
