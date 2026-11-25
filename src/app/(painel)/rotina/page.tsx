"use client";
import { MessageCircle, Minus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Formulario } from "@/componentes/formulario";
import { Abas, Botao, Cabecalho, Cartao, Copiar, cx, estiloBotao, Fita, Gaveta, Itens, Selo, Vazio } from "@/componentes/ui";
import { faltaAniversario } from "@/lib/agenda";
import { br, hoje, maisDias } from "@/lib/datas";
import { linkWhats, novoId } from "@/lib/formato";
import { acao, useSarto } from "@/lib/store";
import type { Aniversario, Estoque, RotinaDia } from "@/lib/tipos";

const ABERTURA = [
  { id: "porta", nome: "Porta e recepção em ordem" },
  { id: "tv", nome: "TV ligada com material da Sarto" },
  { id: "som", nome: "Som ligado" },
  { id: "banheiro", nome: "Banheiro limpo" },
  { id: "calcada", nome: "Calçada limpa" },
  { id: "cadeiras", nome: "Cadeiras prontas (segunda)" },
  { id: "cafe", nome: "Café e xícaras conferidos" },
];
const FECHAMENTO = [
  { id: "luzes", nome: "Luzes apagadas" },
  { id: "tv_off", nome: "TV e som desligados" },
  { id: "plantas", nome: "Plantas regadas" },
  { id: "pedra", nome: "Pedra portuguesa limpa" },
  { id: "estoque", nome: "Estoque conferido" },
  { id: "porta_f", nome: "Porta trancada" },
];

