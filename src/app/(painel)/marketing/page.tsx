"use client";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { Formulario, type GrupoDef } from "@/componentes/formulario";
import { Abas, Botao, Cabecalho, Cartao, Colunas, Confirmar, Copiar, cx, Gaveta, Nota, Numero, Numeros, Selo, type Tom, Vazio, Tabela, Quadro } from "@/componentes/ui";
import { br, brComp, brCurto, competencia, DIAS, hoje, maisComp, maisDias, paraData, segundaDe } from "@/lib/datas";
import { brl, num, novoId } from "@/lib/formato";
import { pode, quemPode } from "@/lib/regras";
import { acao, useSarto } from "@/lib/store";
import type { MetricaMkt, Post } from "@/lib/tipos";

const TIPO: Record<Post["tipo"], string> = { imovel: "Imóvel", vendido: "Vendido", institucional: "Institucional", curiosidade: "Curiosidade", video: "Vídeo" };
const ST: Record<Post["status"], { nome: string; tom: Tom }> = {
  ideia: { nome: "Ideia", tom: "neutro" },
  producao: { nome: "Em produção", tom: "neutro" },
  aprovacao: { nome: "Para aprovar", tom: "alerta" },
  agendado: { nome: "Agendado", tom: "forte" },
  publicado: { nome: "Publicado", tom: "ok" },
};
const PAUTAS = [
  "Quanto custa registrar um imóvel em Goiás",
  "O que olhar na matrícula antes de comprar",
  "Diferença entre sinal e entrada",
  "Como funciona a vistoria de locação",
  "ITBI: quem paga e quando",
  "Por que exclusividade vende melhor",
  "Financiamento: o que o banco avalia no imóvel",
  "Documentos para alugar com seguro-fiança",
];

