"use client";
import { KeyRound, Tag } from "lucide-react";
import { captacaoDoAnuncio } from "@/lib/comercial";
import { hoje } from "@/lib/datas";
import { acao, useSarto } from "@/lib/store";
import type { Anuncio, Captacao } from "@/lib/tipos";
import { Botao } from "./ui";

/** Cria a captação a partir do anúncio, ou devolve a que já existe para o mesmo anúncio */
function captarAnuncio(a: Anuncio, finalidade: Captacao["finalidade"]): Captacao {
  const st = useSarto.getState();
  const ja = a.url ? st.dados.captacoes.find((c) => c.anuncioUrl === a.url && c.finalidade === finalidade) : undefined;
  if (ja) return ja;
  const c = captacaoDoAnuncio(a, finalidade, hoje());
  acao().salvar("captacoes", c);
  if (a.status === "abordar") acao().mudar("anuncios", a.id, { status: "captado" });
  acao().registrar("Captação", `trouxe da varredura "${a.titulo}" para ${finalidade === "venda" ? "venda" : "locação"}`);
  return c;
}

/** Dois botões: o mais provável primeiro, pelo negócio do anúncio */
export function BotoesCaptar({ a, onCaptou }: { a: Anuncio; onCaptou: (c: Captacao) => void }) {
  const aluguel = a.negocio === "aluguel";
  const venda = (
    <Botao key="v" tom={aluguel ? "linha" : "cheio"} pequeno onClick={() => onCaptou(captarAnuncio(a, "venda"))}>
      <Tag size={14} aria-hidden /> Captar para venda
    </Botao>
  );
  const locacao = (
    <Botao key="l" tom={aluguel ? "cheio" : "linha"} pequeno onClick={() => onCaptou(captarAnuncio(a, "locacao"))}>
      <KeyRound size={14} aria-hidden /> Captar para locação
    </Botao>
  );
  return <>{aluguel ? [locacao, venda] : [venda, locacao]}</>;
}
