"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { brHora } from "@/lib/datas";
import { num } from "@/lib/formato";
import { acao, useSarto } from "@/lib/store";
import { type Bruto, mesclar, normalizar } from "@/lib/varredura";
import { Botao } from "./ui";

interface Estado {
  ligada?: boolean;
  falta?: string[];
  rodando?: boolean;
  ultima?: { id: string; inicio: string };
  falhou?: boolean;
  gasto?: number;
  erro?: string;
}
const CHAVE = "sarto-ultima-coleta";

async function ler(u: string, init?: RequestInit) {
  const r = await fetch(u, { cache: "no-store", ...init });
  if (!/json/.test(r.headers.get("content-type") ?? "")) throw new Error("Entre de novo no painel");
  const j = await r.json();
  if (j.erro) throw new Error(j.erro);
  return j;
}

/** Inicia, acompanha e traz a varredura, sem sair do painel */
export function Coleta() {
  const [s, setS] = useState<Estado | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [lendo, setLendo] = useState(false);
  const trava = useRef(false);

  const atualizar = useCallback(async () => {
    try {
      const e: Estado = await ler("/api/coleta");
      setS(e);
      if (e.ultima && localStorage.getItem(CHAVE) !== e.ultima.id && !trava.current) {
        trava.current = true;
        setLendo(true);
        try {
          const todos: unknown[] = [];
          for (let o = 0; o < 4000; o += 400) {
            const { itens } = await ler(`/api/coleta?rodada=${e.ultima.id}&offset=${o}`);
            todos.push(...itens);
            if (itens.length < 400) break;
          }
          const st = useSarto.getState();
          const antes = st.modo === "demo" ? [] : st.dados.anuncios;
          const r = mesclar(antes, todos.map(normalizar).filter((x): x is Bruto => !!x), st.regras.padraoCidade);
          useSarto.setState({ dados: { ...st.dados, anuncios: r.lista } });
          localStorage.setItem(CHAVE, e.ultima.id);
          acao().registrar("Varredura", `${r.novos} novos, ${r.baixaram} baixaram de preço`);
          acao().avisar(`Varredura: ${r.novos} novos, ${r.baixaram} baixaram de preço`);
        } finally {
          trava.current = false;
          setLendo(false);
        }
      }
    } catch (x) {
      setS((a) => ({ ...a, erro: x instanceof Error ? x.message : "Sem conexão" }));
    }
  }, []);

  useEffect(() => {
    atualizar();
  }, [atualizar]);
  useEffect(() => {
    if (!s?.rodando) return;
    const t = setInterval(atualizar, 10000);
    return () => clearInterval(t);
  }, [s?.rodando, atualizar]);

  const varrer = async () => {
    setOcupado(true);
    try {
      const r = await ler("/api/coleta", { method: "POST" });
      if (r.motivo) acao().avisar(r.motivo, r.ok ? "ok" : "erro");
      await atualizar();
    } catch (x) {
      acao().avisar(x instanceof Error ? x.message : "Não consegui iniciar", "erro");
    }
    setOcupado(false);
  };

  return (
    <section className="mb-7 flex flex-wrap items-center justify-between gap-4 bg-linho px-5 py-4" aria-live="polite">
      <div className="text-[13px]">
        {!s ? (
          "Consultando a varredura…"
        ) : s.erro ? (
          <span className="text-erro">{s.erro}</span>
        ) : !s.ligada ? (
          <span>
            <b className="font-semibold">Varredura desligada.</b> Falta na Vercel: {s.falta?.join(" e ")}.
          </span>
        ) : lendo ? (
          "Trazendo os anúncios…"
        ) : s.rodando ? (
          "Varrendo ZAP e Viva Real. Pode sair desta tela: o resultado entra sozinho quando você voltar."
        ) : (
          <>
            <b className="font-semibold">{s.ultima ? `Última varredura: ${brHora(s.ultima.inicio)}` : "Nenhuma varredura ainda"}</b>
            <span className="block text-cinza">Roda sozinha toda segunda às 5h. ZAP e Viva Real, a partir de R$ 1 milhão. Uso do mês: US$ {num(s.gasto ?? 0, 2)} de 5 gratuitos.</span>
            {s.falhou && <span className="block text-erro">A tentativa mais recente falhou.</span>}
          </>
        )}
      </div>
      <Botao tom="cheio" disabled={!s?.ligada || s.rodando || lendo || ocupado} onClick={varrer}>
        {s?.rodando ? "Varrendo…" : "Varrer agora"}
      </Botao>
    </section>
  );
}
