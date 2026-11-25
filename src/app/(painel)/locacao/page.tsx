"use client";
import { FileText, Plus, Upload } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CAMPOS_PESSOA, Formulario, type GrupoDef, obrigatoriosVazios } from "@/componentes/formulario";
import { Abas, Botao, Busca, Cabecalho, Confirmar, Copiar, cx, Escolha, estiloBotao, Fita, Gaveta, Itens, ListaInfo, Nota, Numero, Numeros, Selo, Vazio } from "@/componentes/ui";
import { useParam } from "@/componentes/uso";
import { br, brComp, hoje, lerData, maisMeses, prazo } from "@/lib/datas";
import { lerCsv } from "@/lib/extrato";
import { baixarArquivo, brl, csv, lerValor, mascaraDoc, mascaraTel, novoId, num, semAcento } from "@/lib/formato";
import { alertasContrato, CHECK_CONTRATO, CHECK_SAIDA, corContrato, proximoReajuste, situacao, taxaAdm } from "@/lib/locacao";
import { acumulado12, buscarIndice, novoAluguel } from "@/lib/reajuste";
import { pode } from "@/lib/regras";
import { acao, useSarto } from "@/lib/store";
import type { ContaInquilino, ContaTipo, Contrato } from "@/lib/tipos";

const COR = { verde: "ok", amarelo: "alerta", vermelho: "erro" } as const;
const NOME_COR = { verde: "Em dia", amarelo: "Atenção", vermelho: "Resolver" };

const GRUPOS: GrupoDef[] = [
  {
    grupo: "Imóvel",
    campos: [
      { k: "codigo", nome: "Código", col: 2 },
      { k: "imovel", nome: "Imóvel", col: 4, obrigatorio: true },
      { k: "endereco", nome: "Endereço completo", col: 4 },
      { k: "bairro", nome: "Bairro", col: 2 },
    ],
  },
  {
    grupo: "Proprietário",
    campos: [
      ...CAMPOS_PESSOA("proprietario", "Nome", true),
      { k: "proprietario.pix", nome: "Chave Pix do repasse", col: 4 },
      { k: "imoveisDoDono", nome: "Imóveis na Sarto", tipo: "numero", col: 2, dica: "3 ou mais usa a taxa reduzida" },
    ],
  },
  { grupo: "Inquilino", campos: CAMPOS_PESSOA("inquilino", "Nome", true) },
  {
    grupo: "Valores",
    campos: [
      { k: "aluguel", nome: "Aluguel", tipo: "dinheiro", col: 2, obrigatorio: true },
      { k: "condominio", nome: "Condomínio", tipo: "dinheiro", col: 2 },
      { k: "iptuMensal", nome: "IPTU por mês", tipo: "dinheiro", col: 2 },
      { k: "encargosNoBoleto", nome: "Condomínio e IPTU no boleto", tipo: "sim", col: 3 },
      { k: "diaVencimento", nome: "Dia do vencimento", tipo: "numero", col: 1 },
      { k: "diaRepasse", nome: "Dia do repasse", tipo: "numero", col: 2 },
      { k: "multaPct", nome: "Multa por atraso (%)", tipo: "numero", col: 2 },
      { k: "jurosMes", nome: "Juros ao mês (%)", tipo: "numero", col: 2 },
    ],
  },
  {
    grupo: "Prazos e garantia",
    campos: [
      { k: "inicio", nome: "Início", tipo: "data", col: 2, obrigatorio: true },
      { k: "fim", nome: "Fim", tipo: "data", col: 2, obrigatorio: true },
      {
        k: "status",
        nome: "Situação",
        tipo: "opcoes",
        col: 2,
        opcoes: [
          { id: "ativo", nome: "Ativo" },
          { id: "encerrando", nome: "Em saída" },
          { id: "encerrado", nome: "Encerrado" },
        ],
      },
      { k: "indice", nome: "Índice de reajuste", tipo: "opcoes", col: 2, opcoes: ["IGP-M", "IPCA", "INPC"] },
      { k: "ultimoReajuste", nome: "Último reajuste ou início", tipo: "data", col: 2 },
      { k: "seguroVence", nome: "Seguro incêndio vence", tipo: "data", col: 2 },
      { k: "garantia", nome: "Garantia", col: 4 },
      { k: "garantiaVence", nome: "Garantia vence", tipo: "data", col: 2 },
      { k: "obs", nome: "Observações", tipo: "area", col: 6, linhas: 3 },
    ],
  },
];

