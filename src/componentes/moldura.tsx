"use client";
import { CalendarDays, Check, CircleCheck, House, KeyRound, type LucideIcon, Menu, Radar, Scale, TriangleAlert, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { pendenciasDe } from "@/lib/hoje";
import { PERFIS } from "@/lib/regras";
import { acao, nomeAtual, useSarto } from "@/lib/store";
import { MENU, podeVer } from "@/lib/telas";
import type { Perfil } from "@/lib/tipos";
import { Logo } from "./logo";
import { Botao, cx } from "./ui";

function Navegacao({ onIr }: { onIr?: () => void }) {
  const path = usePathname();
  const perfil = useSarto((s) => s.perfil);
  const dados = useSarto((s) => s.dados);
  const regras = useSarto((s) => s.regras);
  const n = pendenciasDe(perfil, dados, regras).reduce((a, p) => a + (p.aprovar ? (p.qtd ?? 1) : 0), 0);
  return (
    <nav aria-label="Seções" className="rolagem-escura flex-1 overflow-y-auto px-5 pb-6">
      {MENU.map((g) => {
        const itens = g.itens.filter((i) => !i.perfis || i.perfis.includes(perfil));
        if (!itens.length) return null;
        return (
          <div key={g.grupo || "topo"} className="mt-5">
            {g.grupo && <p className="mb-1 text-[11px] uppercase tracking-wide text-nevoa">#{g.grupo}</p>}
            <ul>
              {itens.map((i) => {
                const on = path === i.href;
                return (
                  <li key={i.href}>
                    <Link
                      href={i.href}
                      onClick={onIr}
                      aria-current={on ? "page" : undefined}
                      className={cx(
                        "-mx-2 flex min-h-11 items-center justify-between gap-2 px-2 lg:min-h-9",
                        on ? "bg-papel font-semibold text-carvao" : "text-papel/85 hover:bg-tecido",
                      )}
                    >
                      {i.nome}
                      {i.href === "/aprovacoes" && n > 0 && (
                        <span className={cx("min-w-5 px-1.5 text-center text-[12px] tabular-nums", on ? "bg-carvao text-papel" : "bg-papel text-carvao")}>{n}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

const ATALHO: Record<Perfil, { href: string; nome: string; icone: LucideIcon }> = {
  socios: { href: "/varredura", nome: "Varredura", icone: Radar },
  comercial: { href: "/varredura", nome: "Varredura", icone: Radar },
  locacao: { href: "/locacao", nome: "Locação", icone: KeyRound },
  juridico: { href: "/certidoes", nome: "Certidões", icone: Scale },
  marketing: { href: "/marketing", nome: "Marketing", icone: UserPlus },
  corretor: { href: "/leads", nome: "Leads", icone: UserPlus },
};

/** Ao alcance do polegar: o que mais se abre, e o menu inteiro */
function BarraInferior({ menu, onMenu }: { menu: boolean; onMenu: () => void }) {
  const path = usePathname();
  const perfil = useSarto((s) => s.perfil);
  const itens = [
    { href: "/", nome: "Início", icone: House },
    ATALHO[perfil],
    podeVer(perfil, "/aprovacoes") ? { href: "/aprovacoes", nome: "Aprovações", icone: CircleCheck } : null,
    { href: "/agenda", nome: "Agenda", icone: CalendarDays },
  ].filter((x) => x !== null);
  const estilo = (on: boolean) => cx("flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[11px]", on ? "font-semibold text-papel" : "text-nevoa");
  return (
    <nav aria-label="Atalhos" className="escuro nao-imprime fixed inset-x-0 bottom-0 z-40 flex bg-carvao pb-[env(safe-area-inset-bottom)] lg:hidden">
      {itens.map(({ href, nome, icone: I }) => {
        const on = !menu && path === href;
        return (
          <Link key={href} href={href} aria-current={on ? "page" : undefined} className={estilo(on)} onClick={() => menu && onMenu()}>
            <I size={20} aria-hidden strokeWidth={on ? 2.3 : 1.8} />
            {nome}
          </Link>
        );
      })}
      <button type="button" className={estilo(menu)} aria-expanded={menu} aria-controls="menu-celular" onClick={onMenu}>
        {menu ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden strokeWidth={1.8} />}
        {menu ? "Fechar" : "Menu"}
      </button>
    </nav>
  );
}

function QuemSou() {
  const perfil = useSarto((s) => s.perfil);
  const usuarioId = useSarto((s) => s.usuarioId);
  const usuarios = useSarto((s) => s.dados.usuarios);
  const ativos = usuarios.filter((u) => u.ativo);
  const valor = ativos.some((u) => u.id === usuarioId) ? `u:${usuarioId}` : `p:${perfil}`;
  return (
    <label className="block border-t border-tecido px-5 py-4 text-[12px] text-nevoa">
      Usando como
      <select
        className="mt-1 block min-h-11 w-full border border-tecido bg-carvao px-2 text-[14px] text-papel lg:min-h-9"
        value={valor}
        onChange={(e) => {
          const [t, id] = e.target.value.split(":");
          if (t === "u") acao().setUsuario(id);
          else acao().setPerfil(id as Perfil);
        }}
      >
        {ativos.map((u) => (
          <option key={u.id} value={`u:${u.id}`}>
            {u.nome} ({PERFIS[u.perfil].area})
          </option>
        ))}
        {(Object.keys(PERFIS) as Perfil[])
          .filter((p) => !ativos.some((u) => u.perfil === p) || valor === `p:${p}`)
          .map((p) => (
            <option key={p} value={`p:${p}`}>
              {PERFIS[p].nome} ({PERFIS[p].area})
            </option>
          ))}
      </select>
    </label>
  );
}

function SemPermissao() {
  const nome = useSarto(nomeAtual);
  return (
    <div className="py-16 text-center">
      <p className="text-[18px] font-semibold">Esta seção não faz parte do perfil de {nome}.</p>
      <p className="mx-auto mt-2 max-w-md text-cinza">Um dos sócios pode mudar o perfil em Usuários.</p>
      <Link href="/" className="mt-4 inline-flex min-h-11 items-center underline underline-offset-4">
        Voltar ao início
      </Link>
    </div>
  );
}

function Aviso() {
  const a = useSarto((s) => s.aviso);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    if (!a) return;
    setVis(true);
    const t = setTimeout(() => setVis(false), a.tom === "erro" ? 6500 : 3200);
    return () => clearTimeout(t);
  }, [a]);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 lg:bottom-5">
      {a && vis && (
        <div className={cx("flex items-center gap-2 px-4 py-2.5 text-papel", a.tom === "erro" ? "bg-erro" : "bg-carvao")}>
          {a.tom === "erro" ? <TriangleAlert size={16} /> : <Check size={16} />}
          {a.texto}
        </div>
      )}
    </div>
  );
}

export function Moldura({ children }: { children: React.ReactNode }) {
  const [pronto, setPronto] = useState(false);
  const [menu, setMenu] = useState(false);
  const path = usePathname();
  const perfil = useSarto((s) => s.perfil);

  // menu aberto: a página de trás não rola e Esc fecha
  useEffect(() => {
    if (!menu) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", esc);
    return () => {
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", esc);
    };
  }, [menu]);

  useEffect(() => {
    Promise.resolve(useSarto.persist.rehydrate()).then(() => {
      setPronto(true);
    });
    // outra aba mudou os dados: recarrega para não sobrescrever
    const h = (e: StorageEvent) => e.key === "sarto-painel" && useSarto.persist.rehydrate();
    window.addEventListener("storage", h);
    return () => window.removeEventListener("storage", h);
  }, []);

  return (
    <div className="min-h-dvh lg:pl-[252px]">
      <aside className="escuro nao-imprime fixed inset-y-0 left-0 hidden w-[252px] flex-col bg-carvao text-papel lg:flex">
        <Link href="/" className="block px-5 pb-1 pt-6" aria-label="Painel Sarto, início">
          <Logo className="h-9" />
        </Link>
        {pronto && <Navegacao />}
        {pronto && <QuemSou />}
      </aside>

      <div className="escuro nao-imprime sticky top-0 z-30 flex items-center bg-carvao px-4 pt-[env(safe-area-inset-top)] text-papel lg:hidden">
        <Link href="/" aria-label="Painel Sarto, início" className="flex min-h-13 items-center">
          <Logo className="h-7" />
        </Link>
      </div>
      {menu && pronto && (
        <div
          id="menu-celular"
          className="escuro fixed inset-x-0 top-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-40 flex flex-col bg-carvao pt-[env(safe-area-inset-top)] text-papel lg:hidden"
        >
          <Navegacao onIr={() => setMenu(false)} />
          <QuemSou />
        </div>
      )}
      {pronto && <BarraInferior menu={menu} onMenu={() => setMenu(!menu)} />}

      <main key={path} className="mx-auto max-w-[1240px] px-4 pt-6 pb-[calc(88px+env(safe-area-inset-bottom))] sm:px-8 sm:pt-9 lg:pb-9">
        {!pronto ? <p className="py-20 text-center text-cinza">Abrindo o painel…</p> : podeVer(perfil, path) ? children : <SemPermissao />}
      </main>
      <Aviso />
    </div>
  );
}

export function ErroTela({ onRepetir }: { onRepetir: () => void }) {
  return (
    <div className="py-16 text-center">
      <p className="text-[18px] font-semibold">Esta tela falhou ao abrir.</p>
      <p className="mx-auto mt-2 max-w-md text-cinza">Os dados continuam salvos neste navegador. Tente de novo; se repetir, exporte o backup em Configurações.</p>
      <div className="mt-4 flex justify-center gap-2">
        <Botao tom="cheio" onClick={onRepetir}>
          Tentar de novo
        </Botao>
      </div>
    </div>
  );
}
