"use client";
import { ExternalLink, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BotaoFavorito, ColarCaptura } from "@/componentes/captura";
import { Formulario } from "@/componentes/formulario";
import { Abas, Botao, Busca, Cabecalho, Cartao, Copiar, Escolha, estiloBotao, Gaveta, ListaInfo, Nota, Numero, Numeros, Selo, Vazio } from "@/componentes/ui";
import { useCarteira, useParam } from "@/componentes/uso";
import { type Captura, notasDaCaptura } from "@/lib/captura";
import { br, brHora, hoje } from "@/lib/datas";
import { baixarArquivo, brl, csv, num, semAcento } from "@/lib/formato";
import { idNota, juntarNotas, lerNotas, mostrarNota, porImovel, type ResumoNota } from "@/lib/notas";
import { type LeituraCanal, type LinhaPresenca, type Presenca, presencaNosPortais } from "@/lib/portais";
import { linkSeguro } from "@/lib/protecao";
import { lerArquivo, type Linha } from "@/lib/planilha";
import { acao, useSarto } from "@/lib/store";
import type { ImovelSite, NotaPortal } from "@/lib/tipos";

type Item = { cod: string; im: ImovelSite | null; r: ResumoNota | null };
type Aba = "portais" | "atencao" | "nota" | "preco" | "todos";
const NOME_PRESENCA: Record<Presenca, string> = {
  publicado: "Publicado",
  bloqueado: "Bloqueado",
  nao_publicado: "Não publicado",
  processando: "Em processamento",
  fora_do_canal: "Fora do Canal Pro",
  so_no_canal: "Só no Canal Pro",
  sem_leitura: "Sem leitura",
};

