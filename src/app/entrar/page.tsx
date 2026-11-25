import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { Logo } from "@/componentes/logo";
import { COOKIE, criarTrava, DURACAO_DIAS, emitirPasse, senhaConfere } from "@/lib/acesso";

export const metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";
const trava = criarTrava();

async function entrar(f: FormData) {
  "use server";
  const senha = process.env.PAINEL_SENHA;
  if (!senha) redirect("/");
  const ip = (await headers()).get("x-real-ip") ?? "local";
  if (trava.travado(ip)) redirect("/entrar?erro=espera");
  if (!(await senhaConfere(senha, String(f.get("senha") ?? "").slice(0, 200)))) {
    trava.errou(ip);
    // atrasa tentativa em série
    await new Promise((r) => setTimeout(r, 900));
    redirect("/entrar?erro=1");
  }
  trava.acertou(ip);
  (await cookies()).set(COOKIE, await emitirPasse(senha), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * DURACAO_DIAS,
  });
  redirect("/");
}

export default async function Entrar({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <main className="escuro grid min-h-dvh place-items-center bg-carvao px-6 text-papel">
      <form action={entrar} className="w-full max-w-xs">
        <Logo className="mb-10 h-11" />
        <label className="block text-[13px]">
          Senha do painel
          <input name="senha" type="password" required autoComplete="current-password" className="campo mt-2 text-carvao" aria-invalid={erro ? true : undefined} />
        </label>
        {erro && <p className="mt-2 text-[13px] text-[#f0b5ae]">{erro === "espera" ? "Muitas tentativas. Espere 15 minutos." : "Senha incorreta."}</p>}
        <button type="submit" className="mt-4 min-h-11 w-full bg-papel font-medium text-carvao hover:bg-linho">
          Entrar
        </button>
      </form>
    </main>
  );
}
