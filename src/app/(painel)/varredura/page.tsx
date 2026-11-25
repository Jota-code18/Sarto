"use client";
import { Plus, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { Formulario, type GrupoDef } from "@/componentes/formulario";
import { Abas, Botao, Cabecalho, Cartao, Copiar, estiloBotao, Gaveta, Numero, Numeros, Selo, Vazio } from "@/componentes/ui";
import { useCarteira } from "@/componentes/uso";
import { type AnuncioAvaliado, avaliarVarredura } from "@/lib/comercial";
import { br, hoje, lerData, prazo } from "@/lib/datas";
import { lerCsv } from "@/lib/extrato";
import { baixarArquivo, brl, csv, lerValor, novoId, semAcento } from "@/lib/formato";
import { acao, useSarto } from "@/lib/store";
import type { Anuncio } from "@/lib/tipos";

const PORTAIS = ["ZAP Imóveis", "Viva Real", "OLX", "62imóveis"];
const STATUS: Record<Anuncio["status"], string> = { abordar: "Abordar", contatado: "Contatado", captado: "Captado", descartado: "Descartado" };

const novo = (): Anuncio => ({
  id: novoId(), portal: PORTAIS[0], url: "", titulo: "", tipo: "", bairro: "", preco: 0, precoAnterior: 0, area: 0, quartos: 0, anunciante: "", particular: false, vistoEm: hoje(), status: "abordar", obs: "",
});
const GRUPOS: GrupoDef[] = [
  {
    grupo: "",
    campos: [
      { k: "portal", nome: "Portal", tipo: "opcoes", opcoes: PORTAIS, col: 3 },
      { k: "status", nome: "Situação", tipo: "opcoes", col: 3, opcoes: Object.entries(STATUS).map(([id, nome]) => ({ id, nome })) },
      { k: "url", nome: "Link do anúncio", col: 6 },
      { k: "titulo", nome: "Título", col: 6, obrigatorio: true },
      { k: "tipo", nome: "Tipo", col: 3 },
      { k: "bairro", nome: "Bairro ou condomínio", col: 3 },
      { k: "preco", nome: "Preço", tipo: "dinheiro", col: 3 },
      { k: "precoAnterior", nome: "Preço anterior", tipo: "dinheiro", col: 3 },
      { k: "area", nome: "Área (m²)", tipo: "numero", col: 2 },
      { k: "quartos", nome: "Quartos", tipo: "numero", col: 2 },
      { k: "publicadoEm", nome: "Publicado em", tipo: "data", col: 2 },
      { k: "anunciante", nome: "Anunciante", col: 4 },
      { k: "particular", nome: "É o dono", tipo: "sim", col: 2 },
      { k: "obs", nome: "Observações do contato", tipo: "area", col: 6, linhas: 3 },
    ],
  },
];

export default function Varredura() {
  const { dados, regras } = useSarto();
  const { salvar, varios, avisar, mudar, registrar } = acao();
  const { carteira } = useCarteira();
  const [aba, setAba] = useState<"abordar" | "carteira" | "fora" | "andamento">("abordar");
  const [ed, setEd] = useState<Anuncio | null>(null);

  const av = useMemo(() => avaliarVarredura(dados.anuncios, carteira, regras), [dados.anuncios, carteira, regras]);
  const abordar = av.filter((a) => a.status === "abordar" && a.noPadrao && !a.naCarteira);
  const naCart = av.filter((a) => a.naCarteira);
  const fora = av.filter((a) => a.status === "abordar" && !a.noPadrao);
  const andamento = av.filter((a) => a.status !== "abordar");
  const lista: AnuncioAvaliado[] = { abordar, carteira: naCart, fora, andamento }[aba];
  const captados = dados.anuncios.filter((a) => a.status === "captado").length;

  const importar = async (f?: File) => {
    if (!f) return;
    const ls = lerCsv(await f.text());
    const urls = new Set(dados.anuncios.map((a) => a.url).filter(Boolean));
    const achar = (o: Record<string, string>, re: RegExp) => o[Object.keys(o).find((k) => re.test(k)) ?? ""] ?? "";
    const novos: Anuncio[] = [];
    for (const o of ls) {
      const a: Anuncio = {
        ...novo(),
        portal: achar(o, /portal|fonte|site/) || "Planilha",
        url: achar(o, /url|link/),
        titulo: achar(o, /titulo|title|anuncio/) || achar(o, /endereco/),
        tipo: achar(o, /tipo/),
        bairro: achar(o, /bairro|condominio|neighborhood/),
        preco: lerValor(achar(o, /^preco$|^valor|^price/)),
        precoAnterior: lerValor(achar(o, /anterior/)),
        area: lerValor(achar(o, /area|m2|metr/)),
        quartos: lerValor(achar(o, /quarto|dorm|bedroom/)),
        anunciante: achar(o, /anunciante|imobiliaria|advertiser/),
        publicadoEm: lerData(achar(o, /publicado|data|created/)) ?? undefined,
      };
      a.particular = /propriet|particular|direto/.test(semAcento(a.anunciante));
      if (!a.titulo || !a.preco || (a.url && urls.has(a.url))) continue;
      urls.add(a.url);
      novos.push(a);
    }
    if (!novos.length) return avisar("Nenhuma linha nova com título e preço na planilha", "erro");
    varios("anuncios", novos);
    registrar("Varredura", `importou ${novos.length} anúncios`);
    avisar(`${novos.length} anúncios incluídos`);
  };

  const modelo = () =>
    baixarArquivo("modelo-varredura.csv", csv([["Portal", "Link", "Título", "Tipo", "Bairro", "Preço", "Preço anterior", "Área", "Quartos", "Anunciante", "Publicado em"]]), "text/csv;charset=utf-8");

  const resumo = [
    `Varredura da semana: ${abordar.length} imóveis no padrão Sarto fora da carteira.`,
    "",
    ...abordar.slice(0, 12).map((a, i) => `${i + 1}. ${a.titulo}, ${a.bairro}, ${brl(a.preco, false)}${a.motivos.length ? ` (${a.motivos.join(", ")})` : ""}${a.url ? `\n${a.url}` : ""}`),
  ].join("\n");

  return (
    <>
      <Cabecalho area="COMERCIAL VARREDURA" titulo="Varredura dos portais" texto="Junta repetidos, tira o que a Sarto já tem e ordena por chance de captar.">
        <label className={estiloBotao()}>
          <Upload size={16} /> Importar planilha
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => importar(e.target.files?.[0])} />
        </label>
        <Botao tom="cheio" onClick={() => setEd(novo())}>
          <Plus size={16} /> Incluir anúncio
        </Botao>
      </Cabecalho>

      <Numeros>
        <Numero valor={abordar.length} nome="Para abordar" nota="no padrão e fora da carteira" />
        <Numero valor={abordar.filter((a) => a.particular).length} nome="Do próprio dono" />
        <Numero valor={naCart.length} nome="Já na carteira" nota={`comparado com ${carteira.length} imóveis`} />
        <Numero valor={captados} nome="Captados pela varredura" />
      </Numeros>

      <div className="mb-5">
        <Cartao titulo="Coleta automática" escuro>
          <p className="max-w-3xl text-[13px] leading-relaxed text-papel/85">
            A coleta de ZAP, Viva Real e OLX depende da Apify, que é paga por resultado, e do padrão Sarto definido. Até lá a lista entra por planilha ou um a um: a triagem, a comparação com a carteira e o acompanhamento já funcionam.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={modelo} className="underline underline-offset-4">
              Baixar planilha modelo
            </button>
          </div>
        </Cartao>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Abas
            atual={aba}
            onMuda={setAba}
            itens={[
              { id: "abordar", nome: "Abordar", n: abordar.length },
              { id: "andamento", nome: "Em andamento", n: andamento.length },
              { id: "carteira", nome: "Já na carteira", n: naCart.length },
              { id: "fora", nome: "Fora do padrão", n: fora.length },
            ]}
          />
        </div>
        <Copiar texto={resumo}>Copiar lista do Igor</Copiar>
      </div>

      {lista.length === 0 ? (
        <Vazio>Nada aqui.</Vazio>
      ) : (
        <div className="overflow-x-auto">
          <table className="tabela min-w-[820px]">
            <thead>
              <tr>
                <th>Anúncio</th>
                <th>Bairro</th>
                <th className="n">Preço</th>
                <th className="n">Área</th>
                <th>Por que abordar</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((a) => (
                <tr key={a.id} className="clica">
                  <td>
                    <button type="button" className="text-left font-medium hover:underline" onClick={() => setEd(dados.anuncios.find((x) => x.id === a.id) ?? null)}>
                      {a.titulo}
                    </button>
                    <span className="block text-[13px] text-cinza">
                      {a.portal}, {a.anunciante || "sem anunciante"}, visto {prazo(a.vistoEm)}
                    </span>
                  </td>
                  <td>{a.bairro}</td>
                  <td className="n">
                    {brl(a.preco, false)}
                    {a.precoAnterior > a.preco && <span className="block text-[12px] text-cinza line-through">{brl(a.precoAnterior, false)}</span>}
                  </td>
                  <td className="n">{a.area || "—"} m²</td>
                  <td>
                    {a.naCarteira ? (
                      <a href={a.naCarteira.url} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                        É o cód. {a.naCarteira.cod} da Sarto
                      </a>
                    ) : (
                      <span className="flex flex-wrap gap-1">
                        {a.motivos.length ? a.motivos.map((m) => <Selo key={m} tom={m.includes("dono") ? "forte" : "neutro"}>{m}</Selo>) : <span className="text-cinza">no padrão</span>}
                      </span>
                    )}
                  </td>
                  <td>
                    <select
                      className="campo min-h-9 w-36 py-1"
                      aria-label="Situação"
                      value={a.status}
                      onChange={(e) => {
                        const status = e.target.value as Anuncio["status"];
                        mudar("anuncios", a.id, { status });
                        registrar("Varredura", `marcou "${a.titulo}" como ${STATUS[status].toLowerCase()}`);
                      }}
                    >
                      {Object.entries(STATUS).map(([id, nome]) => (
                        <option key={id} value={id}>
                          {nome}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Gaveta
        aberta={!!ed}
        titulo={ed?.titulo || "Incluir anúncio"}
        sub={ed && `Visto em ${br(ed.vistoEm)}`}
        onFecha={() => setEd(null)}
        rodape={
          ed && (
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
          )
        }
      >
        {ed && <Formulario grupos={GRUPOS} valor={ed} onMuda={setEd} />}
      </Gaveta>
    </>
  );
}
