"use client";
import { AlertTriangle, Check, CircleAlert, X } from "lucide-react";
import { type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { brHora } from "@/lib/datas";
import type { Checklist } from "@/lib/tipos";
import { acao } from "@/lib/store";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Cabecalho({ area, titulo, texto, children }: { area: string; titulo: string; texto?: string; children?: ReactNode }) {
  // #VISÃO + GERAL: primeira parte regular, o resto em negrito, como no Código de Cultura
  const [a, ...b] = area.split(" ");
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0 max-w-2xl">
        <p className="mb-1.5 text-[11px] uppercase tracking-[0.08em] text-cinza">
          #{b.length ? a : ""}
          <strong className="font-semibold text-carvao">{b.length ? b.join("") : a}</strong>
        </p>
        <h1 className="text-[28px] font-semibold leading-[1.15] tracking-[-0.02em] text-balance sm:text-[32px]">{titulo}</h1>
        {texto && <p className="mt-1.5 text-cinza text-pretty">{texto}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2 max-sm:w-full max-sm:*:flex-auto">{children}</div>}
    </header>
  );
}

type BotaoProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { tom?: "cheio" | "linha" | "texto" | "erro"; pequeno?: boolean };
export function Botao({ tom = "linha", pequeno, className, type = "button", ...p }: BotaoProps) {
  return <button type={type} {...p} className={cx(estiloBotao(tom, pequeno), className)} />;
}
export function estiloBotao(tom: BotaoProps["tom"] = "linha", pequeno = false) {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100",
    pequeno ? "min-h-9 px-3 text-[13px] pointer-coarse:min-h-11" : "min-h-10 px-4 pointer-coarse:min-h-11",
    tom === "cheio" && "bg-carvao text-papel shadow-[0_1px_2px_rgb(38_38_38/0.2)] hover:bg-tinta",
    tom === "linha" && "border border-carvao/80 bg-giz hover:bg-carvao hover:text-papel",
    tom === "texto" && "rounded-md underline decoration-nevoa underline-offset-4 hover:decoration-carvao px-1 active:scale-100",
    tom === "erro" && "border border-erro text-erro hover:bg-erro hover:text-papel",
  );
}

export function Cartao({ titulo, acao: ac, children, className, escuro }: { titulo?: ReactNode; acao?: ReactNode; children: ReactNode; className?: string; escuro?: boolean }) {
  return (
    <section
      className={cx(
        "min-w-0 rounded-[var(--radius-cartao)] p-5",
        escuro ? "escuro bg-carvao text-papel shadow-[var(--shadow-suave)]" : "bg-giz shadow-[var(--shadow-suave)]",
        className,
      )}
    >
      {(titulo || ac) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {titulo && <h2 className="text-[13px] font-semibold uppercase tracking-wide">{titulo}</h2>}
          {ac}
        </div>
      )}
      {children}
    </section>
  );
}

export function Numero({ valor, nome, nota, href }: { valor: ReactNode; nome: string; nota?: ReactNode; href?: string }) {
  const c = (
    <>
      <span className="block text-[26px] font-light leading-none tracking-tight tabular-nums [overflow-wrap:anywhere] sm:text-[34px]">{valor}</span>
      <span className="mt-2 block text-[13px] font-medium">{nome}</span>
      {nota && <span className="block text-[12px] text-cinza">{nota}</span>}
    </>
  );
  return href ? (
    <a href={href} className="block hover:underline decoration-nevoa underline-offset-4">
      {c}
    </a>
  ) : (
    <div>{c}</div>
  );
}

export function Numeros({ children }: { children: ReactNode }) {
  return (
    <div className="mb-7 grid grid-cols-2 gap-x-4 gap-y-6 rounded-[var(--radius-painel)] bg-giz px-5 py-5 shadow-[var(--shadow-suave)] sm:px-7 md:grid-cols-4">{children}</div>
  );
}

