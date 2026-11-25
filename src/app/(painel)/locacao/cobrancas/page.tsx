"use client";
import { ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import { useState } from "react";
import { Formulario } from "@/componentes/formulario";
import { Abas, Botao, Cabecalho, Copiar, estiloBotao, Gaveta, Nota, Numero, Numeros, Selo, type Tom, Vazio } from "@/componentes/ui";
import { agora, br, brCompLongo, competencia, hoje, maisComp } from "@/lib/datas";
import { arred, brl, linkWhats, novoId, num } from "@/lib/formato";
import { acrescimos, calcularRepasse, gerarCobrancas, situacao, textoCobranca, totalCobranca } from "@/lib/locacao";
import { pode } from "@/lib/regras";
import { acao, useSarto } from "@/lib/store";
import type { Cobranca } from "@/lib/tipos";

const SIT: Record<ReturnType<typeof situacao>, { nome: string; tom: Tom }> = {
  paga: { nome: "Paga", tom: "ok" },
  a_vencer: { nome: "A vencer", tom: "neutro" },
  vence_hoje: { nome: "Vence hoje", tom: "alerta" },
  atrasada: { nome: "Em atraso", tom: "erro" },
};

export default function Cobrancas() {
  const { dados, regras, perfil } = useSarto();
  const { varios, mudar, salvar, avisar, registrar, feito } = acao();
  const [comp, setComp] = useState(competencia(hoje()));
  const [aba, setAba] = useState<"cobrancas" | "atrasos" | "repasses">("cobrancas");
  const [baixa, setBaixa] = useState<Cobranca | null>(null);
  const [form, setForm] = useState({ pagoEm: hoje(), valorPago: 0, descontos: 0, motivo: "" });

  const k = (id: string) => dados.contratos.find((c) => c.id === id);
  const doMes = dados.cobrancas.filter((c) => c.comp === comp).sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const atrasos = dados.cobrancas.filter((c) => situacao(c) === "atrasada").sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const reps = dados.repasses.filter((r) => r.comp === comp).sort((a, b) => a.previsto.localeCompare(b.previsto));
  const faltaGerar = gerarCobrancas(dados.contratos, dados.cobrancas, comp, () => "x").length;
  const lista = aba === "atrasos" ? atrasos : doMes;
  const soma = (xs: Cobranca[]) => xs.reduce((a, c) => a + totalCobranca(c), 0);

  const abrirBaixa = (c: Cobranca) => {
    const ct = k(c.contratoId);
    setForm({ pagoEm: hoje(), valorPago: ct ? acrescimos(c, ct).total : totalCobranca(c), descontos: 0, motivo: "" });
    setBaixa(c);
  };
  const darBaixa = () => {
    if (!baixa) return;
    const ct = k(baixa.contratoId);
    const c = { ...baixa, pagoEm: form.pagoEm, valorPago: form.valorPago };
    salvar("cobrancas", c);
    if (ct && !dados.repasses.some((r) => r.contratoId === ct.id && r.comp === c.comp)) {
      salvar("repasses", calcularRepasse(c, ct, regras, form.descontos, form.motivo, novoId()));
      avisar("Baixa feita. O repasse foi para aprovação.");
    } else avisar("Baixa feita");
    registrar("Locação", `deu baixa em ${brl(form.valorPago)} de ${ct?.inquilino.nome ?? ""}`);
    setBaixa(null);
  };
  const avisado = (c: Cobranca, tipo: string) => mudar("cobrancas", c.id, { avisos: [...c.avisos, { em: agora(), tipo }] });

  return (
    <>
      <Cabecalho area="LOCAÇÃO COBRANÇAS" titulo="Cobranças e repasses" texto="Gera o mês, calcula multa e juros, abre a mensagem pronta no WhatsApp e calcula o repasse na baixa.">
        {faltaGerar > 0 && (
          <Botao
            tom="cheio"
            onClick={() => {
              const n = gerarCobrancas(dados.contratos, dados.cobrancas, comp, novoId);
              varios("cobrancas", n);
              registrar("Locação", `gerou ${n.length} cobranças de ${brCompLongo(comp)}`);
              avisar(`${n.length} cobranças geradas`);
            }}
          >
            Gerar {faltaGerar} {faltaGerar === 1 ? "cobrança" : "cobranças"} do mês
          </Botao>
        )}
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
        <Numero valor={brl(soma(doMes), false)} nome="Cobrado no mês" nota={`${doMes.length} cobranças`} />
        <Numero
          valor={brl(
            doMes.reduce((a, c) => a + (c.valorPago ?? 0), 0),
            false,
          )}
          nome="Recebido"
        />
        <Numero valor={brl(soma(atrasos), false)} nome="Em atraso, todos os meses" nota={`${atrasos.length} ${atrasos.length === 1 ? "cobrança" : "cobranças"}`} />
        <Numero
          valor={brl(
            reps.reduce((a, r) => a + r.taxa, 0),
            false,
          )}
          nome="Taxa da Sarto no mês"
        />
      </Numeros>

      <Abas
        atual={aba}
        onMuda={setAba}
        itens={[
          { id: "cobrancas", nome: "Cobranças do mês", n: doMes.length },
          { id: "atrasos", nome: "Em atraso", n: atrasos.length },
          { id: "repasses", nome: "Repasses do mês", n: reps.length },
        ]}
      />

      {aba !== "repasses" &&
        (lista.length === 0 ? (
          <Vazio>{aba === "atrasos" ? "Ninguém em atraso." : "Nenhuma cobrança neste mês."}</Vazio>
        ) : (
          <div className="overflow-x-auto">
            <table className="tabela min-w-[880px]">
              <thead>
                <tr>
                  <th>Inquilino</th>
                  <th>Vencimento</th>
                  <th className="n">Valor</th>
                  <th className="n">Multa e juros</th>
                  <th className="n">Total hoje</th>
                  <th>Situação</th>
                  <th>Avisos</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lista.map((c) => {
                  const ct = k(c.contratoId);
                  if (!ct) return null;
                  const a = acrescimos(c, ct);
                  const s = situacao(c);
                  return (
                    <tr key={c.id}>
                      <td>
                        <span className="font-medium">{ct.inquilino.nome}</span>
                        <span className="block text-[13px] text-cinza">{ct.imovel}</span>
                      </td>
                      <td>{br(c.vencimento)}</td>
                      <td className="n" title={c.extraMotivo}>
                        {brl(totalCobranca(c))}
                        {c.extra > 0 && <span className="block text-[12px] text-cinza">inclui {brl(c.extra)}</span>}
                      </td>
                      <td className="n">{s === "atrasada" ? brl(a.multa + a.juros) : "—"}</td>
                      <td className="n font-medium">{s === "paga" ? brl(c.valorPago) : brl(a.total)}</td>
                      <td>
                        <Selo tom={SIT[s].tom}>{s === "atrasada" ? `${a.dias} ${a.dias === 1 ? "dia" : "dias"}` : SIT[s].nome}</Selo>
                      </td>
                      <td className="text-[13px] text-cinza">{c.avisos.length ? `${c.avisos.length}, último ${br(c.avisos[c.avisos.length - 1].em.slice(0, 10))}` : "—"}</td>
                      <td>
                        {s !== "paga" && (
                          <span className="flex justify-end gap-1.5">
                            <a
                              className={estiloBotao("linha", true)}
                              href={linkWhats(ct.inquilino.tel, textoCobranca(c, ct))}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => avisado(c, s)}
                              title="Abre a mensagem pronta no WhatsApp"
                            >
                              <MessageCircle size={15} /> Avisar
                            </a>
                            <Botao pequeno tom="cheio" onClick={() => abrirBaixa(c)}>
                              Dar baixa
                            </Botao>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}

      {aba === "repasses" &&
        (reps.length === 0 ? (
          <Vazio>O repasse nasce quando a cobrança do mês recebe baixa.</Vazio>
        ) : (
          <div className="overflow-x-auto">
            <table className="tabela min-w-[880px]">
              <thead>
                <tr>
                  <th>Proprietário</th>
                  <th className="n">Aluguel</th>
                  <th className="n">Taxa</th>
                  <th className="n">Descontos</th>
                  <th className="n">Líquido</th>
                  <th>Previsto</th>
                  <th>Situação</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {reps.map((r) => {
                  const ct = k(r.contratoId);
                  return (
                    <tr key={r.id}>
                      <td>
                        <span className="font-medium">{ct?.proprietario.nome}</span>
                        <span className="block text-[13px] text-cinza">{ct?.imovel}</span>
                      </td>
                      <td className="n">{brl(r.bruto)}</td>
                      <td className="n">
                        {brl(r.taxa)}
                        <span className="block text-[12px] text-cinza">{r.taxaPct === 100 ? "1º aluguel" : `${num(r.taxaPct)}%`}</span>
                      </td>
                      <td className="n" title={r.descontoMotivo}>
                        {r.descontos ? brl(r.descontos) : "—"}
                      </td>
                      <td className="n font-semibold">{brl(r.liquido)}</td>
                      <td>{br(r.previsto)}</td>
                      <td>
                        <Selo tom={r.status === "pago" ? "ok" : r.status === "aprovado" ? "forte" : "alerta"}>
                          {r.status === "pago"
                            ? r.liquido === 0
                              ? "Sem repasse"
                              : `Pago em ${br(r.pagoEm)}`
                            : r.status === "aprovado"
                              ? `Aprovado por ${r.aprovado?.por}`
                              : "Espera aprovação"}
                        </Selo>
                      </td>
                      <td>
                        <span className="flex justify-end gap-1.5">
                          {r.status === "calculado" && (
                            <Botao
                              pequeno
                              tom="cheio"
                              disabled={!pode(perfil, "repasse")}
                              onClick={() => {
                                mudar("repasses", r.id, { status: "aprovado", aprovado: feito() });
                                registrar("Locação", `aprovou repasse de ${brl(r.liquido)} (${ct?.imovel ?? ""})`);
                              }}
                            >
                              Aprovar
                            </Botao>
                          )}
                          {r.status === "aprovado" && (
                            <>
                              {ct?.proprietario.pix && <Copiar texto={ct.proprietario.pix}>Copiar Pix</Copiar>}
                              <Botao pequeno tom="cheio" onClick={() => mudar("repasses", r.id, { status: "pago", pagoEm: hoje() })}>
                                Marcar pago
                              </Botao>
                            </>
                          )}
                          <a className={estiloBotao("linha", true)} href={`/imprimir?tipo=extrato&id=${r.id}`} target="_blank" rel="noreferrer">
                            Extrato
                          </a>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}

      <div className="mt-8">
        <Nota>Boleto, Pix automático e baixa sem mão humana dependem da conta no Asaas. Até lá, a baixa é manual e o Pix do repasse sai pelo banco.</Nota>
      </div>

      <Gaveta
        aberta={!!baixa}
        titulo="Dar baixa"
        sub={baixa && `${k(baixa.contratoId)?.inquilino.nome}, ${brCompLongo(baixa.comp)}`}
        onFecha={() => setBaixa(null)}
        rodape={
          <Botao tom="cheio" onClick={darBaixa} disabled={!form.valorPago || !form.pagoEm}>
            Confirmar baixa
          </Botao>
        }
      >
        {baixa && (
          <>
            <Formulario
              grupos={[
                {
                  grupo: "Pagamento",
                  campos: [
                    { k: "pagoEm", nome: "Pago em", tipo: "data", col: 3 },
                    { k: "valorPago", nome: "Valor recebido", tipo: "dinheiro", col: 3 },
                  ],
                },
                {
                  grupo: "Desconto no repasse",
                  campos: [
                    { k: "descontos", nome: "Valor", tipo: "dinheiro", col: 2, dica: "Ex.: reparo pago pela Sarto" },
                    { k: "motivo", nome: "Motivo", col: 4 },
                  ],
                },
              ]}
              valor={form}
              onMuda={setForm}
            />
            {Math.abs(arred(form.valorPago - totalCobranca(baixa))) > 0.01 && (
              <p className="mt-4 text-[13px] text-cinza">
                Diferença para o valor original: {brl(form.valorPago - totalCobranca(baixa))}. O repasse usa só o aluguel; multa e juros ficam registrados no valor recebido.
              </p>
            )}
          </>
        )}
      </Gaveta>
    </>
  );
}
