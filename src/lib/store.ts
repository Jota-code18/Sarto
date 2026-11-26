"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { agora } from "./datas";
import { dadosVazios, semExemplos } from "./base";
import { novoId } from "./formato";
import { PERFIS, REGRAS } from "./regras";
import type { Anuncio, Colecao, Dados, Feito, Perfil, Regras } from "./tipos";

/**
 * Banco local do MVP: fica só no navegador de quem usa. A troca para Supabase
 * acontece aqui, sem mexer nas telas.
 */
interface Estado {
  dados: Dados;
  regras: Regras;
  perfil: Perfil;
  usuarioId: string | null;
  aviso: { texto: string; tom: "ok" | "erro"; n: number } | null;
  salvar: <C extends Colecao>(c: C, item: Dados[C][number]) => void;
  mudar: <C extends Colecao>(c: C, id: string, p: Partial<Dados[C][number]>) => void;
  remover: (c: Colecao, id: string) => void;
  varios: <C extends Colecao>(c: C, itens: Dados[C][number][]) => void;
  setRegras: (p: Partial<Regras>) => void;
  setPerfil: (p: Perfil) => void;
  setUsuario: (id: string) => void;
  avisar: (texto: string, tom?: "ok" | "erro") => void;
  registrar: (area: string, texto: string) => void;
  feito: () => Feito;
  apagarTudo: () => void;
  importar: (j: unknown) => boolean;
}

/** Quem está usando: a pessoa cadastrada ou, sem cadastro, o nome do perfil */
export const nomeAtual = (s: Pick<Estado, "dados" | "usuarioId" | "perfil">) => s.dados.usuarios.find((u) => u.id === s.usuarioId)?.nome ?? PERFIS[s.perfil].nome;

type ComId = { id: string };
const MAX_LOGS = 400;
const VERSAO = 4;
/** Varreduras já trazidas; esquecer faz o painel trazer de novo */
export const CHAVE_COLETAS = "sarto-coletas-lidas-2";
const relerColetas = () => localStorage.removeItem(CHAVE_COLETAS);

/** Completa dados salvos por versões anteriores do painel */
function completar(d: Partial<Dados>): Partial<Dados> {
  return {
    ...d,
    anuncios: (d.anuncios ?? []).map((a: Anuncio) => ({ ...a, cidade: a.cidade ?? "Anápolis", codAnunciante: a.codAnunciante ?? "", primeiraVez: a.primeiraVez ?? a.vistoEm })),
  };
}

/** Avisa quando o navegador fica sem espaço, em vez de derrubar a tela */
const guarda = {
  getItem: (k: string) => localStorage.getItem(k),
  removeItem: (k: string) => localStorage.removeItem(k),
  setItem: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      setTimeout(() => useSarto.getState().avisar("Sem espaço neste navegador: a última mudança não foi salva. Limpe anúncios antigos da varredura.", "erro"));
    }
  },
};

export const useSarto = create<Estado>()(
  persist(
    (set, get) => ({
      dados: dadosVazios(),
      regras: REGRAS,
      perfil: "socios",
      usuarioId: null,
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
      setPerfil: (perfil) => set({ perfil, usuarioId: null }),
      setUsuario: (id) =>
        set((s) => {
          const u = s.dados.usuarios.find((x) => x.id === id && x.ativo);
          return u ? { usuarioId: u.id, perfil: u.perfil } : {};
        }),
      avisar: (texto, tom = "ok") => set({ aviso: { texto, tom, n: Date.now() } }),
      registrar: (area, texto) =>
        set((s) => ({
          dados: {
            ...s.dados,
            logs: [{ id: novoId(), em: agora(), quem: nomeAtual(s), area, texto }, ...s.dados.logs].slice(0, MAX_LOGS),
          },
        })),
      feito: () => ({ em: agora(), por: nomeAtual(get()) }),
      apagarTudo: () => {
        relerColetas();
        set({ dados: dadosVazios() });
      },
      importar: (j) => {
        const b = j as { app?: string; dados?: Partial<Dados>; regras?: Partial<Regras>; modo?: string };
        if (b?.app !== "sarto-painel" || !b.dados || typeof b.dados !== "object") return false;
        const base = dadosVazios();
        // só aceita coleções conhecidas e que sejam lista
        for (const k of Object.keys(base) as Colecao[]) if (Array.isArray(b.dados[k])) (base as unknown as Record<string, unknown>)[k] = b.dados[k];
        Object.assign(base, completar(base));
        relerColetas();
        set({ dados: b.modo === "demo" ? semExemplos(base) : base, regras: { ...REGRAS, ...b.regras } });
        return true;
      },
    }),
    {
      name: "sarto-painel",
      version: VERSAO,
      storage: createJSONStorage(() => guarda),
      migrate: (salvo, versao) => {
        const { modo, ...g } = (salvo ?? {}) as Partial<Estado> & { modo?: string };
        // até a versão 3 a varredura cortava abaixo de R$ 1 milhão
        if (versao < 4 && g.regras?.padraoPrecoMin === 1_000_000) g.regras = { ...g.regras, padraoPrecoMin: 0 };
        return (modo === "demo" ? { ...g, dados: semExemplos(g.dados ?? {}) } : g) as Estado;
      },
      skipHydration: true,
      partialize: (s) => ({ dados: s.dados, regras: s.regras, perfil: s.perfil, usuarioId: s.usuarioId }),
      merge: (salvo, atual) => {
        const g = (salvo ?? {}) as Partial<Estado>;
        return {
          ...atual,
          ...g,
          dados: { ...atual.dados, ...completar(g.dados ?? {}) },
          regras: { ...atual.regras, ...(g.regras ?? {}) },
        };
      },
    },
  ),
);

export function exportarTudo() {
  const { dados, regras } = useSarto.getState();
  return JSON.stringify({ app: "sarto-painel", versao: VERSAO, em: agora(), dados, regras }, null, 1);
}

export const acao = () => useSarto.getState();
