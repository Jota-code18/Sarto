"use client";
import { ExternalLink, MessageCircle, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Coleta } from "@/componentes/coleta";
import { Formulario, type GrupoDef } from "@/componentes/formulario";
import {
  Abas,
  Barras,
  Botao,
  Busca,
  Cabecalho,
  Cartao,
  Confirmar,
  Copiar,
  cx,
  Escolha,
  estiloBotao,
  Gaveta,
  ListaInfo,
  Nota,
  Numero,
  Numeros,
  Selo,
  Vazio,
} from "@/componentes/ui";
import { useCarteira } from "@/componentes/uso";
import { br, diasEntre, hoje, prazo, segundaDe } from "@/lib/datas";
import { baixarArquivo, brl, csv, linkWhats, novoId, num, semAcento } from "@/lib/formato";
import { acao, useSarto } from "@/lib/store";
import type { Anuncio } from "@/lib/tipos";
import { type Grupo, montarGrupos } from "@/lib/varredura";

const PORTAIS = ["ZAP Imóveis", "Viva Real", "OLX", "62imóveis"];
const STATUS: Record<Anuncio["status"], string> = { abordar: "Abordar", contatado: "Contatado", captado: "Captado", descartado: "Descartado" };
type Aba = "abordar" | "andamento" | "sarto" | "fora";

const novoAnuncio = (): Anuncio => ({
  id: novoId(),
  portal: PORTAIS[0],
  url: "",
  titulo: "",
  tipo: "",
  bairro: "",
  cidade: "Anápolis",
  preco: 0,
  precoAnterior: 0,
  area: 0,
  quartos: 0,
  anunciante: "",
  codAnunciante: "",
  particular: false,
  primeiraVez: hoje(),
  vistoEm: hoje(),
  status: "abordar",
  obs: "",
});
const GRUPOS: GrupoDef[] = [
  {
    grupo: "",
    campos: [
      { k: "portal", nome: "Portal", tipo: "opcoes", opcoes: PORTAIS, col: 3 },
      { k: "tipo", nome: "Tipo", tipo: "opcoes", opcoes: ["Casa", "Casa em condomínio", "Sobrado", "Apartamento", "Cobertura", "Lote", "Comercial", "Rural"], col: 3 },
      { k: "url", nome: "Link do anúncio", col: 6 },
      { k: "titulo", nome: "Título", col: 6, obrigatorio: true },
      { k: "bairro", nome: "Bairro ou condomínio", col: 4 },
      { k: "cidade", nome: "Cidade", col: 2 },
      { k: "preco", nome: "Preço", tipo: "dinheiro", col: 3 },
      { k: "precoAnterior", nome: "Preço anterior", tipo: "dinheiro", col: 3 },
      { k: "area", nome: "Área (m²)", tipo: "numero", col: 2 },
      { k: "quartos", nome: "Quartos", tipo: "numero", col: 2 },
      { k: "publicadoEm", nome: "Publicado em", tipo: "data", col: 2 },
      { k: "anunciante", nome: "Anunciante", col: 4 },
      { k: "particular", nome: "É o dono", tipo: "sim", col: 2 },
    ],
  },
];

