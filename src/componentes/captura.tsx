"use client";
import { Bookmark } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { type Captura, favorito, lerCaptura } from "@/lib/captura";
import { acao } from "@/lib/store";
import { Botao, cx, estiloBotao, Gaveta } from "./ui";

/** O React bloqueia endereço javascript: no JSX, então ele entra direto no elemento. */
export function BotaoFavorito({ escuro }: { escuro?: boolean }) {
  const r = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    r.current?.setAttribute("href", favorito());
  }, []);
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: idem
    // biome-ignore lint/a11y/noStaticElementInteractions: idem
    <a
      ref={r}
      draggable
      className={cx(estiloBotao("linha", true), escuro && "border-papel hover:bg-papel hover:text-carvao", "cursor-grab")}
      // biome-ignore lint/a11y/useValidAnchor: favorito para arrastar; o endereço entra pelo efeito
      onClick={(e) => {
        e.preventDefault();
        acao().avisar("Arraste este botão para a barra de favoritos (Ctrl+Shift+B mostra a barra)", "erro");
      }}
    >
      <Bookmark size={14} /> Capturar para a Sarto
    </a>
  );
}

export function ColarCaptura({ onLer, children = "Colar captura", tom = "linha" }: { onLer: (c: Captura) => void; children?: React.ReactNode; tom?: "linha" | "cheio" }) {
  const [ab, setAb] = useState(false);
  const [t, setT] = useState("");
  const usar = (texto: string) => {
    const c = lerCaptura(texto);
    if (!c) return acao().avisar("Isso não é uma captura. Clique no favorito na página do portal e depois em Copiar.", "erro");
    onLer(c);
    setT("");
    setAb(false);
  };
  return (
    <>
      <Botao
        tom={tom}
        onClick={async () => {
          try {
            const c = lerCaptura(await navigator.clipboard.readText());
            if (c) return onLer(c);
          } catch {}
          setAb(true);
        }}
      >
        {children}
      </Botao>
      <Gaveta
        aberta={ab}
        titulo="Colar captura"
        onFecha={() => setAb(false)}
        rodape={
          <Botao tom="cheio" disabled={!t.trim()} onClick={() => usar(t)}>
            Ler captura
          </Botao>
        }
      >
        <p className="mb-3 text-cinza">O navegador não liberou a leitura automática. Cole aqui com Ctrl+V o que o favorito copiou.</p>
        <textarea className="campo min-h-48" value={t} onChange={(e) => setT(e.target.value)} aria-label="Captura copiada" />
      </Gaveta>
    </>
  );
}