export type Tom = "ok" | "alerta" | "erro" | "neutro" | "forte";
export function Selo({ tom = "neutro", children }: { tom?: Tom; children: ReactNode }) {
  const I = tom === "ok" ? Check : tom === "alerta" ? CircleAlert : tom === "erro" ? AlertTriangle : null;
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-medium",
        tom === "ok" && "bg-okf text-ok",
        tom === "alerta" && "bg-alertaf text-alerta",
        tom === "erro" && "bg-errof text-erro",
        tom === "neutro" && "border border-linha text-cinza",
        tom === "forte" && "bg-carvao text-papel",
      )}
    >
      {I && <I size={12} strokeWidth={2.4} aria-hidden />}
      {children}
    </span>
  );
}

export function Fita({ parte, total, rotulo }: { parte: number; total: number; rotulo?: string }) {
  const p = total ? Math.min(100, Math.round((parte / total) * 100)) : 0;
  return (
    <div>
      <div className="fita" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} aria-label={rotulo ?? "Andamento"}>
        <i style={{ width: `${p}%` }} />
      </div>
      {rotulo && (
        <p className="mt-1 text-[12px] text-cinza">
          {rotulo}: {parte} de {total}
        </p>
      )}
    </div>
  );
}

export const Costura = ({ className }: { className?: string }) => <div className={cx("costura text-nevoa", className)} aria-hidden />;

/** Tabela no computador, cartões no celular: cada célula leva o nome da coluna */
export function Tabela({ className, children }: { className?: string; children: ReactNode }) {
  const r = useRef<HTMLTableElement>(null);
  useLayoutEffect(() => {
    const t = r.current;
    if (!t) return;
    const nomes = [...t.querySelectorAll("thead th")].map((h) => h.textContent?.trim() ?? "");
    for (const l of t.querySelectorAll("tbody tr")) for (const [i, c] of [...l.children].entries()) c.setAttribute("data-coluna", nomes[i] ?? "");
  });
  return (
    <div className="md:overflow-x-auto">
      <table ref={r} className={cx("tabela", className)}>
        {children}
      </table>
    </div>
  );
}

/** Etapas lado a lado no computador, com rolagem por teclado; empilhadas no celular */
export function Quadro({ nome, children }: { nome: string; children: ReactNode }) {
  return (
    // biome-ignore lint/a11y/noNoninteractiveTabindex: área com rolagem precisa receber o teclado
    <section aria-label={nome} tabIndex={0} className="pb-2 md:overflow-x-auto">
      {children}
    </section>
  );
}

export function Vazio({ children, acao: ac }: { children: ReactNode; acao?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-cartao)] border border-dashed border-nevoa bg-giz/60 px-5 py-9 text-center text-cinza">
      <p className="mx-auto max-w-md text-pretty">{children}</p>
      {ac && <div className="mt-3">{ac}</div>}
    </div>
  );
}

export function Nota({ tom = "neutro", children }: { tom?: Tom; children: ReactNode }) {
  return (
    <div
      className={cx(
        "rounded-xl px-4 py-3 text-[13px]",
        tom === "neutro" && "bg-linho",
        tom === "ok" && "bg-okf text-ok",
        tom === "alerta" && "bg-alertaf text-alerta",
        tom === "erro" && "bg-errof text-erro",
        tom === "forte" && "bg-carvao text-papel",
      )}
    >
      {children}
    </div>
  );
}

export function Abas<T extends string>({ itens, atual, onMuda }: { itens: { id: T; nome: string; n?: number }[]; atual: T; onMuda: (t: T) => void }) {
  return (
    <div className="mb-5 flex w-fit max-w-full gap-1 overflow-x-auto overflow-y-hidden rounded-full bg-linho p-1" role="tablist">
      {itens.map((i) => (
        <button
          key={i.id}
          type="button"
          role="tab"
          aria-selected={i.id === atual}
          onClick={() => onMuda(i.id)}
          className={cx(
            "min-h-10 whitespace-nowrap rounded-full px-4 transition-colors duration-150 pointer-coarse:min-h-11",
            i.id === atual ? "bg-carvao font-semibold text-papel shadow-[0_1px_2px_rgb(38_38_38/0.25)]" : "text-cinza hover:bg-papel hover:text-carvao",
          )}
        >
          {i.nome}
          {i.n != null && <span className={cx("ml-1.5 tabular-nums", i.id === atual ? "text-nevoa" : "text-cinza")}>{i.n}</span>}
        </button>
      ))}
    </div>
  );
}

