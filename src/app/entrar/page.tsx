import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Logo } from "@/componentes/logo";
import { carimbo, COOKIE, igual } from "@/lib/acesso";

export const metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";

async function entrar(f: FormData) {
  "use server";
  const senha = process.env.PAINEL_SENHA;
  if (!senha) redirect("/");
  const certo = await carimbo(senha);
  const dada = await carimbo(String(f.get("senha") ?? "") || " ");
  if (!igual(dada, certo)) {
    // atrasa tentativa em série
    await new Promise((r) => setTimeout(r, 900));
    redirect("/entrar?erro=1");
  }
  (await cookies()).set(COOKIE, certo, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
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
          <input name="senha" type="password" required autoFocus autoComplete="current-password" className="campo mt-2 text-carvao" aria-invalid={erro ? true : undefined} />
        </label>
        {erro && <p className="mt-2 text-[13px] text-[#f0b5ae]">Senha incorreta.</p>}
        <button type="submit" className="mt-4 min-h-11 w-full bg-papel font-medium text-carvao hover:bg-linho">
          Entrar
        </button>
      </form>
    </main>
  );
}
