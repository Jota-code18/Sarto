"use client";
import { ChevronLeft, ChevronRight, Plus, Upload } from "lucide-react";
import { useState } from "react";
import { Formulario } from "@/componentes/formulario";
import { Abas, Barras, Botao, Cabecalho, Cartao, Colunas, Confirmar, estiloBotao, Gaveta, Numero, Numeros, Selo, Vazio } from "@/componentes/ui";
import { br, brComp, brCompLongo, competencia, diaNoMes, hoje, maisComp, prazo } from "@/lib/datas";
import { CATEGORIAS, categorizar, lerExtratoCsv, lerOfx } from "@/lib/extrato";
import { baixarArquivo, brl, brlCurto, csv, novoId } from "@/lib/formato";
import { acao, useSarto } from "@/lib/store";
import type { ContaPagar, Lancamento } from "@/lib/tipos";

export default function Financeiro() {
  const { dados, regras } = useSarto();
  const { salvar, remover, varios, avisar, registrar, mudar } = acao();
  const [comp, setComp] = useState(competencia(hoje()));
  const [aba, setAba] = useState<"pagar" | "lancamentos">("pagar");
  const [cp, setCp] = useState<ContaPagar | null>(null);
  const [la, setLa] = useState<(Lancamento & { sai: boolean }) | null>(null);
  const [apaga, setApaga] = useState(false);

  const lan = dados.lancamentos.filter((l) => l.data.startsWith(comp)).sort((a, b) => b.data.localeCompare(a.data));
  const ent = lan.filter((l) => l.valor > 0).reduce((a, l) => a + l.valor, 0);
  const sai = -lan.filter((l) => l.valor < 0).reduce((a, l) => a + l.valor, 0);
  const abertas = dados.contasPagar.filter((c) => !c.pagoEm).sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const pagas = dados.contasPagar.filter((c) => c.pagoEm?.startsWith(comp));
  const cat = [...lan.filter((l) => l.valor < 0).reduce((m, l) => m.set(l.categoria, (m.get(l.categoria) ?? 0) - l.valor), new Map<string, number>())]
    .map(([nome, valor]) => ({ nome, valor, rotulo: brl(valor, false) }))
    .sort((a, b) => b.valor - a.valor);
  const serie = [-5, -4, -3, -2, -1, 0].map((n) => {
    const c = maisComp(comp, n);
    return {
      nome: brComp(c),
      valor: Math.max(
        0,
        dados.lancamentos.filter((l) => l.data.startsWith(c)).reduce((a, l) => a + l.valor, 0),
      ),
    };
  });
  const foraDia = abertas.filter((c) => Number(c.vencimento.slice(8)) !== regras.diaFornecedores);

  const importar = async (f?: File) => {
    if (!f) return;
    const buf = await f.arrayBuffer();
    // bancos ainda exportam em latin1
    let t = new TextDecoder("utf-8").decode(buf);
    if (t.includes("�")) t = new TextDecoder("windows-1252").decode(buf);
    const ls = /<OFX>|<STMTTRN>/i.test(t) ? lerOfx(t) : lerExtratoCsv(t);
    const chave = (l: { data: string; descricao: string; valor: number; fitid?: string }) => l.fitid ?? `${l.data}|${l.descricao}|${l.valor}`;
    const tem = new Set(dados.lancamentos.map((l) => chave(l)));
    const novos = ls.filter((l) => !tem.has(chave(l))).map((l): Lancamento => ({ id: novoId(), ...l, categoria: categorizar(l.descricao), origem: "extrato" }));
    if (!ls.length) return avisar("Não reconheci o arquivo. Use OFX ou CSV com Data, Descrição e Valor.", "erro");
    varios("lancamentos", novos);
    registrar("Financeiro", `importou ${novos.length} lançamentos do extrato`);
    avisar(`${novos.length} novos, ${ls.length - novos.length} já existiam`);
  };

  const pagar = (c: ContaPagar) => {
    mudar("contasPagar", c.id, { pagoEm: hoje() });
    salvar("lancamentos", { id: novoId(), data: hoje(), descricao: c.fornecedor, valor: -c.valor, categoria: c.categoria, origem: "manual" });
    if (c.recorrente) {
      const prox = maisComp(c.vencimento.slice(0, 7), 1);
      salvar("contasPagar", { ...c, id: novoId(), vencimento: diaNoMes(prox, Number(c.vencimento.slice(8))), pagoEm: undefined });
    }
    registrar("Financeiro", `pagou ${c.fornecedor}: ${brl(c.valor)}`);
    avisar(c.recorrente ? "Paga. A do próximo mês foi criada." : "Paga");
  };

  return (
    <>
      <Cabecalho area="GESTÃO FINANCEIRO" titulo="Financeiro" texto="Entradas e saídas pelo extrato do banco, e contas a pagar concentradas no mesmo dia.">
        <label className={estiloBotao()}>
          <Upload size={16} /> Importar extrato
          <input type="file" accept=".ofx,.csv,.txt" className="sr-only" onChange={(e) => importar(e.target.files?.[0])} />
        </label>
        <Botao onClick={() => setLa({ id: novoId(), data: hoje(), descricao: "", valor: 0, categoria: "Outros", origem: "manual", sai: true })}>Lançar</Botao>
        <Botao
          tom="cheio"
          onClick={() =>
            setCp({ id: novoId(), fornecedor: "", categoria: "Escritório", valor: 0, vencimento: diaNoMes(competencia(hoje()), regras.diaFornecedores), recorrente: true })
          }
        >
          <Plus size={16} /> Conta a pagar
        </Botao>
      </Cabecalho>
      <div className="mb-5 flex items-center gap-2">
        <Botao pequeno aria-label="Mês anterior" onClick={() => setComp(maisComp(comp, -1))}>
          <ChevronLeft size={16} />
        </Botao>
        <span className="min-w-44 text-center text-[16px] font-medium">{brCompLongo(comp)}</span>
        <Botao pequeno aria-label="Próximo mês" onClick={() => setComp(maisComp(comp, 1))}>
          <ChevronRight size={16} />
        </Botao>
      </div>
      <Numeros>
        <Numero valor={brlCurto(ent)} nome="Entradas" />
        <Numero valor={brlCurto(sai)} nome="Saídas" />
        <Numero valor={brlCurto(ent - sai)} nome="Resultado" />
        <Numero valor={brlCurto(abertas.reduce((a, c) => a + c.valor, 0))} nome="A pagar" nota={`${abertas.length} contas`} />
      </Numeros>
      <div className="mb-7 grid gap-5 lg:grid-cols-2">
        <Cartao titulo="Resultado por mês">
          <Colunas dados={serie} formato={brlCurto} />
        </Cartao>
        <Cartao titulo="Saídas por categoria">
          <Barras dados={cat.slice(0, 6)} vazio="Sem saídas neste mês." />
        </Cartao>
      </div>
      <Abas
        atual={aba}
        onMuda={setAba}
        itens={[
          { id: "pagar", nome: "Contas a pagar", n: abertas.length },
          { id: "lancamentos", nome: "Lançamentos do mês", n: lan.length },
        ]}
      />
      {aba === "pagar" && (
        <>
          {foraDia.length > 0 && (
            <p className="mb-3 text-[13px] text-cinza">
              {foraDia.length} {foraDia.length === 1 ? "conta vence" : "contas vencem"} fora do dia {regras.diaFornecedores}: {foraDia.map((c) => c.fornecedor).join(", ")}.
            </p>
          )}
          {abertas.length === 0 ? (
            <Vazio>Nenhuma conta em aberto.</Vazio>
          ) : (
            <div className="overflow-x-auto">
              <table className="tabela min-w-[640px]">
                <thead>
                  <tr>
                    <th>Fornecedor</th>
                    <th>Categoria</th>
                    <th>Vencimento</th>
                    <th className="n">Valor</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {abertas.map((c) => (
                    <tr key={c.id} className="clica">
                      <td>
                        <button type="button" className="font-medium hover:underline" onClick={() => setCp(c)}>
                          {c.fornecedor}
                        </button>
                        {c.recorrente && <span className="block text-[12px] text-cinza">todo mês</span>}
                      </td>
                      <td>{c.categoria}</td>
                      <td>
                        {br(c.vencimento)} <Selo tom={c.vencimento < hoje() ? "erro" : "neutro"}>{prazo(c.vencimento)}</Selo>
                      </td>
                      <td className="n">{brl(c.valor)}</td>
                      <td className="text-right">
                        <Botao pequeno tom="cheio" onClick={() => pagar(c)}>
                          Marcar paga
                        </Botao>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {pagas.length > 0 && (
            <p className="mt-3 text-[13px] text-cinza">
              Pagas em {brComp(comp)}: {pagas.map((c) => c.fornecedor).join(", ")}.
            </p>
          )}
        </>
      )}
      {aba === "lancamentos" &&
        (lan.length === 0 ? (
          <Vazio>Nenhum lançamento. Exporte o extrato do banco em OFX e importe aqui.</Vazio>
        ) : (
          <>
            <div className="mb-3 text-right">
              <Botao
                pequeno
                onClick={() =>
                  baixarArquivo(
                    `financeiro-${comp}.csv`,
                    csv([["Data", "Descrição", "Categoria", "Valor", "Origem"], ...lan.map((l) => [br(l.data), l.descricao, l.categoria, l.valor, l.origem])]),
                    "text/csv;charset=utf-8",
                  )
                }
              >
                Exportar planilha
              </Botao>
            </div>
            <div className="overflow-x-auto">
              <table className="tabela min-w-[640px]">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Categoria</th>
                    <th className="n">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {lan.map((l) => (
                    <tr key={l.id} className="clica">
                      <td>{br(l.data)}</td>
                      <td>
                        <button type="button" className="text-left hover:underline" onClick={() => setLa({ ...l, valor: Math.abs(l.valor), sai: l.valor < 0 })}>
                          {l.descricao}
                        </button>
                      </td>
                      <td>
                        <select
                          className="campo min-h-9 w-auto py-1"
                          aria-label="Categoria"
                          value={l.categoria}
                          onChange={(e) => mudar("lancamentos", l.id, { categoria: e.target.value })}
                        >
                          {[...new Set([...CATEGORIAS, l.categoria])].map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </td>
                      <td className="n font-medium">{brl(l.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ))}

      <Gaveta
        aberta={!!cp}
        titulo={cp?.fornecedor || "Conta a pagar"}
        onFecha={() => setCp(null)}
        rodape={
          cp && (
            <>
              {dados.contasPagar.some((c) => c.id === cp.id) && (
                <Botao tom="texto" onClick={() => setApaga(true)}>
                  Excluir
                </Botao>
              )}
              <Botao
                tom="cheio"
                disabled={!cp.fornecedor || !cp.valor}
                onClick={() => {
                  salvar("contasPagar", cp);
                  avisar("Conta salva");
                  setCp(null);
                }}
              >
                Salvar conta
              </Botao>
            </>
          )
        }
      >
        {cp && (
          <Formulario
            grupos={[
              {
                grupo: "",
                campos: [
                  { k: "fornecedor", nome: "Fornecedor", col: 6 },
                  { k: "categoria", nome: "Categoria", tipo: "opcoes", opcoes: CATEGORIAS, col: 3 },
                  { k: "valor", nome: "Valor", tipo: "dinheiro", col: 3 },
                  { k: "vencimento", nome: "Vencimento", tipo: "data", col: 3 },
                  { k: "recorrente", nome: "Repete todo mês", tipo: "sim", col: 3 },
                ],
              },
            ]}
            valor={cp}
            onMuda={setCp}
          />
        )}
      </Gaveta>
      <Gaveta
        aberta={!!la}
        titulo="Lançamento"
        onFecha={() => setLa(null)}
        rodape={
          la && (
            <>
              {dados.lancamentos.some((l) => l.id === la.id) && (
                <Botao
                  tom="texto"
                  onClick={() => {
                    remover("lancamentos", la.id);
                    setLa(null);
                  }}
                >
                  Excluir
                </Botao>
              )}
              <Botao
                tom="cheio"
                disabled={!la.descricao || !la.valor}
                onClick={() => {
                  const { sai: s, ...l } = la;
                  salvar("lancamentos", { ...l, valor: s ? -Math.abs(l.valor) : Math.abs(l.valor) });
                  avisar("Lançamento salvo");
                  setLa(null);
                }}
              >
                Salvar
              </Botao>
            </>
          )
        }
      >
        {la && (
          <Formulario
            grupos={[
              {
                grupo: "",
                campos: [
                  { k: "descricao", nome: "Descrição", col: 6 },
                  { k: "data", nome: "Data", tipo: "data", col: 3 },
                  { k: "valor", nome: "Valor", tipo: "dinheiro", col: 3 },
                  { k: "categoria", nome: "Categoria", tipo: "opcoes", opcoes: CATEGORIAS, col: 3 },
                  { k: "sai", nome: "É saída", tipo: "sim", col: 3 },
                ],
              },
            ]}
            valor={la}
            onMuda={setLa}
          />
        )}
      </Gaveta>
      <Confirmar
        aberta={apaga}
        titulo="Excluir esta conta?"
        texto="Ela sai das contas a pagar. Pagamentos já lançados continuam."
        sim="Excluir conta"
        onNao={() => setApaga(false)}
        onSim={() => {
          if (cp) remover("contasPagar", cp.id);
          setApaga(false);
          setCp(null);
        }}
      />
    </>
  );
}