function Reajuste({ k, onAplicar }: { k: Contrato; onAplicar: (valor: number, data: string) => void }) {
  const [st, setSt] = useState<"" | "buscando" | "erro">("");
  const [r, setR] = useState<ReturnType<typeof acumulado12>>(null);
  const perfil = useSarto((s) => s.perfil);
  const data = proximoReajuste(k);
  const buscar = async () => {
    setSt("buscando");
    try {
      setR(acumulado12(await buscarIndice(k.indice, data.slice(0, 7)), data.slice(0, 7)));
      setSt("");
    } catch {
      setSt("erro");
    }
  };
  const n = r && novoAluguel(k.aluguel, r.pct);
  return (
    <div className="bg-linho p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p>
          Próximo reajuste em <strong className="font-semibold">{br(data)}</strong> pelo {k.indice} <span className="text-cinza">({prazo(data)})</span>
        </p>
        <Botao pequeno onClick={buscar} disabled={st === "buscando"}>
          {st === "buscando" ? "Consultando…" : "Calcular com o Banco Central"}
        </Botao>
      </div>
      {st === "erro" && <p className="mt-2 text-[13px] text-erro">O Banco Central não respondeu. Tente de novo em alguns minutos.</p>}
      {r && n && (
        <div className="mt-3 space-y-2">
          <p className="text-[13px] text-cinza">
            Acumulado de {brComp(r.de)} a {brComp(r.ate)}: {num(r.pct, 2)}%
          </p>
          {!r.completo && <Nota tom="alerta">O índice do mês do reajuste ainda não saiu. Este valor é prévia.</Nota>}
          {r.pct < 0 && <Nota tom="alerta">Índice negativo. O cálculo mantém o aluguel: confirme com a Gabi o que o contrato diz.</Nota>}
          <p className="text-[20px] font-light tabular-nums">
            {brl(k.aluguel)} → <strong className="font-medium">{brl(n.valor)}</strong>
          </p>
          <div className="flex flex-wrap gap-2">
            <Botao
              pequeno
              tom="cheio"
              disabled={!pode(perfil, "reajuste") || !r.completo || data > hoje()}
              title={data > hoje() ? `Só pode aplicar a partir de ${br(data)}` : undefined}
              onClick={() => onAplicar(n.valor, data)}
            >
              Aplicar reajuste
            </Botao>
            <Copiar
              texto={`Olá, ${k.inquilino.nome.split(" ")[0]}. Conforme o contrato, o aluguel do imóvel ${k.imovel} será reajustado em ${br(data)} pelo ${k.indice} acumulado em 12 meses (${num(n.aplicado, 2)}%), passando de ${brl(k.aluguel)} para ${brl(n.valor)}.`}
            >
              Copiar aviso ao inquilino
            </Copiar>
          </div>
        </div>
      )}
    </div>
  );
}

const CONTAS: { id: ContaTipo; nome: string }[] = [
  { id: "iptu", nome: "IPTU" },
  { id: "condominio", nome: "Condomínio" },
  { id: "agua", nome: "Água" },
  { id: "energia", nome: "Energia" },
];