export function Gaveta({
  aberta,
  titulo,
  sub,
  onFecha,
  children,
  rodape,
  larga,
}: {
  aberta: boolean;
  titulo: string;
  sub?: ReactNode;
  onFecha: () => void;
  children: ReactNode;
  rodape?: ReactNode;
  larga?: boolean;
}) {
  const r = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const d = r.current;
    if (!d) return;
    if (aberta && !d.open) d.showModal();
    if (!aberta && d.open) d.close();
  }, [aberta]);
  return (
    <dialog
      ref={r}
      aria-labelledby={id}
      className={cx("gaveta", larga && "larga")}
      onCancel={(e) => {
        e.preventDefault();
        onFecha();
      }}
      onMouseDown={(e) => e.target === r.current && onFecha()}
    >
      {aberta && (
        <div className="flex h-full flex-col">
          <div className="escuro flex items-start justify-between gap-4 bg-carvao px-5 py-4 text-papel sm:px-7 sm:py-5">
            <div className="min-w-0">
              <h2 id={id} className="text-[18px] font-semibold leading-snug">
                {titulo}
              </h2>
              {sub && <div className="mt-0.5 text-[13px] text-nevoa">{sub}</div>}
            </div>
            <button type="button" onClick={onFecha} aria-label="Fechar" className="-mr-2 grid size-11 shrink-0 place-items-center rounded-full transition-colors hover:bg-tecido">
              <X size={20} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-7">{children}</div>
          {rodape && (
            <div className="flex flex-wrap justify-end gap-2 border-t border-linha/70 bg-giz px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] max-sm:*:flex-auto sm:px-7">
              {rodape}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}

export function Confirmar({ aberta, titulo, texto, sim, onSim, onNao }: { aberta: boolean; titulo: string; texto: ReactNode; sim: string; onSim: () => void; onNao: () => void }) {
  const r = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = r.current;
    if (!d) return;
    if (aberta && !d.open) d.showModal();
    if (!aberta && d.open) d.close();
  }, [aberta]);
  return (
    <dialog
      ref={r}
      className="caixa"
      onCancel={(e) => {
        e.preventDefault();
        onNao();
      }}
    >
      {aberta && (
        <div className="p-6">
          <h2 className="text-[17px] font-semibold">{titulo}</h2>
          <div className="mt-2 text-cinza">{texto}</div>
          <div className="mt-5 flex justify-end gap-2">
            <Botao onClick={onNao}>Cancelar</Botao>
            <Botao tom="erro" onClick={onSim}>
              {sim}
            </Botao>
          </div>
        </div>
      )}
    </dialog>
  );
}

/** Lista de itens que guarda quem marcou e quando */
export function Itens({
  itens,
  check,
  onMuda,
  travado,
}: {
  itens: { id: string; nome: string; quem?: string }[];
  check: Checklist;
  onMuda: (c: Checklist) => void;
  travado?: boolean;
}) {
  return (
    <ul className="divide-y divide-linha">
      {itens.map((i) => {
        const f = check[i.id];
        return (
          <li key={i.id}>
            <label className={cx("flex min-h-11 items-center gap-3 py-1.5", travado ? "cursor-default" : "cursor-pointer")}>
              <input
                type="checkbox"
                className="size-[18px] shrink-0 accent-carvao"
                checked={!!f}
                disabled={travado}
                onChange={(e) => {
                  const n = { ...check };
                  if (e.target.checked) n[i.id] = acao().feito();
                  else delete n[i.id];
                  onMuda(n);
                }}
              />
              <span className={cx("flex-1", f && "text-cinza")}>{i.nome}</span>
              <span className="text-right text-[12px] text-cinza">{f ? `${f.por}, ${brHora(f.em)}` : i.quem}</span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

export interface Barra {
  nome: string;
  valor: number;
  rotulo?: string;
  nota?: string;
}
/** Barras horizontais de uma série só, com o valor escrito na ponta */
export function Barras({ dados, vazio = "Sem dados ainda." }: { dados: Barra[]; vazio?: string }) {
  const max = Math.max(...dados.map((d) => d.valor), 0);
  if (!dados.length || max <= 0) return <p className="text-[13px] text-cinza">{vazio}</p>;
  return (
    <ul className="space-y-2.5">
      {dados.map((d) => (
        <li key={d.nome} title={d.nota ?? `${d.nome}: ${d.rotulo ?? d.valor}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate">{d.nome}</span>
            <span className="tabular-nums font-medium">{d.rotulo ?? d.valor}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-linha">
            <div className="h-full rounded-full bg-carvao" style={{ width: `${Math.max(d.valor > 0 ? 1.5 : 0, (d.valor / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Colunas por mês, uma série só */
export function Colunas({ dados, formato }: { dados: { nome: string; valor: number }[]; formato: (v: number) => string }) {
  const max = Math.max(...dados.map((d) => d.valor), 1);
  return (
    <ul className="flex items-end gap-2">
      {dados.map((d, i) => (
        <li key={d.nome} className="group flex min-w-0 flex-1 flex-col items-center" title={`${d.nome}: ${formato(d.valor)}`}>
          <span className={cx("mb-1 whitespace-nowrap text-[11px] tabular-nums group-hover:visible", i === dados.length - 1 ? "font-semibold" : "invisible")}>
            {formato(d.valor)}
          </span>
          <div className="flex h-28 w-full items-end justify-center border-b border-carvao">
            <div
              className={cx("w-full max-w-9 rounded-t-[4px] group-hover:bg-carvao", i === dados.length - 1 ? "bg-carvao" : "bg-nevoa")}
              style={{ height: `${Math.max(d.valor > 0 ? 2 : 0, (d.valor / max) * 100)}%` }}
            />
          </div>
          <span className="mt-1 text-[11px] text-cinza">{d.nome}</span>
        </li>
      ))}
    </ul>
  );
}

export function Busca({ valor, onMuda, placeholder = "Buscar" }: { valor: string; onMuda: (v: string) => void; placeholder?: string }) {
  return <input type="search" className="campo sm:max-w-xs" value={valor} onChange={(e) => onMuda(e.target.value)} placeholder={placeholder} aria-label={placeholder} />;
}

export function Escolha<T extends string>({
  valor,
  onMuda,
  opcoes,
  rotulo,
  className,
}: {
  valor: T;
  onMuda: (v: T) => void;
  opcoes: { id: T; nome: string }[];
  rotulo: string;
  className?: string;
}) {
  return (
    <select
      className={cx("campo max-w-full max-sm:min-w-[44%] max-sm:flex-1 sm:w-auto", className)}
      value={valor}
      onChange={(e) => onMuda(e.target.value as T)}
      aria-label={rotulo}
    >
      {opcoes.map((o) => (
        <option key={o.id} value={o.id}>
          {o.nome}
        </option>
      ))}
    </select>
  );
}

export function Copiar({ texto, children, pequeno = true }: { texto: string; children: ReactNode; pequeno?: boolean }) {
  const [ok, setOk] = useState(false);
  return (
    <Botao
      pequeno={pequeno}
      disabled={!texto}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setOk(true);
          setTimeout(() => setOk(false), 1600);
        } catch {
          acao().avisar("O navegador não deixou copiar. Selecione o texto e copie na mão.", "erro");
        }
      }}
    >
      {ok ? <Check size={14} /> : null}
      {ok ? "Copiado" : children}
    </Botao>
  );
}

export function ListaInfo({ itens }: { itens: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[minmax(96px,auto)_1fr] gap-x-4 sm:gap-x-5 gap-y-1.5 text-[13px]">
      {itens.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-cinza">{k}</dt>
          <dd className="min-w-0 break-words">{v || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export { cx };
