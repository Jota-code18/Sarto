"use client";
import { Check, Menu, TriangleAlert, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { pendenciasDe } from "@/lib/hoje";
import { PERFIS } from "@/lib/regras";
import { acao, useSarto } from "@/lib/store";
import type { Perfil } from "@/lib/tipos";
import { Logo } from "./logo";
import { Botao, cx } from "./ui";

type Item = { href: string; nome: string; perfis?: Perfil[] };
const TODOS_GESTORES: Perfil[] = ["socios", "comercial", "locacao", "marketing", "juridico"];
const MENU: { grupo: string; itens: Item[] }[] = [
  {
    grupo: "",
    itens: [
      { href: "/", nome: "Início" },
      { href: "/aprovacoes", nome: "Aprovações", perfis: TODOS_GESTORES },
      { href: "/agenda", nome: "Agenda" },
    ],
  },
  {
    grupo: "Comercial",
    itens: [
      { href: "/leads", nome: "Leads", perfis: ["socios", "comercial", "corretor", "marketing"] },
      { href: "/captacao", nome: "Captação", perfis: ["socios", "comercial", "corretor", "locacao"] },
      { href: "/carteira", nome: "Carteira e nota dos anúncios", perfis: ["socios", "comercial", "corretor", "marketing"] },
      { href: "/varredura", nome: "Varredura dos portais", perfis: ["socios", "comercial"] },
      { href: "/corretores", nome: "Corretores", perfis: ["socios", "comercial", "marketing"] },
    ],
  },
  {
    grupo: "Locação",
    itens: [
      { href: "/locacao", nome: "Contratos", perfis: ["socios", "locacao"] },
      { href: "/locacao/cobrancas", nome: "Cobranças e repasses", perfis: ["socios", "locacao"] },
      { href: "/locacao/funil", nome: "Funil de locação", perfis: ["socios", "locacao", "comercial"] },
      { href: "/locacao/atendimento", nome: "Chamados e multas", perfis: ["socios", "locacao"] },
      { href: "/locacao/obrigacoes", nome: "Informe e DIMOB", perfis: ["socios", "locacao"] },
    ],
  },
  {
    grupo: "Jurídico",
    itens: [
      { href: "/pos-venda", nome: "Pós-venda", perfis: ["socios", "comercial", "juridico", "locacao", "corretor"] },
      { href: "/certidoes", nome: "Certidões", perfis: ["socios", "comercial", "juridico", "locacao"] },
      { href: "/minutas", nome: "Minutas e modelos", perfis: ["socios", "comercial", "juridico", "locacao"] },
      { href: "/consulta", nome: "Consulta de publicações", perfis: ["socios", "juridico", "locacao", "comercial"] },
    ],
  },
  {
    grupo: "Gestão",
    itens: [
      { href: "/financeiro", nome: "Financeiro", perfis: ["socios", "locacao"] },
      { href: "/marketing", nome: "Marketing", perfis: ["socios", "marketing", "comercial"] },
      { href: "/rotina", nome: "Rotina do escritório" },
      { href: "/registro", nome: "Registro de atividades" },
      { href: "/custos", nome: "Custos e integrações", perfis: ["socios"] },
      { href: "/pendencias", nome: "O que falta da Sarto", perfis: TODOS_GESTORES },
      { href: "/config", nome: "Configurações", perfis: TODOS_GESTORES },
    ],
  },
];

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
  return (
    <label className="block border-t border-tecido px-5 py-4 text-[12px] text-nevoa">
      Usando como
      <select
        className="mt-1 block min-h-9 w-full border border-tecido bg-carvao px-2 text-[14px] text-papel"
        value={perfil}
        onChange={(e) => acao().setPerfil(e.target.value as Perfil)}
      >
        {(Object.keys(PERFIS) as Perfil[]).map((p) => (
          <option key={p} value={p}>
            {PERFIS[p].nome} ({PERFIS[p].area})
          </option>
        ))}
      </select>
    </label>
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

function FaixaDemo() {
  const modo = useSarto((s) => s.modo);
  if (modo !== "demo") return null;
  return (
    <div className="nao-imprime mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-alertaf px-4 py-2.5 text-[13px] text-alerta">
      <span>
        <strong className="font-semibold">Dados de demonstração.</strong> Pessoas, contratos e valores são inventados. Só a carteira de imóveis é real, lida do site.
      </span>
      <Link href="/config" className="font-medium underline underline-offset-4">
        Começar com os dados da Sarto
      </Link>
    </div>
  );
}

export function Moldura({ children }: { children: React.ReactNode }) {
  const [pronto, setPronto] = useState(false);
  const [menu, setMenu] = useState(false);
  const path = usePathname();

  useEffect(() => {
    const tem = localStorage.getItem("sarto-painel");
    Promise.resolve(useSarto.persist.rehydrate()).then(() => {
      if (!tem) acao().usarDemo();
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
        {pronto ? (
          <>
            <FaixaDemo />
            {children}
          </>
        ) : (
          <p className="py-20 text-center text-cinza">Abrindo o painel…</p>
        )}
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