/** Mensagem montada com o que se sabe da pessoa. Sem contexto, não inventa. */
export default function Rotina() {
  const { dados } = useSarto();
  const { salvar, remover, avisar, mudar } = acao();
  const [aba, setAba] = useState<"rotina" | "estoque" | "aniversarios">("rotina");
  const [es, setEs] = useState<Estoque | null>(null);
  const [an, setAn] = useState<(Aniversario & { data: string }) | null>(null);
  const h = hoje();
  const doTurno = (t: RotinaDia["turno"]): RotinaDia => dados.rotinas.find((r) => r.data === h && r.turno === t) ?? { id: novoId(), data: h, turno: t, itens: {} };
  const anivers = [...dados.aniversarios].map((a) => ({ ...a, falta: faltaAniversario(a.dia, h) })).sort((a, b) => a.falta - b.falta);
  const repor = dados.estoque.filter((e) => e.qtd < e.minimo);
  const historico = [1, 2, 3, 4, 5, 6, 7]
    .map((n) => maisDias(h, -n))
    .map((d) => ({ d, n: dados.rotinas.filter((r) => r.data === d).reduce((a, r) => a + Object.keys(r.itens).length, 0) }));
  const total = ABERTURA.length + FECHAMENTO.length;

  const pedido = (a: Aniversario) =>
    `Use a skill da Sarto e escreva uma mensagem de aniversário curta, pessoal e sem frase pronta para ${a.nome}. O que sabemos: ${a.contexto || "nada além do nome"}. Não invente nenhum fato.`;

  return (
    <>
      <Cabecalho area="GESTÃO ROTINA" titulo="Rotina do escritório" texto="Abertura e fechamento com nome de quem fez, estoque com aviso de reposição e aniversários." />
      <Abas
        atual={aba}
        onMuda={setAba}
        itens={[
          { id: "rotina", nome: "Abertura e fechamento" },
          { id: "estoque", nome: "Estoque", n: repor.length || undefined },
          { id: "aniversarios", nome: "Aniversários" },
        ]}
      />
      {aba === "rotina" && (
        <div className="grid gap-5 lg:grid-cols-2">
          {(
            [
              ["abertura", "Abertura", ABERTURA],
              ["fechamento", "Fechamento", FECHAMENTO],
            ] as const
          ).map(([t, nome, itens]) => {
            const r = doTurno(t);
            return (
              <Cartao key={t} titulo={nome}>
                <div className="mb-2">
                  <Fita parte={Object.keys(r.itens).length} total={itens.length} />
                </div>
                <Itens itens={itens} check={r.itens} onMuda={(x) => salvar("rotinas", { ...r, itens: x })} />
              </Cartao>
            );
          })}
          <Cartao titulo="Últimos 7 dias" className="lg:col-span-2">
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7 sm:gap-3">
              {historico.map((x) => (
                <div key={x.d} className="min-w-0 text-center text-[13px]">
                  <div className={cx("mb-1 py-2 tabular-nums", x.n === total ? "bg-carvao text-papel" : x.n ? "bg-linha" : "border border-dashed border-nevoa text-cinza")}>
                    {x.n} de {total}
                  </div>
                  {br(x.d).slice(0, 5)}
                </div>
              ))}
            </div>
          </Cartao>
        </div>
      )}
      {aba === "estoque" && (
        <>
          <div className="mb-4 flex flex-wrap justify-end gap-2">
            {repor.length > 0 && (
              <Copiar texto={`Repor no escritório:\n${repor.map((e) => `- ${e.item}: tem ${e.qtd}, mínimo ${e.minimo} ${e.unidade}`).join("\n")}`}>Copiar lista de compra</Copiar>
            )}
            <Botao pequeno tom="cheio" onClick={() => setEs({ id: novoId(), item: "", qtd: 0, minimo: 1, unidade: "un" })}>
              <Plus size={14} /> Item
            </Botao>
          </div>
          {dados.estoque.length === 0 ? (
            <Vazio>Nenhum item cadastrado.</Vazio>
          ) : (
            <ul className="divide-y divide-linha border-y border-linha">
              {dados.estoque.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <button type="button" className="text-left font-medium hover:underline" onClick={() => setEs(e)}>
                    {e.item}
                    <span className="block text-[13px] font-normal text-cinza">
                      mínimo {e.minimo} {e.unidade}
                    </span>
                  </button>
                  <span className="flex items-center gap-2">
                    {e.qtd < e.minimo && <Selo tom="alerta">Repor</Selo>}
                    <Botao pequeno aria-label={`Tirar um ${e.item}`} onClick={() => mudar("estoque", e.id, { qtd: Math.max(0, e.qtd - 1) })}>
                      <Minus size={14} />
                    </Botao>
                    <span className="w-10 text-center text-[18px] font-light tabular-nums">{e.qtd}</span>
                    <Botao pequeno aria-label={`Incluir um ${e.item}`} onClick={() => mudar("estoque", e.id, { qtd: e.qtd + 1 })}>
                      <Plus size={14} />
                    </Botao>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {aba === "aniversarios" && (
        <>
          <div className="mb-4 text-right">
            <Botao pequeno tom="cheio" onClick={() => setAn({ id: novoId(), nome: "", dia: "", tipo: "cliente", tel: "", contexto: "", data: "" })}>
              <Plus size={14} /> Aniversário
            </Botao>
          </div>
          {anivers.length === 0 ? (
            <Vazio>Nenhum aniversário cadastrado.</Vazio>
          ) : (
            <ul className="divide-y divide-linha border-y border-linha">
              {anivers.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <button type="button" className="min-w-0 max-w-xl text-left" onClick={() => setAn({ ...a, data: `2000-${a.dia}` })}>
                    <span className="block font-medium hover:underline">
                      {a.nome} <span className="font-normal text-cinza">{a.dia.split("-").reverse().join("/")}</span>
                    </span>
                    <span className="block text-[13px] text-cinza">{a.contexto || "Sem contexto: a mensagem fica genérica"}</span>
                  </button>
                  <span className="flex items-center gap-2">
                    <Selo tom={a.falta === 0 ? "forte" : "neutro"}>{a.falta === 0 ? "Hoje" : `em ${a.falta} dias`}</Selo>
                    {a.enviadoAno === Number(h.slice(0, 4)) ? (
                      <Selo tom="ok">Enviada</Selo>
                    ) : (
                      a.falta === 0 && (
                        <>
                          <Copiar texto={pedido(a)}>Pedido para o Claude</Copiar>
                          {a.tel && (
                            <a
                              className={estiloBotao("linha", true)}
                              href={linkWhats(a.tel, "")}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`WhatsApp de ${a.nome}`}
                              onClick={() => mudar("aniversarios", a.id, { enviadoAno: Number(h.slice(0, 4)) })}
                            >
                              <MessageCircle size={15} />
                            </a>
                          )}
                        </>
                      )
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <Gaveta
        aberta={!!es}
        titulo={es?.item || "Item de estoque"}
        onFecha={() => setEs(null)}
        rodape={
          es && (
            <>
              <Botao
                tom="texto"
                onClick={() => {
                  remover("estoque", es.id);
                  setEs(null);
                }}
              >
                <Trash2 size={14} /> Excluir
              </Botao>
              <Botao
                tom="cheio"
                disabled={!es.item}
                onClick={() => {
                  salvar("estoque", es);
                  setEs(null);
                }}
              >
                Salvar
              </Botao>
            </>
          )
        }
      >
        {es && (
          <Formulario
            grupos={[
              {
                grupo: "",
                campos: [
                  { k: "item", nome: "Item", col: 6 },
                  { k: "qtd", nome: "Tem", tipo: "numero", col: 2 },
                  { k: "minimo", nome: "Mínimo", tipo: "numero", col: 2 },
                  { k: "unidade", nome: "Unidade", col: 2 },
                ],
              },
            ]}
            valor={es}
            onMuda={setEs}
          />
        )}
      </Gaveta>
      <Gaveta
        aberta={!!an}
        titulo={an?.nome || "Aniversário"}
        onFecha={() => setAn(null)}
        rodape={
          an && (
            <>
              <Botao
                tom="texto"
                onClick={() => {
                  remover("aniversarios", an.id);
                  setAn(null);
                }}
              >
                Excluir
              </Botao>
              <Botao
                tom="cheio"
                disabled={!an.nome || !an.data}
                onClick={() => {
                  const { data, ...a } = an;
                  salvar("aniversarios", { ...a, dia: data.slice(5) });
                  avisar("Aniversário salvo");
                  setAn(null);
                }}
              >
                Salvar
              </Botao>
            </>
          )
        }
      >
        {an && (
          <Formulario
            grupos={[
              {
                grupo: "",
                campos: [
                  { k: "nome", nome: "Nome", col: 6 },
                  { k: "data", nome: "Data (o ano não conta)", tipo: "data", col: 2 },
                  {
                    k: "tipo",
                    nome: "Tipo",
                    tipo: "opcoes",
                    col: 2,
                    opcoes: [
                      { id: "cliente", nome: "Cliente" },
                      { id: "equipe", nome: "Equipe" },
                    ],
                  },
                  { k: "tel", nome: "WhatsApp", tipo: "tel", col: 2 },
                  { k: "contexto", nome: "O que sabemos da pessoa", tipo: "area", col: 6, dica: "Só o necessário para a mensagem. É o que deixa cada uma única." },
                ],
              },
            ]}
            valor={an}
            onMuda={setAn}
          />
        )}
      </Gaveta>
    </>
  );
}
