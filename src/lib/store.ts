"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { agora } from "./datas";
import { dadosDemo, dadosVazios } from "./demo";
import { novoId } from "./formato";
import { PERFIS, REGRAS } from "./regras";
import type { Colecao, Dados, Feito, Perfil, Regras } from "./tipos";

/**
 * Banco local do MVP: fica só no navegador de quem usa. A troca para Supabase
 * acontece aqui, sem mexer nas telas.
 */
interface Estado {
  dados: Dados;
  regras: Regras;
  perfil: Perfil;
  modo: "demo" | "real";
  aviso: { texto: string; tom: "ok" | "erro"; n: number } | null;
  salvar: <C extends Colecao>(c: C, item: Dados[C][number]) => void;
  mudar: <C extends Colecao>(c: C, id: string, p: Partial<Dados[C][number]>) => void;
  remover: (c: Colecao, id: string) => void;
  varios: <C extends Colecao>(c: C, itens: Dados[C][number][]) => void;
  setRegras: (p: Partial<Regras>) => void;
  setPerfil: (p: Perfil) => void;
  avisar: (texto: string, tom?: "ok" | "erro") => void;
  registrar: (area: string, texto: string) => void;
  feito: () => Feito;
  comecarDoZero: () => void;
  usarDemo: () => void;
  importar: (j: unknown) => boolean;
}

type ComId = { id: string };
const MAX_LOGS = 400;
export const VERSAO = 1;

export const useSarto = create<Estado>()(
  persist(
    (set, get) => ({
      dados: dadosVazios(),
      regras: REGRAS,
      perfil: "socios",
      modo: "demo",
      aviso: null,
      salvar: (c, item) =>
        set((s) => {
          const lista = s.dados[c] as ComId[];
          const it = item as ComId;
          const nova = lista.some((x) => x.id === it.id) ? lista.map((x) => (x.id === it.id ? it : x)) : [it, ...lista];
          return { dados: { ...s.dados, [c]: nova } };
        }),
      mudar: (c, id, p) =>
        set((s) => ({
          dados: { ...s.dados, [c]: (s.dados[c] as ComId[]).map((x) => (x.id === id ? { ...x, ...p } : x)) },
        })),
      remover: (c, id) => set((s) => ({ dados: { ...s.dados, [c]: (s.dados[c] as ComId[]).filter((x) => x.id !== id) } })),
      varios: (c, itens) => set((s) => ({ dados: { ...s.dados, [c]: [...(itens as ComId[]), ...(s.dados[c] as ComId[])] } })),
      setRegras: (p) => set((s) => ({ regras: { ...s.regras, ...p } })),
      setPerfil: (perfil) => set({ perfil }),
      avisar: (texto, tom = "ok") => set({ aviso: { texto, tom, n: Date.now() } }),
      registrar: (area, texto) =>
        set((s) => ({
          dados: {
            ...s.dados,
            logs: [{ id: novoId(), em: agora(), quem: PERFIS[s.perfil].nome, area, texto }, ...s.dados.logs].slice(0, MAX_LOGS),
          },
        })),
      feito: () => ({ em: agora(), por: PERFIS[get().perfil].nome }),
      comecarDoZero: () => set({ dados: dadosVazios(), modo: "real" }),
      usarDemo: () => set({ dados: dadosDemo(), modo: "demo" }),
      importar: (j) => {
        const b = j as { app?: string; dados?: Partial<Dados>; regras?: Partial<Regras>; modo?: "demo" | "real" };
        if (b?.app !== "sarto-painel" || !b.dados || typeof b.dados !== "object") return false;
        const base = dadosVazios();
        // só aceita coleções conhecidas e que sejam lista
        for (const k of Object.keys(base) as Colecao[])
          if (Array.isArray(b.dados[k])) (base as unknown as Record<string, unknown>)[k] = b.dados[k];
        set({ dados: base, regras: { ...REGRAS, ...b.regras }, modo: b.modo === "demo" ? "demo" : "real" });
        return true;
      },
    }),
    {
      name: "sarto-painel",
      version: VERSAO,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({ dados: s.dados, regras: s.regras, perfil: s.perfil, modo: s.modo }),
      merge: (salvo, atual) => {
        const g = (salvo ?? {}) as Partial<Estado>;
        return {
          ...atual,
          ...g,
          dados: { ...atual.dados, ...(g.dados ?? {}) },
          regras: { ...atual.regras, ...(g.regras ?? {}) },
        };
      },
    },
  ),
);

export function exportarTudo() {
  const { dados, regras, modo } = useSarto.getState();
  return JSON.stringify({ app: "sarto-painel", versao: VERSAO, em: agora(), modo, dados, regras }, null, 1);
}

export const acao = () => useSarto.getState();