export default function Varredura() {
  const { dados, regras } = useSarto();
  const { salvar, avisar, mudar, registrar, remover } = acao();
  const { carteira } = useCarteira();
  const [aba, setAba] = useState<Aba>("abordar");
  const [filtro, setFiltro] = useState<"" | "novo" | "dono" | "baixou" | "parado">("");
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState("");
  const [ver, setVer] = useState<string | null>(null);
  const [ed, setEd] = useState<Anuncio | null>(null);
  const [limpa, setLimpa] = useState(false);
  const [lim, setLim] = useState(50);

  const grupos = useMemo(() => montarGrupos(dados.anuncios, carteira, regras), [dados.anuncios, carteira, regras]);
  const st = (g: Grupo) => [g.principal, ...g.outros].find((a) => a.status !== "abordar")?.status ?? "abordar";
  const por: Record<Aba, Grupo[]> = {
    abordar: grupos.filter((g) => st(g) === "abordar" && g.noPadrao && !g.sarto),
    andamento: grupos.filter((g) => st(g) !== "abordar"),
    sarto: grupos.filter((g) => g.sarto && st(g) === "abordar"),
    fora: grupos.filter((g) => !g.sarto && !g.noPadrao && st(g) === "abordar"),
  };
  const t = semAcento(q);
  const lista = por[aba]
    .filter((g) => (filtro === "novo" ? g.novo : filtro === "dono" ? g.particular : filtro === "baixou" ? g.baixou > 0 : filtro === "parado" ? g.parado >= 90 : true))
    .filter((g) => !tipo || g.principal.tipo === tipo)
    .filter((g) => !t || semAcento([g.principal, ...g.outros].map((a) => `${a.titulo} ${a.bairro} ${a.anunciante}`).join(" ")).includes(t));
  const tipos = [...new Set(dados.anuncios.map((a) => a.tipo).filter(Boolean))].sort();
  const bairros = [...por.abordar.reduce((m, g) => m.set(g.principal.bairro || "Sem bairro", (m.get(g.principal.bairro || "Sem bairro") ?? 0) + 1), new Map<string, number>())]
    .map(([nome, valor]) => ({ nome, valor }))
    .sort((a, b) => b.valor - a.valor);
  const ultima = dados.anuncios
    .map((a) => a.vistoEm)
    .sort()
    .at(-1);
  const g = grupos.find((x) => x.id === ver);

  const marcar = (gr: Grupo, status: Anuncio["status"]) => {
    for (const a of [gr.principal, ...gr.outros]) mudar("anuncios", a.id, { status });
    registrar("Varredura", `marcou "${gr.principal.titulo}" como ${STATUS[status].toLowerCase()}`);
  };
  const captar = (gr: Grupo) => {
    const a = gr.principal;
    const id = novoId();
    salvar("captacoes", {
      id,
      codigo: "",
      tipo: /condom/i.test(a.tipo)
        ? "condominio"
        : /apart|cobert/i.test(a.tipo)
          ? "apartamento"
          : /lote/i.test(a.tipo)
            ? "lote"
            : /comerc/i.test(a.tipo)
              ? "comercial"
              : "casa_rua",
      finalidade: "venda",
      titulo: a.titulo,
      proprietario: { nome: "", doc: "", tel: "", email: "" },
      cep: "",
      endereco: "",
      numero: "",
      complemento: "",
      bairro: a.bairro,
      cidade: a.cidade || "Anápolis",
      condominioNome: "",
      valor: a.preco,
      valorCondominio: 0,
      iptu: 0,
      area: a.area,
      terreno: 0,
      quartos: a.quartos,
      suites: 0,
      banheiros: 0,
      vagas: 0,
      matricula: "",
      descricao: "",
      diferenciais: "",
      exclusividade: "",
      etapa: "visita",
      checklist: {},
      fotos: [],
      corretorId: "",
      origem: "Varredura",
      criadoEm: hoje(),
    });
    marcar(gr, "captado");
    avisar("Captado. O imóvel entrou em Captação.");
    setVer(null);
  };
  const linha = (x: Grupo, i: number) => {
    const a = x.principal;
    return `${i + 1}. ${a.titulo}${a.bairro ? `, ${a.bairro}` : ""}, ${brl(a.preco, false)}${x.motivos.length ? ` (${x.motivos.join(", ")})` : ""}${a.url ? `\n${a.url}` : ""}`;
  };
  const resumo = [
    `Varredura de ${br(segundaDe(hoje()))}: ${por.abordar.length} imóveis no padrão e fora da carteira, ${por.abordar.filter((x) => x.novo).length} novos na semana.`,
    "",
    ...por.abordar.slice(0, 15).map(linha),
  ].join("\n");

  return (
    <>
      <Cabecalho area="COMERCIAL VARREDURA" titulo="Varredura dos portais" texto="Uma linha por imóvel: junta repetidos, tira o que a Sarto já tem e ordena por chance de captar.">
        <Copiar texto={resumo} pequeno={false}>
          Copiar lista do Igor
        </Copiar>
      </Cabecalho>

      <Numeros>
        <Numero valor={por.abordar.length} nome="Para abordar" nota={ultima ? `última coleta ${prazo(ultima)}` : "nenhuma coleta"} />
        <Numero valor={por.abordar.filter((x) => x.novo).length} nome="Novos na semana" />
        <Numero valor={por.abordar.filter((x) => x.particular).length} nome="Do próprio dono" />
        <Numero valor={por.abordar.filter((x) => x.baixou > 0).length} nome="Baixaram de preço" />
      </Numeros>

      <Coleta />

      <Abas
        atual={aba}
        onMuda={(a) => {
          setAba(a);
          setLim(50);
        }}
        itens={[
          { id: "abordar", nome: "Abordar", n: por.abordar.length },
          { id: "andamento", nome: "Em andamento", n: por.andamento.length },
          { id: "sarto", nome: "Já é da Sarto", n: por.sarto.length },
          { id: "fora", nome: "Fora do padrão", n: por.fora.length },
        ]}
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <Busca valor={q} onMuda={setQ} placeholder="Bairro, condomínio ou anunciante" />
        <Escolha
          rotulo="Sinal"
          valor={filtro}
          onMuda={setFiltro}
          opcoes={[
            { id: "", nome: "Todos os sinais" },
            { id: "novo", nome: "Novos na semana" },
            { id: "dono", nome: "Do próprio dono" },
            { id: "baixou", nome: "Baixaram de preço" },
            { id: "parado", nome: "Parados há 90 dias" },
          ]}
        />
        <Escolha rotulo="Tipo" valor={tipo} onMuda={setTipo} opcoes={[{ id: "", nome: "Todos os tipos" }, ...tipos.map((x) => ({ id: x, nome: x }))]} />
        <Botao onClick={() => setEd(novoAnuncio())}>
          <Plus size={16} /> Incluir um
        </Botao>
        {lista.length > 0 && (
          <Botao
            onClick={() =>
              baixarArquivo(
                `varredura-${hoje()}.csv`,
                csv([
                  ["Título", "Bairro", "Cidade", "Tipo", "Preço", "Preço anterior", "Área", "Quartos", "Anunciantes", "Sinais", "Situação", "Link"],
                  ...lista.map((x) => [
                    x.principal.titulo,
                    x.principal.bairro,
                    x.principal.cidade,
                    x.principal.tipo,
                    x.principal.preco,
                    x.principal.precoAnterior || "",
                    x.principal.area || "",
                    x.principal.quartos || "",
                    [x.principal, ...x.outros]
                      .map((a) => a.anunciante)
                      .filter(Boolean)
                      .join("; "),
                    x.motivos.join("; "),
                    STATUS[st(x)],
                    x.principal.url,
                  ]),
                ]),
                "text/csv;charset=utf-8",
              )
            }
          >
            Exportar
          </Botao>
        )}
      </div>

      <div className={cx("grid gap-6", aba === "abordar" && bairros.length > 2 && "lg:grid-cols-[1fr_250px]")}>
        <div className="min-w-0">
          {lista.length === 0 ? (
            <Vazio>{dados.anuncios.length ? "Nada com esse filtro." : "Nenhuma varredura ainda."}</Vazio>
          ) : (
            <div className="overflow-x-auto">
              <table className="tabela min-w-[740px]">
                <thead>
                  <tr>
                    <th>Imóvel</th>
                    <th className="n">Preço</th>
                    <th className="n">Área</th>
                    <th>{aba === "sarto" ? "Na Sarto" : "Por que abordar"}</th>
                    <th>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.slice(0, lim).map((x) => {
                    const a = x.principal;
                    return (
                      <tr key={x.id} className="clica">
                        <td className="max-w-[320px]">
                          <button type="button" className="text-left font-medium hover:underline" onClick={() => setVer(x.id)}>
                            {a.titulo}
                          </button>
                          <span className="block text-[13px] text-cinza">{[a.bairro, a.anunciante || a.portal].filter(Boolean).join(", ")}</span>
                        </td>
                        <td className="n">
                          {brl(a.preco, false)}
                          {a.precoAnterior > a.preco && <span className="block text-[12px] text-cinza line-through">{brl(a.precoAnterior, false)}</span>}
                        </td>
                        <td className="n">{a.area ? `${num(a.area)} m²` : "—"}</td>
                        <td>
                          {aba === "sarto" ? (
                            typeof x.sarto === "object" && x.sarto ? (
                              <a href={x.sarto.url} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                                cód. {x.sarto.cod}
                              </a>
                            ) : (
                              "anúncio da Sarto"
                            )
                          ) : (
                            <span className="flex flex-wrap gap-1">
                              {x.novo && <Selo tom="forte">Novo</Selo>}
                              {x.motivos.map((m) => (
                                <Selo key={m} tom={m === "do próprio dono" ? "forte" : "neutro"}>
                                  {m}
                                </Selo>
                              ))}
                              {!x.novo && !x.motivos.length && <span className="text-cinza">no padrão</span>}
                            </span>
                          )}
                        </td>
                        <td>
                          <select className="campo min-h-9 w-36 py-1" aria-label="Situação" value={st(x)} onChange={(e) => marcar(x, e.target.value as Anuncio["status"])}>
                            {Object.entries(STATUS).map(([id, nome]) => (
                              <option key={id} value={id}>
                                {nome}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {lista.length > lim && (
            <div className="mt-4 text-center">
              <Botao onClick={() => setLim(lim + 100)}>Mostrar mais ({lista.length - lim})</Botao>
            </div>
          )}
        </div>
        {aba === "abordar" && bairros.length > 2 && (
          <Cartao titulo="Por bairro" className="self-start">
            <Barras dados={bairros.slice(0, 12)} />
          </Cartao>
        )}
      </div>

      {dados.anuncios.length > 0 && (
        <p className="mt-6 text-[13px] text-cinza">
          {num(dados.anuncios.length)} anúncios acompanhados.{" "}
          <button type="button" className="underline" onClick={() => setLimpa(true)}>
            Limpar os que sumiram há mais de 60 dias
          </button>
        </p>
      )}

      <Gaveta
        larga
        aberta={!!g}
        titulo={g?.principal.titulo ?? ""}
        sub={g && [g.principal.bairro, g.principal.cidade].filter(Boolean).join(", ")}
        onFecha={() => setVer(null)}
        rodape={
          g && (
            <>
              <Botao tom="texto" onClick={() => setEd(g.principal)}>
                Editar dados
              </Botao>
              <Botao onClick={() => marcar(g, "contatado")}>Marcar contatado</Botao>
              <Botao tom="cheio" onClick={() => captar(g)}>
                Captado: abrir captação
              </Botao>
            </>
          )
        }
      >
        {g && (
          <div className="space-y-7">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <p className="text-[34px] font-light leading-none tabular-nums">{brl(g.principal.preco, false)}</p>
              <span className="flex flex-wrap gap-1">
                {g.novo && <Selo tom="forte">Novo</Selo>}
                {g.motivos.map((m) => (
                  <Selo key={m}>{m}</Selo>
                ))}
              </span>
            </div>
            {g.sarto && (
              <Nota tom="alerta">{typeof g.sarto === "object" ? `Parece ser o código ${g.sarto.cod} da Sarto.` : "Anúncio da própria Sarto."} Confira antes de abordar.</Nota>
            )}
            <ListaInfo
              itens={[
                ["Tipo", g.principal.tipo],
                ["Área", g.principal.area ? `${num(g.principal.area)} m²` : ""],
                ["Quartos", g.principal.quartos || ""],
                ["Publicado", g.principal.publicadoEm ? `${br(g.principal.publicadoEm)} (${prazo(g.principal.publicadoEm)})` : ""],
                ["Visto pela primeira vez", br(g.principal.primeiraVez)],
                ["Preço por m²", g.principal.area ? brl(g.principal.preco / g.principal.area, false) : ""],
              ]}
            />
            <div>
              <h3 className="mb-1 text-[13px] font-semibold uppercase tracking-wide">{g.outros.length ? `Em ${g.outros.length + 1} anúncios` : "Anúncio"}</h3>
              <ul className="divide-y divide-linha border-y border-linha">
                {[g.principal, ...g.outros].map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                    <span>
                      <span className="block font-medium">
                        {a.anunciante || "Anunciante não informado"} {a.particular && <Selo tom="forte">Dono</Selo>}
                      </span>
                      <span className="text-[13px] text-cinza">
                        {a.portal}, {brl(a.preco, false)}
                        {diasEntre(a.vistoEm, hoje()) > 21 && ", não aparece há mais de 3 semanas"}
                      </span>
                    </span>
                    {a.url && (
                      <a className={estiloBotao("linha", true)} href={a.url} target="_blank" rel="noreferrer">
                        <ExternalLink size={14} /> Abrir
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-wrap gap-2">
              <Copiar
                texto={`Olá. Vi o seu anúncio do imóvel em ${g.principal.bairro || "Anápolis"} e gostaria de conversar. Sou da Sarto Imóveis, trabalhamos com alto padrão em Anápolis.`}
              >
                Copiar abordagem
              </Copiar>
              <a className={estiloBotao("linha", true)} href={linkWhats("", `Varredura: ${linha(g, 0)}`)} target="_blank" rel="noreferrer">
                <MessageCircle size={14} /> Enviar a um corretor
              </a>
            </div>
            <label className="block text-[12px] font-medium">
              Observações do contato
              <textarea
                className="campo mt-1"
                rows={3}
                defaultValue={g.principal.obs}
                key={g.id}
                onBlur={(e) => e.target.value !== g.principal.obs && mudar("anuncios", g.principal.id, { obs: e.target.value })}
              />
            </label>
          </div>
        )}
      </Gaveta>
      <Gaveta
        aberta={!!ed}
        titulo={ed?.titulo || "Incluir anúncio"}
        onFecha={() => setEd(null)}
        rodape={
          ed && (
            <>
              {dados.anuncios.some((a) => a.id === ed.id) && (
                <Botao
                  tom="texto"
                  onClick={() => {
                    remover("anuncios", ed.id);
                    setEd(null);
                    setVer(null);
                  }}
                >
                  Excluir
                </Botao>
              )}
              <Botao
                tom="cheio"
                disabled={!ed.titulo || !ed.preco}
                onClick={() => {
                  salvar("anuncios", ed);
                  avisar("Anúncio salvo");
                  setEd(null);
                }}
              >
                Salvar anúncio
              </Botao>
            </>
          )
        }
      >
        {ed && <Formulario grupos={GRUPOS} valor={ed} onMuda={setEd} />}
      </Gaveta>
      <Confirmar
        aberta={limpa}
        titulo="Limpar anúncios que sumiram?"
        texto="Saem os que não aparecem em nenhuma coleta há mais de 60 dias e que ninguém abordou. Os contatados, captados e descartados ficam."
        sim="Limpar"
        onNao={() => setLimpa(false)}
        onSim={() => {
          const s = useSarto.getState();
          const fica = s.dados.anuncios.filter((a) => a.status !== "abordar" || diasEntre(a.vistoEm, hoje()) <= 60);
          useSarto.setState({ dados: { ...s.dados, anuncios: fica } });
          avisar(`${s.dados.anuncios.length - fica.length} anúncios removidos`);
          setLimpa(false);
        }}
      />
    </>
  );
}
