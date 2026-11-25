"use client";
import { ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";
import { Abas, Barras, Botao, Busca, Cabecalho, Cartao, Copiar, cx, Escolha, estiloBotao, Fita, Gaveta, Nota, Numero, Numeros, Selo, Vazio } from "@/componentes/ui";
import { useCarteira } from "@/componentes/uso";
import { notaAnuncio } from "@/lib/comercial";
import { brHora, hoje } from "@/lib/datas";
import { baixarArquivo, brl, csv, num, semAcento } from "@/lib/formato";
import { useSarto } from "@/lib/store";
import type { ImovelSite } from "@/lib/tipos";

type Linha = ImovelSite & { nota: ReturnType<typeof notaAnuncio> };
const tomNota = (n: number) => (n >= 75 ? "ok" : n >= 55 ? "alerta" : "erro") as "ok" | "alerta" | "erro";

export default function Carteira() {
  const { regras } = useSarto();
  const { carteira, atualizadoEm, carregando, erro } = useCarteira();
  const [aba, setAba] = useState<"graves" | "nota" | "todos">("graves");
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState("");
  const [op, setOp] = useState<"" | "venda" | "aluguel">("");
  const [ab, setAb] = useState<Linha | null>(null);
  const [lim, setLim] = useState(40);

  const linhas: Linha[] = useMemo(() => carteira.map((i) => ({ ...i, nota: notaAnuncio(i, regras) })), [carteira, regras]);
  const t = semAcento(q);
  const lista = linhas
    .filter((l) => (aba === "graves" ? l.nota.graves.length > 0 : aba === "nota" ? l.nota.total < 55 : true))
    .filter((l) => !tipo || l.tipo === tipo)
    .filter((l) => !op || l[op])
    .filter((l) => !t || semAcento(`${l.cod} ${l.titulo} ${l.bairro} ${l.cond}`).includes(t))
    .sort((a, b) => (aba === "todos" ? (b.venda ?? 0) - (a.venda ?? 0) : a.nota.total - b.nota.total));
  const tipos = [...new Set(carteira.map((c) => c.tipo))].sort();
  const media = linhas.length ? Math.round(linhas.reduce((a, l) => a + l.nota.total, 0) / linhas.length) : 0;
  const preco = linhas.filter((l) => l.precoNoTexto);
  const zap = linhas.filter((l) => l.fotosZap > 0).length;

  const problemas = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of linhas) for (const i of l.nota.itens) if (i.corrigir) m.set(i.nome, (m.get(i.nome) ?? 0) + 1);
    return [...m].map(([nome, valor]) => ({ nome, valor, rotulo: `${valor} anúncios` })).sort((a, b) => b.valor - a.valor);
  }, [linhas]);

  const resumo = useMemo(() => {
    const piores = linhas.filter((l) => l.nota.graves.length).sort((a, b) => a.nota.total - b.nota.total).slice(0, 15);
    return [
      `Anúncios para corrigir nesta semana (${linhas.filter((l) => l.nota.graves.length).length} com problema grave, nota média ${media}).`,
      "",
      ...piores.map((l) => `Cód. ${l.cod}, ${l.bairro ?? ""}: ${l.nota.graves.join("; ")}`),
    ].join("\n");
  }, [linhas, media]);

  const exportar = () =>
    baixarArquivo(
      `anuncios-${hoje()}.csv`,
      csv([
        ["Código", "Nota", "Problemas graves", "O que corrigir", "Título", "Tipo", "Bairro", "Venda", "Aluguel", "Fotos", "Fotos do WhatsApp", "Link"],
        ...lista.map((l) => [l.cod, l.nota.total, l.nota.graves.join("; "), l.nota.itens.filter((i) => i.corrigir).map((i) => i.corrigir).join("; "), l.titulo, l.tipo, l.bairro, l.venda, l.aluguel, l.fotos, l.fotosZap, l.url]),
      ]),
      "text/csv;charset=utf-8",
    );

  return (
    <>
      <Cabecalho area="COMERCIAL CARTEIRA" titulo="Carteira e nota dos anúncios" texto="Lê o site da Sarto toda segunda às 5h e aponta o que corrigir em cada anúncio antes da reunião das 9h.">
        <Copiar texto={resumo} pequeno={false}>
          Copiar resumo do Igor
        </Copiar>
        <Botao onClick={exportar}>Exportar planilha</Botao>
      </Cabecalho>

      {erro && <Nota tom="erro">Não consegui ler a carteira. Recarregue a página.</Nota>}
      {carregando && <p className="py-10 text-center text-cinza">Lendo a carteira…</p>}
      {!carregando && !erro && (
        <>
          <Numeros>
            <Numero valor={num(carteira.length)} nome="Imóveis no site" nota={atualizadoEm && `lido em ${brHora(atualizadoEm)}`} />
            <Numero valor={media} nome="Nota média" nota="de 0 a 100, critério próprio" />
            <Numero valor={preco.length} nome="Preço divergente" nota="texto diferente do anúncio" />
            <Numero valor={zap} nome="Com foto do WhatsApp" nota={`${num((zap / carteira.length) * 100)}% da carteira`} />
          </Numeros>

          <div className="mb-6 grid gap-5 lg:grid-cols-[1fr_1.1fr]">
            <Cartao titulo="O que mais derruba a nota">
              <Barras dados={problemas} />
            </Cartao>
            <Cartao titulo="Como a nota é feita" escuro>
              <p className="text-[13px] leading-relaxed text-papel/85">
                Fotos pelo mínimo do tipo (30), descrição (20), origem das fotos (15), dados preenchidos (15), título (10) e vídeo ou tour (10). Cada problema grave tira 5 pontos: preço divergente, menos de 5 fotos, descrição muito curta ou sem metragem.
              </p>
              <p className="mt-3 text-[13px] leading-relaxed text-papel/85">
                Não é a nota do Canal Pro. A oficial entra quando houver um usuário de leitura. Os mínimos de foto são provisórios, até o Igor confirmar em Configurações.
              </p>
            </Cartao>
          </div>

          <Abas
            atual={aba}
            onMuda={(a) => {
              setAba(a);
              setLim(40);
            }}
            itens={[
              { id: "graves", nome: "Problema grave", n: linhas.filter((l) => l.nota.graves.length).length },
              { id: "nota", nome: "Nota abaixo de 55", n: linhas.filter((l) => l.nota.total < 55).length },
              { id: "todos", nome: "Carteira inteira", n: linhas.length },
            ]}
          />
          <div className="mb-4 flex flex-wrap gap-3">
            <Busca valor={q} onMuda={setQ} placeholder="Código, bairro ou condomínio" />
            <Escolha rotulo="Tipo" valor={tipo} onMuda={setTipo} opcoes={[{ id: "", nome: "Todos os tipos" }, ...tipos.map((x) => ({ id: x, nome: x }))]} />
            <Escolha rotulo="Operação" valor={op} onMuda={setOp} opcoes={[{ id: "", nome: "Venda e locação" }, { id: "venda", nome: "Venda" }, { id: "aluguel", nome: "Locação" }]} />
          </div>

          {lista.length === 0 ? (
            <Vazio>Nenhum imóvel com esse filtro.</Vazio>
          ) : (
            <ul className="divide-y divide-linha border-y border-linha">
              {lista.slice(0, lim).map((l) => (
                <li key={l.cod}>
                  <button type="button" onClick={() => setAb(l)} className="flex w-full items-center gap-4 py-2.5 text-left hover:bg-linho">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {l.capa ? <img src={l.capa} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-16 w-20 shrink-0 bg-linho object-cover" /> : <span className="h-16 w-20 shrink-0 bg-linho" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{l.titulo}</span>
                      <span className="block truncate text-[13px] text-cinza">
                        Cód. {l.cod}, {l.tipo}, {l.bairro ?? "sem bairro"}
                      </span>
                      <span className="mt-0.5 block truncate text-[13px] text-erro">{l.nota.graves.join("; ")}</span>
                    </span>
                    <span className="hidden w-32 shrink-0 text-right tabular-nums sm:block">
                      {l.venda ? brl(l.venda, false) : ""}
                      {l.aluguel ? <span className="block text-[13px] text-cinza">{brl(l.aluguel, false)}/mês</span> : null}
                    </span>
                    <span className="w-14 shrink-0 text-right">
                      <Selo tom={tomNota(l.nota.total)}>{l.nota.total}</Selo>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {lista.length > lim && (
            <div className="mt-4 text-center">
              <Botao onClick={() => setLim(lim + 60)}>Mostrar mais ({lista.length - lim})</Botao>
            </div>
          )}
        </>
      )}

      <Gaveta
        aberta={!!ab}
        titulo={ab?.titulo ?? ""}
        sub={ab && `Cód. ${ab.cod}, ${ab.bairro ?? ""}`}
        onFecha={() => setAb(null)}
        rodape={
          ab && (
            <>
              <Copiar
                pequeno={false}
                texto={`Anúncio cód. ${ab.cod} (${ab.bairro ?? ""}), nota ${ab.nota.total}.\n\nCorrigir:\n${[...ab.nota.graves, ...ab.nota.itens.filter((i) => i.corrigir).map((i) => i.corrigir)].map((x) => `- ${x}`).join("\n")}\n\n${ab.url}`}
              >
                Copiar para o corretor
              </Copiar>
              <a className={estiloBotao("cheio")} href={ab.url} target="_blank" rel="noreferrer">
                <ExternalLink size={16} /> Ver no site
              </a>
            </>
          )
        }
      >
        {ab && (
          <div className="space-y-6">
            <div className="flex items-end gap-4">
              <span className="text-[56px] font-light leading-none tabular-nums">{ab.nota.total}</span>
              <span className="pb-1 text-cinza">de 100</span>
            </div>
            {ab.nota.graves.length > 0 && (
              <Nota tom="erro">
                {ab.nota.graves.map((g) => (
                  <p key={g}>{g}</p>
                ))}
              </Nota>
            )}
            <ul className="space-y-4">
              {ab.nota.itens.map((i) => (
                <li key={i.nome}>
                  <div className="mb-1 flex justify-between gap-3">
                    <span className="font-medium">{i.nome}</span>
                    <span className="tabular-nums text-cinza">
                      {i.pontos} de {i.max}
                    </span>
                  </div>
                  <Fita parte={i.pontos} total={i.max} />
                  <p className={cx("mt-1 text-[13px]", i.corrigir ? "text-carvao" : "text-cinza")}>{i.corrigir ?? "Está certo"}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Gaveta>
    </>
  );
}