export default function Marketing() {
  const { dados, perfil } = useSarto();
  const { salvar, varios, remover, avisar, registrar, feito } = acao();
  const [seg, setSeg] = useState(segundaDe(hoje()));
  const [aba, setAba] = useState<"cronograma" | "resultado">("cronograma");
  const [ed, setEd] = useState<Post | null>(null);
  const [me, setMe] = useState<MetricaMkt | null>(null);
  const [apaga, setApaga] = useState(false);

  const dias = [0, 1, 2, 3, 4, 5, 6].map((n) => maisDias(seg, n));
  const fim = maisDias(seg, 6);
  const daSemana = dados.posts.filter((p) => p.data >= seg && p.data <= fim);
  const mes = dados.posts.filter((p) => p.data.startsWith(competencia(hoje())));
  const met = [...dados.metricas].sort((a, b) => a.comp.localeCompare(b.comp));
  const ult = met.at(-1);
  const ant = met.at(-2);

  /** Sugestão da semana com o que aconteceu: captações com foto aprovada e vendas */
  const montar = () => {
    const usados = new Set(dados.posts.map((p) => p.refId).filter(Boolean));
    const caps = dados.captacoes.filter((c) => (c.fotosAprovadas || c.etapa === "publicado") && !usados.has(c.id)).slice(0, 2);
    const vds = dados.vendas.filter((v) => v.etapa >= 6 && !usados.has(v.id)).slice(0, 2);
    const n = dados.posts.filter((p) => p.tipo === "curiosidade").length;
    const base = { status: "ideia" as const, legenda: "" };
    const ideias: Omit<Post, "data">[] = [
      ...caps.map((c) => ({ id: novoId(), tipo: "imovel" as const, titulo: c.titulo || c.bairro, refId: c.id, ...base })),
      ...vds.map((v) => ({ id: novoId(), tipo: "vendido" as const, titulo: v.imovel, refId: v.id, ...base })),
      { id: novoId(), tipo: "curiosidade" as const, titulo: PAUTAS[n % PAUTAS.length], ...base },
      { id: novoId(), tipo: "institucional" as const, titulo: "Institucional da semana", ...base },
    ];
    const livres = dias.filter((d) => paraData(d).getDay() !== 0 && d >= hoje() && !daSemana.some((p) => p.data === d));
    const novos = ideias.slice(0, livres.length).map((p, i) => ({ ...p, data: livres[i] }));
    if (!novos.length) return avisar("A semana já está completa", "erro");
    varios("posts", novos);
    registrar("Marketing", `montou cronograma com ${novos.length} posts`);
    avisar(`${novos.length} posts sugeridos`);
  };
  const pedidoSkill = (p: Post) => {
    const c = dados.captacoes.find((x) => x.id === p.refId);
    const v = dados.vendas.find((x) => x.id === p.refId);
    const d = c
      ? `Imóvel: ${c.titulo}. ${c.bairro}, ${c.condominioNome}. Valor ${brl(c.valor, false)}. ${c.area ? `${c.area} m² construídos. ` : ""}${c.terreno ? `${c.terreno} m² de terreno. ` : ""}${c.suites ? `${c.suites} suítes. ` : ""}${c.diferenciais.replace(/\n/g, ", ")}`
      : v
        ? `Imóvel vendido: ${v.imovel}.`
        : `Tema: ${p.titulo}.`;
    return `Use a skill da Sarto e faça um post de ${TIPO[p.tipo].toLowerCase()} (1080x1350).\n${d}\nVou anexar a foto. Quero a imagem e a legenda.`;
  };
  const textoJales = [
    `Cronograma de ${brCurto(seg)} a ${brCurto(fim)}`,
    "",
    ...dias.flatMap((d) =>
      daSemana.filter((p) => p.data === d).map((p) => `${DIAS[paraData(d).getDay()]} ${brCurto(d)}: ${TIPO[p.tipo]}, ${p.titulo} (${ST[p.status].nome.toLowerCase()})`),
    ),
  ].join("\n");

  const grupos: GrupoDef[] = [
    {
      grupo: "",
      campos: [
        { k: "titulo", nome: "Título", col: 6 },
        { k: "tipo", nome: "Tipo", tipo: "opcoes", col: 2, opcoes: Object.entries(TIPO).map(([id, nome]) => ({ id, nome })) },
        { k: "data", nome: "Data", tipo: "data", col: 2 },
        {
          k: "status",
          nome: "Situação",
          tipo: "opcoes",
          col: 2,
          opcoes: Object.entries(ST)
            .filter(([id]) => id !== "agendado" || ed?.aprovado || ed?.status === "agendado")
            .map(([id, s]) => ({ id, nome: s.nome })),
        },
        { k: "legenda", nome: "Legenda", tipo: "area", col: 6, linhas: 7 },
      ],
    },
  ];
  const delta = (k: keyof MetricaMkt) =>
    ult && ant ? `${(ult[k] as number) - (ant[k] as number) >= 0 ? "+" : ""}${num((ult[k] as number) - (ant[k] as number))} no mês` : undefined;

  return (
    <>
      <Cabecalho area="GESTÃO MARKETING" titulo="Marketing" texto="Cronograma da semana com captações e vendas. Arte e legenda saem no Claude, com a skill da Sarto.">
        <Copiar texto={textoJales} pequeno={false}>
          Copiar para o Jales
        </Copiar>
        <Botao onClick={montar}>Sugerir a semana</Botao>
        <Botao tom="cheio" onClick={() => setEd({ id: novoId(), data: hoje(), tipo: "imovel", titulo: "", status: "ideia", legenda: "" })}>
          <Plus size={16} /> Post
        </Botao>
      </Cabecalho>
      <Numeros>
        <Numero valor={mes.filter((p) => p.status === "publicado").length} nome="Publicados no mês" />
        <Numero valor={dados.posts.filter((p) => p.status === "aprovacao").length} nome="Para aprovar" />
        <Numero valor={ult ? num(ult.seguidores) : "—"} nome="Seguidores" nota={delta("seguidores")} />
        <Numero valor={ult ? num(ult.alcance) : "—"} nome="Alcance" nota={ult && brComp(ult.comp)} />
      </Numeros>
      <Abas
        atual={aba}
        onMuda={setAba}
        itens={[
          { id: "cronograma", nome: "Cronograma" },
          { id: "resultado", nome: "Resultado" },
        ]}
      />
      {aba === "cronograma" && (
        <>
          <div className="mb-4 flex items-center gap-2">
            <Botao pequeno aria-label="Semana anterior" onClick={() => setSeg(maisDias(seg, -7))}>
              <ChevronLeft size={16} />
            </Botao>
            <span className="min-w-40 text-center font-medium">
              {brCurto(seg)} a {brCurto(fim)}
            </span>
            <Botao pequeno aria-label="Próxima semana" onClick={() => setSeg(maisDias(seg, 7))}>
              <ChevronRight size={16} />
            </Botao>
          </div>
          <Quadro nome="Semana de posts">
            <div className="grid grid-cols-1 md:min-w-[920px] md:grid-cols-7 gap-px border border-linha bg-linha">
              {dias.map((d) => (
                <section key={d} className={cx("p-2.5 md:min-h-44", d === hoje() ? "bg-giz" : "bg-papel")}>
                  <h2 className="mb-2 flex items-baseline justify-between">
                    <span className="text-[13px]">{DIAS[paraData(d).getDay()]}</span>
                    <span className="text-[20px] font-light">{d.slice(8)}</span>
                  </h2>
                  <div className="space-y-1.5">
                    {daSemana
                      .filter((p) => p.data === d)
                      .map((p) => (
                        <button key={p.id} type="button" onClick={() => setEd(p)} className="block w-full bg-linho p-2 text-left text-[13px] leading-snug hover:bg-linha">
                          <span className="block text-[11px] uppercase text-cinza">{TIPO[p.tipo]}</span>
                          <span className="mb-1.5 block font-medium">{p.titulo}</span>
                          <Selo tom={ST[p.status].tom}>{ST[p.status].nome}</Selo>
                        </button>
                      ))}
                  </div>
                </section>
              ))}
            </div>
          </Quadro>
        </>
      )}
      {aba === "resultado" && (
        <div className="space-y-5">
          <Nota>Números digitados uma vez por mês, do painel do Instagram. A leitura automática entra com o acesso ao Instagram profissional e ao Meta Ads.</Nota>
          <div className="text-right">
            <Botao onClick={() => setMe({ id: novoId(), comp: maisComp(competencia(hoje()), -1), seguidores: 0, alcance: 0, interacoes: 0, investido: 0, leadsPagos: 0 })}>
              <Plus size={16} /> Lançar mês
            </Botao>
          </div>
          {met.length === 0 ? (
            <Vazio>Nenhum mês lançado.</Vazio>
          ) : (
            <>
              <div className="grid gap-5 lg:grid-cols-3">
                <Cartao titulo="Alcance">
                  <Colunas dados={met.slice(-6).map((m) => ({ nome: brComp(m.comp), valor: m.alcance }))} formato={num} />
                </Cartao>
                <Cartao titulo="Seguidores">
                  <Colunas dados={met.slice(-6).map((m) => ({ nome: brComp(m.comp), valor: m.seguidores }))} formato={num} />
                </Cartao>
                <Cartao titulo="Leads de anúncio">
                  <Colunas dados={met.slice(-6).map((m) => ({ nome: brComp(m.comp), valor: m.leadsPagos }))} formato={num} />
                </Cartao>
              </div>
              <Tabela className="md:min-w-[640px]">
                <thead>
                  <tr>
                    <th>Mês</th>
                    <th className="n">Seguidores</th>
                    <th className="n">Alcance</th>
                    <th className="n">Interações</th>
                    <th className="n">Investido</th>
                    <th className="n">Leads</th>
                    <th className="n">Custo por lead</th>
                  </tr>
                </thead>
                <tbody>
                  {[...met].reverse().map((m) => (
                    <tr key={m.id} className="clica">
                      <td>
                        <button type="button" className="font-medium hover:underline" onClick={() => setMe(m)}>
                          {brComp(m.comp)}
                        </button>
                      </td>
                      <td className="n">{num(m.seguidores)}</td>
                      <td className="n">{num(m.alcance)}</td>
                      <td className="n">{num(m.interacoes)}</td>
                      <td className="n">{brl(m.investido)}</td>
                      <td className="n">{num(m.leadsPagos)}</td>
                      <td className="n">{m.leadsPagos ? brl(m.investido / m.leadsPagos) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </Tabela>
            </>
          )}
        </div>
      )}

      <Gaveta
        aberta={!!ed}
        titulo={ed?.titulo || "Post"}
        sub={ed && `${TIPO[ed.tipo]}, ${br(ed.data)}`}
        onFecha={() => setEd(null)}
        rodape={
          ed && (
            <>
              {dados.posts.some((p) => p.id === ed.id) && (
                <Botao tom="texto" onClick={() => setApaga(true)}>
                  Excluir
                </Botao>
              )}
              {ed.status === "aprovacao" && (
                <Botao
                  disabled={!pode(perfil, "post")}
                  title={pode(perfil, "post") ? undefined : `Quem aprova: ${quemPode("post")}`}
                  onClick={() => {
                    salvar("posts", { ...ed, status: "agendado", aprovado: feito() });
                    registrar("Marketing", `aprovou o post ${ed.titulo}`);
                    avisar("Post aprovado");
                    setEd(null);
                  }}
                >
                  Aprovar
                </Botao>
              )}
              <Botao
                tom="cheio"
                disabled={!ed.titulo}
                onClick={() => {
                  salvar("posts", ed);
                  avisar("Post salvo");
                  setEd(null);
                }}
              >
                Salvar
              </Botao>
            </>
          )
        }
      >
        {ed && (
          <div className="space-y-5">
            <Formulario grupos={grupos} valor={ed} onMuda={setEd} />
            <div className="bg-linho p-4">
              <p className="mb-2 text-[13px]">Para a arte: copie o pedido, cole no Claude com a skill da Sarto ligada e anexe a foto.</p>
              <Copiar texto={pedidoSkill(ed)}>Copiar pedido para o Claude</Copiar>
            </div>
            {ed.aprovado && <p className="text-[13px] text-cinza">Aprovado por {ed.aprovado.por}.</p>}
          </div>
        )}
      </Gaveta>
      <Gaveta
        aberta={!!me}
        titulo="Resultado do mês"
        onFecha={() => setMe(null)}
        rodape={
          me && (
            <Botao
              tom="cheio"
              disabled={!/^\d{4}-\d{2}$/.test(me.comp)}
              onClick={() => {
                salvar("metricas", me);
                setMe(null);
              }}
            >
              Salvar
            </Botao>
          )
        }
      >
        {me && (
          <Formulario
            grupos={[
              {
                grupo: "",
                campos: [
                  { k: "comp", nome: "Mês (aaaa-mm)", col: 6 },
                  { k: "seguidores", nome: "Seguidores", tipo: "numero", col: 2 },
                  { k: "alcance", nome: "Alcance", tipo: "numero", col: 2 },
                  { k: "interacoes", nome: "Interações", tipo: "numero", col: 2 },
                  { k: "investido", nome: "Investido em anúncio", tipo: "dinheiro", col: 3 },
                  { k: "leadsPagos", nome: "Leads de anúncio", tipo: "numero", col: 3 },
                ],
              },
            ]}
            valor={me}
            onMuda={setMe}
          />
        )}
      </Gaveta>
      <Confirmar
        aberta={apaga}
        titulo="Excluir este post?"
        texto="Sai do cronograma do painel."
        sim="Excluir post"
        onNao={() => setApaga(false)}
        onSim={() => {
          if (ed) remover("posts", ed.id);
          setApaga(false);
          setEd(null);
        }}
      />
    </>
  );
}
