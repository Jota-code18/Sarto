"use client";
import { useEffect, useId, useState } from "react";
import { brl, docValido, lerValor, mascaraDoc, mascaraTel, soDigitos } from "@/lib/formato";
import { cx } from "./ui";

export interface CampoDef {
  k: string;
  nome: string;
  tipo?: "texto" | "dinheiro" | "numero" | "data" | "hora" | "datahora" | "opcoes" | "area" | "doc" | "tel" | "email" | "sim";
  opcoes?: { id: string; nome: string }[] | string[];
  /** colunas ocupadas, de 1 a 6 */
  col?: 1 | 2 | 3 | 4 | 6;
  dica?: string;
  obrigatorio?: boolean;
  se?: (v: Record<string, unknown>) => boolean;
  linhas?: number;
}
export type GrupoDef = { grupo: string; campos: CampoDef[] };

// biome-ignore lint: valores de formulário são dinâmicos
type Qualquer = any;

const lerCaminho = (o: Qualquer, k: string) => k.split(".").reduce((a, p) => a?.[p], o);
function porCaminho<T>(o: T, k: string, v: unknown): T {
  const [p, ...r] = k.split(".");
  const base = (o ?? {}) as Qualquer;
  return { ...base, [p]: r.length ? porCaminho(base[p], r.join("."), v) : v };
}

export function obrigatoriosVazios(campos: CampoDef[], v: unknown) {
  return campos.filter((c) => c.obrigatorio && (!c.se || c.se(v as Record<string, unknown>)) && !lerCaminho(v, c.k)).map((c) => c.nome.toLowerCase());
}

const COL = { 1: "col-span-3 sm:col-span-1", 2: "col-span-3 sm:col-span-2", 3: "col-span-6 sm:col-span-3", 4: "col-span-6 sm:col-span-4", 6: "col-span-6" };

function Dinheiro({ id, valor, onMuda }: { id: string; valor: number; onMuda: (v: number) => void }) {
  const [t, setT] = useState(valor ? brl(valor) : "");
  const [foco, setFoco] = useState(false);
  useEffect(() => {
    if (!foco) setT(valor ? brl(valor) : "");
  }, [valor, foco]);
  return (
    <input
      id={id}
      className="campo tabular-nums"
      inputMode="decimal"
      placeholder="R$ 0,00"
      value={t}
      onFocus={() => setFoco(true)}
      onChange={(e) => {
        setT(e.target.value);
        onMuda(lerValor(e.target.value));
      }}
      onBlur={() => {
        setFoco(false);
        setT(valor ? brl(valor) : "");
      }}
    />
  );
}

function Campo({ def, valor, onMuda }: { def: CampoDef; valor: Qualquer; onMuda: (v: unknown) => void }) {
  const id = useId();
  const t = def.tipo ?? "texto";
  const ops = def.opcoes?.map((o) => (typeof o === "string" ? { id: o, nome: o } : o));
  const docRuim = t === "doc" && soDigitos(valor ?? "").length >= 11 && !docValido(valor);
  return (
    <div className={COL[def.col ?? 3]}>
      {t !== "sim" && (
        <label htmlFor={id} className="mb-1 block text-[12px] font-medium">
          {def.nome}
          {def.obrigatorio && <span className="text-erro"> *</span>}
        </label>
      )}
      {t === "area" ? (
        <textarea id={id} className="campo" rows={def.linhas ?? 4} value={valor ?? ""} onChange={(e) => onMuda(e.target.value)} />
      ) : t === "opcoes" ? (
        <select id={id} className="campo" value={valor ?? ""} onChange={(e) => onMuda(e.target.value)}>
          {!ops?.some((o) => o.id === (valor ?? "")) && <option value={valor ?? ""}>{valor || "Escolha"}</option>}
          {ops?.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nome}
            </option>
          ))}
        </select>
      ) : t === "dinheiro" ? (
        <Dinheiro id={id} valor={valor ?? 0} onMuda={onMuda} />
      ) : t === "numero" ? (
        <input id={id} className="campo tabular-nums" type="number" step="any" min={0} value={valor || ""} onChange={(e) => onMuda(Number(e.target.value) || 0)} />
      ) : t === "sim" ? (
        <label className="flex min-h-10 cursor-pointer items-center gap-3 pt-1 sm:pt-5">
          <input type="checkbox" className="size-[18px] accent-carvao" checked={!!valor} onChange={(e) => onMuda(e.target.checked)} />
          <span>{def.nome}</span>
        </label>
      ) : (
        <input
          id={id}
          className="campo"
          type={t === "data" ? "date" : t === "hora" ? "time" : t === "datahora" ? "datetime-local" : t === "email" ? "email" : "text"}
          inputMode={t === "doc" || t === "tel" ? "numeric" : undefined}
          aria-invalid={docRuim || undefined}
          value={t === "doc" ? mascaraDoc(valor ?? "") : t === "tel" ? mascaraTel(valor ?? "") : (valor ?? "")}
          onChange={(e) => onMuda(t === "doc" || t === "tel" ? soDigitos(e.target.value).slice(0, 14) : e.target.value)}
        />
      )}
      {(def.dica || docRuim) && <p className={cx("mt-1 text-[12px]", docRuim ? "text-erro" : "text-cinza")}>{docRuim ? "Número inválido: confira os dígitos." : def.dica}</p>}
    </div>
  );
}

export function Formulario<T>({ grupos, valor, onMuda }: { grupos: GrupoDef[]; valor: T; onMuda: (v: T) => void }) {
  return (
    <div className="space-y-7">
      {grupos.map((g) => {
        const campos = g.campos.filter((c) => !c.se || c.se(valor as Record<string, unknown>));
        if (!campos.length) return null;
        return (
          <fieldset key={g.grupo}>
            {g.grupo && <legend className="mb-3 text-[13px] font-semibold uppercase tracking-wide">{g.grupo}</legend>}
            <div className="grid grid-cols-6 gap-x-4 gap-y-4">
              {campos.map((c) => (
                <Campo key={c.k} def={c} valor={lerCaminho(valor, c.k)} onMuda={(v) => onMuda(porCaminho(valor, c.k, v))} />
              ))}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

export const CAMPOS_PESSOA = (p: string, nome = "Nome", obrigatorio = false): CampoDef[] => [
  { k: `${p}.nome`, nome, col: 6, obrigatorio },
  { k: `${p}.doc`, nome: "CPF ou CNPJ", tipo: "doc", col: 2 },
  { k: `${p}.tel`, nome: "Telefone", tipo: "tel", col: 2 },
  { k: `${p}.email`, nome: "E-mail", tipo: "email", col: 2 },
];