export default function Carteira() {
  const { dados } = useSarto();
  const { avisar, registrar, salvar, remover } = acao();
  const { carteira, atualizadoEm, carregando, erro } = useCarteira();
  const [canal, setCanal] = useState<LeituraCanal | null>(null);
  useEffect(() => {
    let vivo = true;
    fetch("/api/canalpro", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => vivo && setCanal(j?.leitura ?? null))
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, []);
  // a nota do robô vale como a do Canal Pro; o que foi colado à mão continua
  const notas = useMemo(() => {
    if (!canal) return dados.notas;
    const doRobo = canal.anuncios.map((a) => ({
      id: idNota(a.cod, "Canal Pro"),
      cod: a.cod,
      portal: "Canal Pro",
      nota: a.nota,
      motivo: a.situacao === "publicado" ? "" : a.motivo || "Fora do ar",
      em: canal.coletadoEm.slice(0, 10),
    }));
    const ids = new Set(doRobo.map((n) => n.id));
    return [...dados.notas.filter((n) => !ids.has(n.id)), ...doRobo];
  }, [dados.notas, canal]);
  const presenca = useMemo(() => presencaNosPortais(carteira, canal), [carteira, canal]);
  const problemas = presenca.filter((p) => p.problema).sort((a, b) => Number(b.grave) - Number(a.grave));
  const pa = useParam("aba") as Aba | null;
  const [aba, setAba] = useState<Aba>(pa ?? "portais");
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState("");
  const [op, setOp] = useState<"" | "venda" | "aluguel">("");
  const [ab, setAb] = useState<Item | null>(null);
  const [lim, setLim] = useState(40);
  const [novo, setNovo] = useState<{ portal: string; nota: number; motivo: string }>({ portal: "Canal Pro", nota: 0, motivo: "" });

  const itens: Item[] = useMemo(() => {
    const m = porImovel(notas);
    const site = carteira.map((im): Item => ({ cod: im.cod, im, r: m.get(im.cod.toUpperCase()) ?? null }));
    const tem = new Set(carteira.map((i) => i.cod.toUpperCase()));
    // o portal pode ter imóvel que não está no site
    const fora = [...m].filter(([c]) => !tem.has(c)).map(([cod, r]): Item => ({ cod, im: null, r }));
    return [...site, ...fora];
  }, [carteira, notas]);

  const comNota = itens.filter((i) => i.r?.nota != null);
  const atencao = itens.filter((i) => i.r?.atencao.length);
  const preco = itens.filter((i) => i.im?.precoNoTexto);
  const media = comNota.length ? comNota.reduce((a, i) => a + (i.r?.nota ?? 0), 0) / comNota.length : null;
  const t = semAcento(q);
  const base: Record<Aba, Item[]> = {
    portais: [],
    atencao,
    nota: [...comNota].sort((a, b) => (a.r?.nota ?? 0) - (b.r?.nota ?? 0)),
    preco,
    todos: [...itens].sort((a, b) => (b.im?.venda ?? 0) - (a.im?.venda ?? 0)),
  };
  const lista = base[aba]
    .filter((i) => !tipo || i.im?.tipo === tipo)
    .filter((i) => !op || i.im?.[op])
    .filter((i) => !t || semAcento(`${i.cod} ${i.im?.titulo ?? ""} ${i.im?.bairro ?? ""} ${i.im?.cond ?? ""}`).includes(t));
  const tipos = [...new Set(carteira.map((c) => c.tipo))].sort();

  const guardar = (novas: NotaPortal[], de: string) => {
    if (!novas.length) return avisar("Não achei coluna de código com nota ou alerta neste arquivo", "erro");
    const s = useSarto.getState();
    useSarto.setState({ dados: { ...s.dados, notas: juntarNotas(s.dados.notas, novas) } });
    registrar("Carteira", `recebeu ${novas.length} ${novas.length === 1 ? "nota ou alerta" : "notas ou alertas"} de ${de}`);
    avisar(`${novas.length} ${novas.length === 1 ? "imóvel atualizado" : "imóveis atualizados"}`);
    setAba(novas.some((n) => n.nota != null) ? "nota" : "atencao");
  };
  const importar = async (f?: File) => {
    if (!f) return;
    try {
      guardar(lerNotas((await lerArquivo(f)) as Linha[], /jetimob/i.test(f.name) ? "Jetimob" : "Canal Pro", hoje()), f.name);
    } catch {
      avisar("Não consegui abrir o arquivo. Use .xlsx ou .csv.", "erro");
    }
  };
  const colar = (c: Captura) => {
    const novas = notasDaCaptura(c, hoje());
    if (!/jetimob/.test(c.host)) return avisar("Esta captura é de um portal. Cole em Varredura.", "erro");
    // o que estava em alerta neste portal e não veio agora foi resolvido
    const portal = novas[0]?.portal;
    const vivos = new Set(novas.map((n) => n.id));
    for (const n of notas) if (portal && n.portal === portal && n.motivo && !vivos.has(n.id)) n.nota == null ? remover("notas", n.id) : salvar("notas", { ...n, motivo: "" });
    guardar(novas, "Jetimob");
  };

  const resumo = [
    `Anúncios para corrigir (${br(hoje())})`,
    ...(atencao.length
      ? [
          "",
          "Requer atenção no Jetimob:",
          ...atencao.slice(0, 20).map((i) => `- ${i.cod}${i.im?.bairro ? `, ${i.im.bairro}` : ""}: ${i.r?.atencao.map((a) => a.motivo).join("; ")}`),
        ]
      : []),
    ...(comNota.length
      ? [
          "",
          "Menores notas:",
          ...base.nota
            .slice(0, 15)
            .map(
              (i) =>
                `- ${i.cod}${i.im?.bairro ? `, ${i.im.bairro}` : ""}: nota ${mostrarNota(i.r?.nota ?? 0)}${i.r?.atencao.length ? ` (${i.r.atencao.map((a) => a.motivo).join("; ")})` : ""}`,
            ),
        ]
      : []),
    ...(preco.length
      ? [
          "",
          `Preço do texto diferente do cadastro: ${preco.length}`,
          ...preco.slice(0, 10).map((i) => `- ${i.cod}: cadastro ${brl(i.im?.venda ?? i.im?.aluguel, false)}, texto ${brl(i.im?.precoNoTexto, false)}`),
        ]
      : []),
  ].join("\n");

  const exportar = () =>
    baixarArquivo(
      `carteira-${hoje()}.csv`,
      csv([
        ["Código", "Nota", "Portal", "Atenção", "Título", "Tipo", "Bairro", "Venda", "Aluguel", "Preço no texto", "Link"],
        ...lista.map((i) => [
          i.cod,
          i.r?.nota ?? "",
          i.r?.todas.map((n) => n.portal).join(", "),
          i.r?.atencao.map((a) => a.motivo).join("; "),
          i.im?.titulo,
          i.im?.tipo,
          i.im?.bairro,
          i.im?.venda,
          i.im?.aluguel,
          i.im?.precoNoTexto,
          i.im?.url,
        ]),
      ]),
      "text/csv;charset=utf-8",
    );
  const atual = ab && (itens.find((i) => i.cod === ab.cod) ?? ab);

  return (
    <>
      <Cabecalho area="COMERCIAL CARTEIRA" titulo="Carteira e nota dos anúncios" texto="A nota e os alertas vêm do Canal Pro e do Jetimob. O painel não calcula nota própria.">
        <label className={estiloBotao()}>
          <Upload size={16} /> Importar nota
          <input
            type="file"
            accept=".xlsx,.csv,.json"
            className="sr-only"
            onChange={(e) => {
              importar(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        <ColarCaptura onLer={colar}>Colar alerta do Jetimob</ColarCaptura>
        <Copiar texto={resumo} pequeno={false}>
          Copiar resumo do Igor
        </Copiar>
      </Cabecalho>

      {erro && <Nota tom="erro">Não consegui ler a carteira. Recarregue a página.</Nota>}
      {carregando && <p className="py-10 text-center text-cinza">Lendo a carteira…</p>}
      {!carregando && !erro && (
        <>
          <Numeros>
            <Numero valor={num(carteira.length)} nome="Imóveis no site" nota={atualizadoEm && `lido em ${brHora(atualizadoEm)}`} />
            <Numero valor={media == null ? "—" : mostrarNota(media)} nome="Nota média" nota={comNota.length ? `${comNota.length} com nota` : "nenhuma nota recebida"} />
            <Numero valor={atencao.length} nome="Requer atenção" nota="Jetimob e Canal Pro" />
            <Numero valor={preco.length} nome="Preço divergente" nota="texto diferente do cadastro" />
          </Numeros>

          <details className="mb-7 bg-linho" open={notas.length === 0}>
            <summary className="px-5 py-4 text-[13px] font-semibold uppercase tracking-wide">Como a nota chega aqui</summary>
            <div className="grid gap-6 px-5 pb-5 lg:grid-cols-2">
              <div className="text-[13px] leading-relaxed">
                <h3 className="mb-1 font-semibold">Jetimob: requer atenção</h3>
                <p>O Jetimob não dá nota por imóvel: nem na API (90 campos, versão 6), nem nas telas. Ele marca o anúncio que requer atenção e diz o motivo, em Portais.</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5">
                  <li>Arraste o botão abaixo para a barra de favoritos, uma vez só.</li>
                  <li>No Jetimob, abra Portais, entre no portal e filtre Requer atenção: Sim.</li>
                  <li>Clique no favorito, em Copiar para o painel, e depois em Colar alerta do Jetimob.</li>
                </ol>
                <div className="mt-3">
                  <BotaoFavorito />
                </div>
              </div>
              <div className="text-[13px] leading-relaxed">
                <h3 className="mb-1 font-semibold">Canal Pro: nota de qualidade</h3>
                <p>
                  A nota que o ZAP, o Viva Real e a OLX usam fica no Canal Pro. Exporte o relatório de anúncios de lá e use Importar nota: o arquivo precisa ter uma coluna de
                  código e uma de nota ou qualidade (.xlsx ou .csv).
                </p>
                <p className="mt-2">
                  A cada importação o painel guarda a nota anterior e mostra quem subiu e quem caiu. Também dá para digitar a nota de um imóvel, abrindo-o na lista.
                </p>
              </div>
            </div>
          </details>

          <Abas
            atual={aba}
            onMuda={(a) => {
              setAba(a);
              setLim(40);
            }}
            itens={[
              { id: "portais", nome: "Nos portais", n: problemas.length },
              { id: "atencao", nome: "Requer atenção", n: atencao.length },
              { id: "nota", nome: "Menor nota primeiro", n: comNota.length },
              { id: "preco", nome: "Preço divergente", n: preco.length },
              { id: "todos", nome: "Carteira inteira", n: itens.length },
            ]}
          />
          <div className="mb-4 flex flex-wrap gap-3">
            <Busca valor={q} onMuda={setQ} placeholder="Código, bairro ou condomínio" />
            <Escolha rotulo="Tipo" valor={tipo} onMuda={setTipo} opcoes={[{ id: "", nome: "Todos os tipos" }, ...tipos.map((x) => ({ id: x, nome: x }))]} />
            <Escolha
              rotulo="Operação"
              valor={op}
              onMuda={setOp}
              opcoes={[
                { id: "", nome: "Venda e locação" },
                { id: "venda", nome: "Venda" },
                { id: "aluguel", nome: "Locação" },
              ]}
            />
            <Botao onClick={exportar}>Exportar</Botao>
          </div>

          {aba === "portais" ? (
            <NosPortais
              linhas={problemas
                .filter((p) => !t || semAcento(`${p.cod} ${p.im?.titulo ?? ""} ${p.im?.bairro ?? ""} ${p.im?.cond ?? ""}`).includes(t))
                .filter((p) => !tipo || p.im?.tipo === tipo)}
              todas={presenca}
              canal={canal}
            />
          ) : lista.length === 0 ? (
            <Vazio>
              {aba === "atencao"
                ? "Nenhum alerta do Jetimob colado ainda."
                : aba === "nota"
                  ? "Nenhuma nota recebida. Importe o relatório do Canal Pro."
                  : "Nenhum imóvel com esse filtro."}
            </Vazio>
          ) : (
            <ul className="divide-y divide-linha border-y border-linha">
              {lista.slice(0, lim).map((i) => (
                <li key={i.cod}>
                  <button type="button" onClick={() => setAb(i)} className="flex w-full items-center gap-4 py-2.5 text-left hover:bg-linho">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {i.im?.capa ? (
                      <img src={i.im.capa} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-16 w-20 shrink-0 bg-linho object-cover" />
                    ) : (
                      <span className="h-16 w-20 shrink-0 bg-linho" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{i.im?.titulo ?? `Imóvel ${i.cod}`}</span>
                      <span className="block truncate text-[13px] text-cinza">{i.im ? `Cód. ${i.cod}, ${i.im.tipo}, ${i.im.bairro ?? "sem bairro"}` : "Fora do site"}</span>
                      {i.r?.atencao.map((a) => (
                        <span key={a.id} className="mt-0.5 block truncate text-[13px] text-erro">
                          {a.motivo}
                        </span>
                      ))}
                      {aba === "preco" && i.im?.precoNoTexto && (
                        <span className="mt-0.5 block truncate text-[13px] text-erro">
                          Cadastro {brl(i.im.venda ?? i.im.aluguel, false)}, texto {brl(i.im.precoNoTexto, false)}
                        </span>
                      )}
                    </span>
                    <span className="hidden w-32 shrink-0 text-right tabular-nums sm:block">
                      {i.im?.venda ? brl(i.im.venda, false) : ""}
                      {i.im?.aluguel ? <span className="block text-[13px] text-cinza">{brl(i.im.aluguel, false)}/mês</span> : null}
                    </span>
                    <span className="w-20 shrink-0 text-right">
                      {i.r?.nota != null ? (
                        <>
                          <span className="block text-[22px] font-light leading-none tabular-nums">{mostrarNota(i.r.nota)}</span>
                          {i.r.anterior != null && <span className="text-[12px] text-cinza">era {mostrarNota(i.r.anterior)}</span>}
                        </>
                      ) : i.r?.atencao.length ? (
                        <Selo tom="alerta">Atenção</Selo>
                      ) : (
                        <span className="text-[12px] text-cinza">sem nota</span>
                      )}
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
        aberta={!!atual}
        titulo={atual?.im?.titulo ?? (atual ? `Imóvel ${atual.cod}` : "")}
        sub={atual && `Cód. ${atual.cod}${atual.im?.bairro ? `, ${atual.im.bairro}` : ""}`}
        onFecha={() => setAb(null)}
        rodape={
          atual && (
            <>
              <a className={estiloBotao()} href={`https://app.jetimob.com/imoveis/${encodeURIComponent(atual.cod)}/editar`} target="_blank" rel="noreferrer">
                Editar no Jetimob
              </a>
              {atual.im && (
                <a className={estiloBotao("cheio")} href={atual.im.url} target="_blank" rel="noreferrer">
                  <ExternalLink size={16} /> Ver no site
                </a>
              )}
            </>
          )
        }
      >
        {atual && (
          <div className="space-y-7">
            {atual.r && atual.r.todas.length > 0 ? (
              <ul className="divide-y divide-linha border-y border-linha">
                {atual.r.todas.map((n) => (
                  <li key={n.id} className="flex items-start justify-between gap-4 py-3">
                    <span>
                      <span className="block font-medium">{n.portal}</span>
                      <span className="block text-[13px] text-cinza">{n.motivo || "Sem alerta"}</span>
                      <span className="block text-[12px] text-cinza">recebido em {br(n.em)}</span>
                    </span>
                    <span className="text-right">
                      <span className="block text-[26px] font-light leading-none tabular-nums">{n.nota == null ? "—" : mostrarNota(n.nota)}</span>
                      {n.anterior != null && <span className="block text-[12px] text-cinza">era {mostrarNota(n.anterior)}</span>}
                      <button type="button" className="text-[12px] text-cinza underline" onClick={() => remover("notas", n.id)}>
                        Remover
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <Nota>Nenhuma nota recebida para este imóvel.</Nota>
            )}
            {atual.im?.precoNoTexto && (
              <Nota tom="erro">
                O cadastro diz {brl(atual.im.venda ?? atual.im.aluguel, false)} e o texto do anúncio diz {brl(atual.im.precoNoTexto, false)}.
              </Nota>
            )}
            <Cartao titulo="Digitar nota ou alerta">
              <Formulario
                grupos={[
                  {
                    grupo: "",
                    campos: [
                      { k: "portal", nome: "De onde veio", tipo: "opcoes", opcoes: ["Canal Pro", "Canal Pro (Jetimob)", "62imóveis", "Site"], col: 4 },
                      { k: "nota", nome: "Nota", tipo: "numero", col: 2 },
                      { k: "motivo", nome: "O que o portal pede para corrigir", col: 6 },
                    ],
                  },
                ]}
                valor={novo}
                onMuda={setNovo}
              />
              <Botao
                className="mt-3"
                pequeno
                disabled={!novo.nota && !novo.motivo.trim()}
                onClick={() => {
                  const n: NotaPortal = {
                    id: idNota(atual.cod, novo.portal),
                    cod: atual.cod,
                    portal: novo.portal,
                    nota: novo.nota || null,
                    motivo: novo.motivo.trim(),
                    em: hoje(),
                  };
                  guardar([n], "digitação");
                  setNovo({ ...novo, nota: 0, motivo: "" });
                }}
              >
                Guardar
              </Botao>
            </Cartao>
            {atual.im && (
              <ListaInfo
                itens={[
                  ["Tipo", atual.im.tipo],
                  ["Venda", brl(atual.im.venda, false)],
                  ["Aluguel", brl(atual.im.aluguel, false)],
                  ["Área", atual.im.area ? `${num(atual.im.area)} m²` : ""],
                  ["Terreno", atual.im.terreno ? `${num(atual.im.terreno)} m²` : ""],
                  ["Quartos", atual.im.quartos ?? atual.im.suites],
                  ["Fotos", atual.im.fotos],
                  ["Exclusivo", atual.im.excl ? "Sim" : "Não"],
                ]}
              />
            )}
          </div>
        )}
      </Gaveta>
    </>
  );
}

const ORDEM: Presenca[] = ["bloqueado", "nao_publicado", "fora_do_canal", "processando", "publicado", "so_no_canal", "sem_leitura"];

/** Quais imóveis do site estão fora dos portais, por quê, e o que fazer */
function NosPortais({ linhas, todas, canal }: { linhas: LinhaPresenca[]; todas: LinhaPresenca[]; canal: LeituraCanal | null }) {
  const conta = (p: Presenca) => todas.filter((x) => x.presenca === p).length;
  return (
    <div>
      {canal ? (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Publicados", conta("publicado")],
            ["Bloqueados ou sem publicar", conta("bloqueado") + conta("nao_publicado")],
            ["Fora do Canal Pro", conta("fora_do_canal")],
            ["Só no Canal Pro", conta("so_no_canal")],
          ].map(([n, v]) => (
            <div key={n as string} className="rounded-2xl bg-linho p-4">
              <span className="block text-[26px] font-light leading-none tabular-nums">{v}</span>
              <span className="mt-1.5 block text-[13px]">{n}</span>
            </div>
          ))}
          <p className="col-span-full text-[12px] text-cinza">Leitura do Canal Pro de {brHora(canal.coletadoEm)}, feita pelo robô do computador da Sarto.</p>
        </div>
      ) : (
        <div className="mb-5">
          <Nota tom="alerta">
            Ainda sem leitura do Canal Pro. Quando o robô rodar no computador da Sarto, esta aba mostra o que está publicado, bloqueado ou fora do Canal Pro, com o motivo. Por
            enquanto, só o que o site já mostra.
          </Nota>
        </div>
      )}
      {linhas.length === 0 ? (
        <Vazio>Nenhum problema com esse filtro.</Vazio>
      ) : (
        <ul className="divide-y divide-linha border-y border-linha">
          {[...linhas]
            .sort((a, b) => ORDEM.indexOf(a.presenca) - ORDEM.indexOf(b.presenca))
            .map((p) => {
              const site = linkSeguro(p.im?.url);
              return (
                <li key={p.cod} className="flex flex-wrap items-start gap-x-4 gap-y-2 py-3">
                  <Selo tom={p.grave ? "erro" : "alerta"}>{NOME_PRESENCA[p.presenca]}</Selo>
                  <span className="min-w-0 flex-1 basis-60">
                    <span className="block font-medium">
                      Cód. {p.cod}
                      {p.im ? ` · ${p.im.tipo}, ${p.im.cond || p.im.bairro || "sem bairro"}` : ""}
                      {p.canal?.nota != null ? ` · nota ${mostrarNota(p.canal.nota)}` : ""}
                    </span>
                    <span className="block text-[13px] text-cinza">{p.problema}</span>
                    {p.fazer && <span className="block text-[13px]">→ {p.fazer}</span>}
                  </span>
                  <span className="flex gap-2">
                    <a className={estiloBotao("linha", true)} href={`https://app.jetimob.com/imoveis/${encodeURIComponent(p.cod)}/editar`} target="_blank" rel="noreferrer">
                      Jetimob
                    </a>
                    {site && (
                      <a className={estiloBotao("linha", true)} href={site} target="_blank" rel="noreferrer">
                        Site
                      </a>
                    )}
                  </span>
                </li>
              );
            })}
        </ul>
      )}
    </div>
  );
}
