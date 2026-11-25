"use client";
import Link from "next/link";
import { Botao, Cabecalho, Cartao, Selo, Vazio } from "@/componentes/ui";
import { br, prazo } from "@/lib/datas";
import { brl, num } from "@/lib/formato";
import { pendenciasDe } from "@/lib/hoje";
import { dividirComissao } from "@/lib/juridico";
import { pode, quemPode } from "@/lib/regras";
import { acao, useSarto } from "@/lib/store";

export default function Aprovacoes() {
  const { dados, regras, perfil } = useSarto();
  const { mudar, registrar, avisar, feito } = acao();
  const contrato = (id: string) => dados.contratos.find((c) => c.id === id);
  const repasses = dados.repasses.filter((r) => r.status === "calculado");
  const multas = dados.multas.filter((m) => m.status === "proposta");
  const comissoes = dados.vendas.filter((v) => v.comissaoStatus === "enviada");
  const outras = pendenciasDe(perfil, dados, regras).filter((p) => p.aprovar && p.href !== "/aprovacoes");
  const totalRep = repasses.reduce((a, r) => a + r.liquido, 0);

  const aprovarRepasse = (id: string) => {
    const r = dados.repasses.find((x) => x.id === id);
    if (!r) return;
    mudar("repasses", id, { status: "aprovado", aprovado: feito() });
    registrar("Locação", `aprovou repasse de ${brl(r.liquido)} (${contrato(r.contratoId)?.imovel ?? ""})`);
    avisar("Repasse aprovado");
  };

  return (
    <>
      <Cabecalho area="GESTÃO APROVAÇÕES" titulo="Aprovações" texto="Dinheiro, contrato e conteúdo só andam com o sim de quem responde por eles." />
      <div className="space-y-5">
        <Cartao
          titulo={`Repasses (${repasses.length})`}
          acao={
            repasses.length > 1 && pode(perfil, "repasse") ? (
              <Botao pequeno onClick={() => repasses.forEach((r) => aprovarRepasse(r.id))}>
                Aprovar todos: {brl(totalRep)}
              </Botao>
            ) : undefined
          }
        >
          {repasses.length === 0 ? (
            <p className="text-cinza">Nenhum repasse esperando aprovação.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="tabela min-w-[720px]">
                <thead>
                  <tr>
                    <th>Proprietário</th>
                    <th>Imóvel</th>
                    <th className="n">Aluguel</th>
                    <th className="n">Taxa</th>
                    <th className="n">Descontos</th>
                    <th className="n">Líquido</th>
                    <th>Previsto</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {repasses.map((r) => (
                    <tr key={r.id}>
                      <td className="font-medium">{contrato(r.contratoId)?.proprietario.nome}</td>
                      <td>{contrato(r.contratoId)?.imovel}</td>
                      <td className="n">{brl(r.bruto)}</td>
                      <td className="n">
                        {brl(r.taxa)} <span className="text-cinza">({num(r.taxaPct)}%)</span>
                      </td>
                      <td className="n" title={r.descontoMotivo}>
                        {r.descontos ? brl(r.descontos) : "—"}
                      </td>
                      <td className="n font-semibold">{brl(r.liquido)}</td>
                      <td>
                        {br(r.previsto)} <span className="text-[12px] text-cinza">{prazo(r.previsto)}</span>
                      </td>
                      <td>
                        <Botao pequeno tom="cheio" disabled={!pode(perfil, "repasse")} title={pode(perfil, "repasse") ? undefined : `Quem aprova: ${quemPode("repasse")}`} onClick={() => aprovarRepasse(r.id)}>
                          Aprovar
                        </Botao>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Cartao>

        <Cartao titulo={`Comissões (${comissoes.length})`}>
          {comissoes.length === 0 ? (
            <p className="text-cinza">Nenhum relatório de comissão enviado.</p>
          ) : (
            comissoes.map((v) => {
              const c = dividirComissao(v, regras, dados.corretores.find((x) => x.id === v.corretorId)?.nome ?? "");
              return (
                <div key={v.id} className="border-t border-linha py-3 first:border-0 first:pt-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{v.imovel}</p>
                      <p className="text-[13px] text-cinza">
                        Venda de {brl(v.valor)}, comissão de {num(v.comissaoPct)}% = {brl(c.total)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/pos-venda?v=${v.id}`} className="inline-flex min-h-9 items-center px-2 text-[13px] underline underline-offset-4">
                        Ver venda
                      </Link>
                      <Botao
                        pequeno
                        tom="cheio"
                        disabled={!pode(perfil, "comissao") || !c.valido}
                        title={pode(perfil, "comissao") ? undefined : `Quem aprova: ${quemPode("comissao")}`}
                        onClick={() => {
                          mudar("vendas", v.id, { comissaoStatus: "aprovada", comissaoAprovada: feito(), checklist: { ...v.checklist, ok: feito() } });
                          registrar("Comissão", `aprovou comissão de ${brl(c.total)} (${v.imovel})`);
                          avisar("Comissão aprovada. Falta a Verônica lançar.");
                        }}
                      >
                        Dar OK
                      </Botao>
                    </div>
                  </div>
                  <ul className="mt-2 grid gap-x-8 gap-y-1 text-[13px] sm:grid-cols-2">
                    {c.linhas.map((l) => (
                      <li key={l.nome + l.papel} className="flex justify-between gap-3">
                        <span>
                          {l.nome} <span className="text-cinza">{l.papel}</span>
                        </span>
                        <span className="tabular-nums">
                          {num(l.pct)}% · {brl(l.valor)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {!c.valido && <Selo tom="erro">A divisão passa de 100%</Selo>}
                </div>
              );
            })
          )}
        </Cartao>

        <Cartao titulo={`Multas propostas (${multas.length})`}>
          {multas.length === 0 ? (
            <p className="text-cinza">Nenhuma multa proposta.</p>
          ) : (
            <ul className="divide-y divide-linha">
              {multas.map((m) => {
                const k = contrato(m.contratoId);
                const decidir = (status: "aprovada" | "recusada") => {
                  mudar("multas", m.id, { status, decisao: feito() });
                  registrar("Locação", `${status === "aprovada" ? "aprovou" : "recusou"} multa de ${brl(m.valor)} (${k?.imovel ?? ""})`);
                  if (status === "aprovada") {
                    const c = dados.cobrancas.filter((x) => x.contratoId === m.contratoId && !x.pagoEm).sort((a, b) => a.vencimento.localeCompare(b.vencimento))[0];
                    if (c) {
                      mudar("cobrancas", c.id, { extra: c.extra + m.valor, extraMotivo: [c.extraMotivo, `Multa: ${m.motivo}`].filter(Boolean).join("; ") });
                      avisar("Multa aprovada e somada à próxima cobrança em aberto");
                    } else avisar("Multa aprovada. Não há cobrança em aberto: some na próxima.");
                  } else avisar("Multa recusada");
                };
                return (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-medium">
                        {k?.inquilino.nome}: {brl(m.valor)}
                      </p>
                      <p className="text-[13px] text-cinza">
                        {m.motivo} ({m.clausula}). {k?.imovel}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Botao pequeno disabled={!pode(perfil, "multa")} onClick={() => decidir("recusada")}>
                        Recusar
                      </Botao>
                      <Botao pequeno tom="cheio" disabled={!pode(perfil, "multa")} onClick={() => decidir("aprovada")}>
                        Aprovar
                      </Botao>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Cartao>

        {outras.length > 0 && (
          <Cartao titulo="Nas outras telas">
            <ul className="divide-y divide-linha">
              {outras.map((p) => (
                <li key={p.id}>
                  <Link href={p.href} className="flex items-center justify-between gap-3 py-2 hover:underline">
                    <span>
                      {p.texto} <span className="text-[13px] text-cinza">{p.detalhe}</span>
                    </span>
                    <Selo>{p.area}</Selo>
                  </Link>
                </li>
              ))}
            </ul>
          </Cartao>
        )}
        {repasses.length + comissoes.length + multas.length + outras.length === 0 && <Vazio>Tudo aprovado.</Vazio>}
      </div>
    </>
  );
}