function Contas({ k }: { k: Contrato }) {
  const todas = useSarto((s) => s.dados.contasInquilino);
  const { salvar, avisar } = acao();
  const comp = hoje().slice(0, 7);
  const meses = [comp, maisMeses(`${comp}-01`, -1).slice(0, 7), maisMeses(`${comp}-01`, -2).slice(0, 7)];
  const de = (c: string): ContaInquilino => todas.find((x) => x.contratoId === k.id && x.comp === c) ?? { id: novoId(), contratoId: k.id, comp: c, itens: {} };
  const itens = CONTAS.filter((c) => c.id !== "condominio" || (k.condominio > 0 && !k.encargosNoBoleto)).filter((c) => c.id !== "iptu" || !k.encargosNoBoleto);
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="tabela">
          <thead>
            <tr>
              <th>Mês</th>
              {itens.map((i) => (
                <th key={i.id}>{i.nome}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {meses.map((m) => {
              const ci = de(m);
              return (
                <tr key={m}>
                  <td>{brComp(m)}</td>
                  {itens.map((i) => (
                    <td key={i.id}>
                      <select
                        className="campo min-h-9 py-1"
                        aria-label={`${i.nome} de ${brComp(m)}`}
                        value={ci.itens[i.id] ?? ""}
                        onChange={(e) => {
                          const itensNovos = { ...ci.itens };
                          if (e.target.value) itensNovos[i.id] = e.target.value as "ok";
                          else delete itensNovos[i.id];
                          salvar("contasInquilino", { ...ci, itens: itensNovos });
                        }}
                      >
                        <option value="">Não pedido</option>
                        <option value="pendente">Pedido</option>
                        <option value="ok">Pago</option>
                        <option value="atrasada">Em atraso</option>
                      </select>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Copiar
          texto={`Olá, ${k.inquilino.nome.split(" ")[0]}. Aqui é da locação da Sarto. Para manter o controle do imóvel ${k.imovel} em dia, pode me enviar os comprovantes deste mês: ${itens.map((i) => i.nome.toLowerCase()).join(", ")}? Pode ser foto ou PDF.`}
        >
          Copiar pedido de comprovantes
        </Copiar>
        <Botao
          pequeno
          onClick={() => {
            const ci = de(comp);
            salvar("contasInquilino", { ...ci, pedidoEm: hoje(), itens: { ...Object.fromEntries(itens.map((i) => [i.id, "pendente"])), ...ci.itens } });
            avisar("Pedido do mês registrado");
          }}
        >
          Marcar como pedido
        </Botao>
      </div>
    </div>
  );
}

export default function Locacao() {
  const { dados, regras, perfil } = useSarto();
  const { salvar, remover, avisar, registrar, varios } = acao();
  const pc = useParam("c");
  const [aberto, setAberto] = useState<string | null>(pc);
  const [ed, setEd] = useState<Contrato | null>(null);
  const [aba, setAba] = useState<"visao" | "contas" | "dados" | "saida">("visao");
  const [q, setQ] = useState("");
  const [f, setF] = useState<"" | "vermelho" | "amarelo" | "verde">("");
  const [apaga, setApaga] = useState(false);

  const novo = (): Contrato => ({
    id: novoId(),
    codigo: `L${String(dados.contratos.length + 1).padStart(3, "0")}`,
    imovel: "",
    endereco: "",
    bairro: "",
    proprietario: { nome: "", doc: "", tel: "", email: "", pix: "" },
    inquilino: { nome: "", doc: "", tel: "", email: "" },
    aluguel: 0,
    condominio: 0,
    iptuMensal: 0,
    encargosNoBoleto: false,
    diaVencimento: 10,
    diaRepasse: 15,
    inicio: hoje(),
    fim: maisMeses(hoje(), 30),
    indice: "IPCA",
    ultimoReajuste: hoje(),
    garantia: "",
    garantiaVence: "",
    seguroVence: "",
    imoveisDoDono: 1,
    multaPct: regras.multaPadrao,
    jurosMes: regras.jurosPadrao,
    status: "ativo",
    checklist: {},
    saida: {},
    obs: "",
  });

  const linhas = useMemo(
    () =>
      dados.contratos.map((k) => {
        const al = alertasContrato(k, dados.cobrancas, dados.contasInquilino, regras);
        return { k, al, cor: corContrato(al) };
      }),
    [dados.contratos, dados.cobrancas, dados.contasInquilino, regras],
  );
  const vivos = linhas.filter((l) => l.k.status !== "encerrado");
  const t = semAcento(q);
  const lista = linhas
    .filter((l) => !f || l.cor === f)
    .filter((l) => !t || semAcento(`${l.k.codigo} ${l.k.imovel} ${l.k.inquilino.nome} ${l.k.proprietario.nome}`).includes(t))
    .sort((a, b) => ["vermelho", "amarelo", "verde"].indexOf(a.cor) - ["vermelho", "amarelo", "verde"].indexOf(b.cor));
  const ver = linhas.find((l) => l.k.id === aberto);

  const abrir = (k: Contrato, a: typeof aba = "visao") => {
    setAberto(k.id);
    setEd(k);
    setAba(a);
  };
  const atual = ed ?? ver?.k ?? null;
  const existe = !!atual && dados.contratos.some((c) => c.id === atual.id);
  const faltam = atual
    ? obrigatoriosVazios(
        GRUPOS.flatMap((g) => g.campos),
        atual,
      )
    : [];
  const fechar = () => {
    setAberto(null);
    setEd(null);
  };

  const importar = async (arq?: File) => {
    if (!arq) return;
    const achar = (o: Record<string, string>, re: RegExp) => o[Object.keys(o).find((x) => re.test(x)) ?? ""] ?? "";
    const novos = lerCsv(await arq.text())
      .map((o): Contrato => {
        const inicio = lerData(achar(o, /inicio|data_contrato/)) ?? hoje();
        const base = novo();
        return {
          ...base,
          codigo: achar(o, /^cod/) || base.codigo,
          imovel: achar(o, /^imovel/) || achar(o, /endereco/),
          endereco: achar(o, /endereco/),
          bairro: achar(o, /bairro/),
          proprietario: { ...base.proprietario, nome: achar(o, /^proprietario$|locador$|^nome_do_proprietario|^dono/), tel: achar(o, /tel.*(propriet|locador)/) },
          inquilino: { ...base.inquilino, nome: achar(o, /^inquilino$|locatario$|^nome_do_inquilino/), tel: achar(o, /tel.*(inquil|locat)/) },
          aluguel: lerValor(achar(o, /aluguel|^valor/)),
          condominio: lerValor(achar(o, /condominio/)),
          iptuMensal: lerValor(achar(o, /iptu/)),
          diaVencimento: lerValor(achar(o, /vencimento|dia_venc/)) || 10,
          inicio,
          fim: lerData(achar(o, /^fim|termino|vigencia_fim/)) ?? maisMeses(inicio, 30),
          indice:
            (["IGP-M", "IPCA", "INPC"] as const).find((i) =>
              semAcento(achar(o, /indice/))
                .replace("-", "")
                .includes(semAcento(i).replace("-", "")),
            ) ?? "IPCA",
          ultimoReajuste: lerData(achar(o, /reajuste/)) ?? inicio,
          garantia: achar(o, /garantia/),
          seguroVence: lerData(achar(o, /seguro/)) ?? "",
        };
      })
      .filter((k) => k.imovel && k.aluguel);
    if (!novos.length) return avisar("Não achei as colunas Imóvel e Aluguel na planilha", "erro");
    // contagem por dono define a taxa reduzida
    const dono = (k: Contrato) => semAcento(k.proprietario.nome);
    for (const k of novos) k.imoveisDoDono = Math.max(1, [...novos, ...dados.contratos].filter((x) => dono(x) && dono(x) === dono(k)).length);
    varios("contratos", novos);
    registrar("Locação", `importou ${novos.length} contratos`);
    avisar(`${novos.length} contratos importados. Confira cada um.`);
  };

  const exportar = () =>
    baixarArquivo(
      `locacao-${hoje()}.csv`,
      csv([
        [
          "Código",
          "Imóvel",
          "Endereço",
          "Bairro",
          "Proprietário",
          "Inquilino",
          "Aluguel",
          "Condomínio",
          "IPTU",
          "Vencimento",
          "Início",
          "Fim",
          "Índice",
          "Reajuste",
          "Garantia",
          "Seguro",
          "Situação",
          "Alertas",
        ],
        ...lista.map(({ k, al, cor }) => [
          k.codigo,
          k.imovel,
          k.endereco,
          k.bairro,
          k.proprietario.nome,
          k.inquilino.nome,
          k.aluguel,
          k.condominio,
          k.iptuMensal,
          k.diaVencimento,
          br(k.inicio),
          br(k.fim),
          k.indice,
          br(proximoReajuste(k)),
          k.garantia,
          br(k.seguroVence),
          NOME_COR[cor],
          al.map((a) => a.texto).join("; "),
        ]),
      ]),
      "text/csv;charset=utf-8",
    );

  return (
    <>
      <Cabecalho area="LOCAÇÃO CONTRATOS" titulo="Contratos de locação" texto="O semáforo junta pagamento, contas, documentos, seguro, garantia, reajuste e prazo.">
        <label className={estiloBotao()}>
          <Upload size={16} /> Importar planilha
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => importar(e.target.files?.[0])} />
        </label>
        <Botao onClick={exportar}>Exportar</Botao>
        <Botao tom="cheio" onClick={() => abrir(novo(), "dados")}>
          <Plus size={16} /> Novo contrato
        </Botao>
      </Cabecalho>
      <Numeros>
        <Numero
          valor={vivos.length}
          nome="Contratos ativos"
          nota={`${brl(
            vivos.reduce((a, l) => a + l.k.aluguel, 0),
            false,
          )} por mês`}
        />
        <Numero valor={vivos.filter((l) => l.cor === "vermelho").length} nome="Para resolver" />
        <Numero valor={vivos.filter((l) => l.al.some((a) => a.tipo === "reajuste")).length} nome="Reajuste em 45 dias" />
        <Numero valor={vivos.filter((l) => l.al.some((a) => a.tipo === "seguro" || a.tipo === "garantia" || a.tipo === "fim")).length} nome="Seguro, garantia ou fim" />
      </Numeros>
      <div className="mb-4 flex flex-wrap gap-3">
        <Busca valor={q} onMuda={setQ} placeholder="Imóvel, inquilino ou proprietário" />
        <Escolha
          rotulo="Semáforo"
          valor={f}
          onMuda={setF}
          opcoes={[
            { id: "", nome: "Todos" },
            { id: "vermelho", nome: "Para resolver" },
            { id: "amarelo", nome: "Atenção" },
            { id: "verde", nome: "Em dia" },
          ]}
        />
      </div>
      {lista.length === 0 ? (
        <Vazio acao={<Botao onClick={() => abrir(novo(), "dados")}>Cadastrar contrato</Botao>}>
          Nenhum contrato aqui. Se a planilha da Verônica estiver em Excel, salve como CSV e importe.
        </Vazio>
      ) : (
        <div className="overflow-x-auto">
          <table className="tabela min-w-[900px]">
            <thead>
              <tr>
                <th>Imóvel</th>
                <th>Inquilino</th>
                <th className="n">Aluguel</th>
                <th>Checklist</th>
                <th>O que está fora do lugar</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {lista.map(({ k, al, cor }) => (
                <tr key={k.id} className="clica">
                  <td>
                    <button type="button" className="text-left font-medium hover:underline" onClick={() => abrir(k)}>
                      {k.imovel}
                    </button>
                    <span className="block text-[13px] text-cinza">
                      {k.codigo}, {k.proprietario.nome}
                    </span>
                  </td>
                  <td>{k.inquilino.nome}</td>
                  <td className="n">
                    {brl(k.aluguel)}
                    <span className="block text-[12px] text-cinza">dia {k.diaVencimento}</span>
                  </td>
                  <td>
                    <span className="flex gap-1" title={CHECK_CONTRATO.map((c) => `${c.curto}: ${k.checklist[c.id] ? "ok" : "falta"}`).join("\n")}>
                      {CHECK_CONTRATO.map((c) => (
                        <span key={c.id} className={cx("h-4 w-2.5 border border-carvao", k.checklist[c.id] && "bg-carvao")} />
                      ))}
                    </span>
                    <span className="mt-1 block text-[12px] text-cinza">
                      {CHECK_CONTRATO.filter((c) => k.checklist[c.id]).length} de {CHECK_CONTRATO.length}
                    </span>
                  </td>
                  <td className="max-w-[300px]">
                    {al.slice(0, 2).map((a) => (
                      <span key={a.texto} className="block text-[13px]">
                        {a.texto}
                      </span>
                    ))}
                    {al.length > 2 && <span className="text-[12px] text-cinza">e mais {al.length - 2}</span>}
                  </td>
                  <td>
                    <Selo tom={COR[cor]}>{NOME_COR[cor]}</Selo>
                    {k.status !== "ativo" && <span className="mt-1 block text-[12px] text-cinza">{k.status === "encerrando" ? "em saída" : "encerrado"}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Gaveta
        larga
        aberta={!!atual && (!!aberto || !!ed)}
        titulo={atual?.imovel || "Novo contrato"}
        sub={atual && [atual.codigo, atual.inquilino.nome].filter(Boolean).join(", ")}
        onFecha={fechar}
        rodape={
          atual && (
            <>
              {existe && (
                <Botao tom="texto" onClick={() => setApaga(true)}>
                  Excluir
                </Botao>
              )}
              {existe && (
                <Link className={estiloBotao()} href={`/minutas?contrato=${atual.id}`}>
                  <FileText size={16} /> Gerar minuta
                </Link>
              )}
              <Botao
                tom="cheio"
                disabled={faltam.length > 0}
                title={faltam.length ? `Falta: ${faltam.join(", ")}` : undefined}
                onClick={() => {
                  salvar("contratos", atual);
                  avisar("Contrato salvo");
                  fechar();
                }}
              >
                Salvar contrato
              </Botao>
            </>
          )
        }
      >
        {atual && (
          <>
            <Abas
              atual={aba}
              onMuda={setAba}
              itens={[
                { id: "visao", nome: "Visão geral" },
                { id: "contas", nome: "Contas do inquilino" },
                { id: "dados", nome: "Dados do contrato" },
                { id: "saida", nome: "Saída" },
              ]}
            />
            {aba === "visao" && (
              <div className="space-y-7">
                {ver && ver.al.length > 0 && (
                  <ul className="space-y-1.5">
                    {ver.al.map((a) => (
                      <li key={a.texto} className="flex items-center gap-3">
                        <Selo tom={COR[a.cor]}>{a.cor === "vermelho" ? "Resolver" : "Atenção"}</Selo>
                        <span>{a.texto}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {ver && ver.al.length === 0 && <Nota tom="ok">Contrato em dia.</Nota>}
                <div className="grid gap-6 sm:grid-cols-2">
                  <ListaInfo
                    itens={[
                      ["Aluguel", brl(atual.aluguel)],
                      ["Taxa da Sarto", `${num(taxaAdm(atual, regras))}% = ${brl((atual.aluguel * taxaAdm(atual, regras)) / 100)}`],
                      ["Vencimento", `dia ${atual.diaVencimento}`],
                      ["Vigência", `${br(atual.inicio)} a ${br(atual.fim)}`],
                      ["Garantia", atual.garantia],
                      ["Seguro", br(atual.seguroVence)],
                    ]}
                  />
                  <ListaInfo
                    itens={[
                      ["Inquilino", atual.inquilino.nome],
                      ["Contato", mascaraTel(atual.inquilino.tel)],
                      ["Documento", mascaraDoc(atual.inquilino.doc)],
                      ["Proprietário", atual.proprietario.nome],
                      ["Contato", mascaraTel(atual.proprietario.tel)],
                      ["Pix", atual.proprietario.pix],
                    ]}
                  />
                </div>
                <div>
                  <h3 className="text-[13px] font-semibold uppercase tracking-wide">Checklist do contrato</h3>
                  <div className="my-2">
                    <Fita parte={CHECK_CONTRATO.filter((c) => atual.checklist[c.id]).length} total={CHECK_CONTRATO.length} />
                  </div>
                  <Itens
                    itens={CHECK_CONTRATO}
                    check={atual.checklist}
                    onMuda={(checklist) => {
                      const n = { ...atual, checklist };
                      setEd(n);
                      if (existe) salvar("contratos", n);
                    }}
                  />
                </div>
                {existe && (
                  <Reajuste
                    k={atual}
                    onAplicar={(aluguel, ultimoReajuste) => {
                      const n = { ...atual, aluguel, ultimoReajuste };
                      salvar("contratos", n);
                      setEd(n);
                      registrar("Locação", `reajustou ${atual.imovel} de ${brl(atual.aluguel)} para ${brl(aluguel)}`);
                      avisar("Reajuste aplicado. Vale para as próximas cobranças.");
                    }}
                  />
                )}
                <div>
                  <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide">Últimas cobranças</h3>
                  <ul className="divide-y divide-linha">
                    {dados.cobrancas
                      .filter((c) => c.contratoId === atual.id)
                      .sort((a, b) => b.comp.localeCompare(a.comp))
                      .slice(0, 6)
                      .map((c) => {
                        const s = situacao(c);
                        return (
                          <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                            <span>{brComp(c.comp)}</span>
                            <span className="tabular-nums">{brl(c.aluguel + c.encargos + c.extra)}</span>
                            <Selo tom={s === "paga" ? "ok" : s === "atrasada" ? "erro" : "neutro"}>
                              {s === "paga" ? `Paga em ${br(c.pagoEm)}` : s === "atrasada" ? "Em atraso" : `Vence ${br(c.vencimento)}`}
                            </Selo>
                          </li>
                        );
                      })}
                  </ul>
                </div>
              </div>
            )}
            {aba === "contas" && (existe ? <Contas k={atual} /> : <Nota>Salve o contrato antes de controlar as contas.</Nota>)}
            {aba === "dados" && <Formulario grupos={GRUPOS} valor={atual} onMuda={setEd} />}
            {aba === "saida" && (
              <div className="space-y-4">
                {atual.status === "ativo" && (
                  <Nota>
                    O checklist começa quando o inquilino avisa que vai sair.{" "}
                    <button type="button" className="underline" onClick={() => setEd({ ...atual, status: "encerrando" })}>
                      Iniciar saída
                    </button>
                  </Nota>
                )}
                {atual.status !== "ativo" && (
                  <>
                    <Fita parte={CHECK_SAIDA.filter((c) => atual.saida[c.id]).length} total={CHECK_SAIDA.length} rotulo="Saída" />
                    <Itens itens={CHECK_SAIDA} check={atual.saida} onMuda={(saida) => setEd({ ...atual, saida })} />
                    <Botao
                      tom="cheio"
                      disabled={!CHECK_SAIDA.every((c) => atual.saida[c.id]) || !pode(perfil, "reajuste")}
                      onClick={() => {
                        salvar("contratos", { ...atual, status: "encerrado" });
                        registrar("Locação", `encerrou o contrato de ${atual.imovel}`);
                        avisar("Contrato encerrado");
                        fechar();
                      }}
                    >
                      Encerrar contrato
                    </Botao>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </Gaveta>
      <Confirmar
        aberta={apaga}
        titulo="Excluir este contrato?"
        texto="Cobranças e repasses dele também saem. Para contrato que terminou, use Saída: o histórico conta para o informe e a DIMOB."
        sim="Excluir contrato"
        onNao={() => setApaga(false)}
        onSim={() => {
          if (atual) {
            for (const c of dados.cobrancas.filter((x) => x.contratoId === atual.id)) remover("cobrancas", c.id);
            for (const c of dados.repasses.filter((x) => x.contratoId === atual.id)) remover("repasses", c.id);
            remover("contratos", atual.id);
          }
          setApaga(false);
          fechar();
        }}
      />
    </>
  );
}
