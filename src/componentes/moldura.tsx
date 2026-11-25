"use client";
import { Check, Menu, TriangleAlert, X } from "lucide-react";
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
                      className={cx("-mx-2 flex min-h-9 items-center justify-between gap-2 px-2", on ? "bg-papel font-semibold text-carvao" : "text-papel/85 hover:bg-tecido")}
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
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
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

      <div className="escuro nao-imprime sticky top-0 z-30 flex items-center justify-between bg-carvao px-4 py-2.5 text-papel lg:hidden">
        <Link href="/" aria-label="Painel Sarto, início">
          <Logo className="h-7" />
        </Link>
        <button type="button" className="grid size-10 place-items-center" aria-label={menu ? "Fechar menu" : "Abrir menu"} aria-expanded={menu} onClick={() => setMenu(!menu)}>
          {menu ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {menu && pronto && (
        <div className="escuro fixed inset-x-0 bottom-0 top-[60px] z-40 flex flex-col bg-carvao text-papel lg:hidden">
          <Navegacao onIr={() => setMenu(false)} />
          <QuemSou />
        </div>
      )}

      <main key={path} className="mx-auto max-w-[1240px] px-4 py-6 sm:px-8 sm:py-9">
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
