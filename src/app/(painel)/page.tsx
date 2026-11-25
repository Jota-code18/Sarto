"use client";
import Link from "next/link";
import { Contato, FotoAnuncio, LinkPortal } from "@/componentes/anuncio";
import { useCarteira } from "@/componentes/uso";
import { melhorContato, montarGrupos, precoM2 } from "@/lib/varredura";
import { useMemo } from "react";
import { Barras, Cabecalho, Cartao, Colunas, Costura, Numero, Numeros, Selo, Vazio } from "@/componentes/ui";
import { doDia } from "@/lib/agenda";
import { brComp, brHora, competencia, diaSemana, hoje, maisComp, porExtenso } from "@/lib/datas";
import { brl, brlCurto, num } from "@/lib/formato";
import { indicadores, pendenciasDe } from "@/lib/hoje";
import { PERFIS } from "@/lib/regras";
import { nomeAtual, useSarto } from "@/lib/store";

export default function Inicio() {
  const { dados, regras, perfil } = useSarto();
  const { carteira } = useCarteira();
  const veVarredura = perfil === "socios" || perfil === "comercial";
  const captar = useMemo(
    () =>
      veVarredura
        ? montarGrupos(dados.anuncios, carteira, regras).filter((g) => g.particular && g.noPadrao && !g.sarto && [g.principal, ...g.outros].every((a) => a.status === "abordar"))
        : [],
    [veVarredura, dados.anuncios, carteira, regras],
  );
  const h = hoje();
  const comp = competencia(h);
  const pend = pendenciasDe(perfil, dados, regras);
  const i = indicadores(dados);
  const agenda = doDia(dados.eventos, h);
  const serie = [-5, -4, -3, -2, -1, 0].map((m) => {
    const c = maisComp(comp, m);
    return { nome: brComp(c), valor: dados.cobrancas.filter((x) => x.comp === c && x.pagoEm).reduce((a, x) => a + (x.valorPago ?? 0), 0) };
  });
  const gestor = perfil === "socios" || perfil === "comercial" || perfil === "locacao";
  const meta = (v: number, m: number) => (m ? `${num((v / m) * 100)}% da meta de ${num(m)}` : undefined);

  return (
    <>
      <Cabecalho area={`PAINEL ${PERFIS[perfil].area.split(" ")[0].toUpperCase()}`} titulo={useSarto(nomeAtual)} texto={`${diaSemana(h)}, ${porExtenso(h)}`} />

      {gestor && (
        <Numeros>
          {perfil !== "locacao" && (
            <Numero
              valor={brlCurto(i.vgv)}
              nome="VGV do mês"
              nota={regras.metaVgv ? `${num((i.vgv / regras.metaVgv) * 100)}% da meta` : `${i.vendas} ${i.vendas === 1 ? "venda" : "vendas"}`}
              href="/pos-venda"
            />
          )}
          {perfil !== "locacao" && <Numero valor={i.leads} nome="Leads no mês" nota={meta(i.leads, regras.metaLeads)} href="/leads" />}
          {perfil !== "locacao" && (
            <Numero
              valor={i.captacoes}
              nome="Captações no mês"
              nota={i.captacoesVarredura ? `${i.captacoesVarredura} da varredura` : meta(i.captacoes, regras.metaCaptacoes)}
              href="/captacao"
            />
          )}
          {perfil !== "comercial" && (
            <Numero valor={brlCurto(i.recebidoLocacao)} nome="Aluguéis recebidos" nota={`de ${brl(i.faturamentoLocacao, false)} no mês`} href="/locacao/cobrancas" />
          )}
          {perfil === "comercial" && <Numero valor={i.visitas} nome="Visitas no mês" nota={meta(i.visitas, regras.metaVisitas)} href="/agenda" />}
          {perfil === "locacao" && (
            <>
              <Numero
                valor={i.atrasados.length}
                nome="Aluguéis em atraso"
                nota={brl(
                  i.atrasados.reduce((a, c) => a + c.aluguel + c.encargos, 0),
                  false,
                )}
                href="/locacao/cobrancas"
              />
              <Numero valor={brlCurto(i.repassesAbertos)} nome="Repasses em aberto" href="/aprovacoes" />
              <Numero valor={brlCurto(i.aPagar)} nome="Contas a pagar" href="/financeiro" />
            </>
          )}
        </Numeros>
      )}

      {captar.length > 0 && (
        <section className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide">
              Donos para abordar <span className="font-normal text-cinza">{captar.length}</span>
            </h2>
            <Link href="/varredura" className="toque inline-flex items-center text-[13px] underline underline-offset-4">
              Abrir varredura
            </Link>
          </div>
          <Costura className="my-3" />
          <ul className="divide-y divide-linha">
            {captar.slice(0, 5).map((g) => {
              const a = melhorContato(g);
              return (
                <li key={g.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                  <FotoAnuncio foto={[a, g.principal, ...g.outros].find((x) => x.foto)?.foto} className="h-16 w-20" />
                  <div className="min-w-0 flex-1 basis-52">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-medium">{a.titulo}</span>
                      <LinkPortal a={a} />
                    </p>
                    <p className="text-[13px] text-cinza">
                      {[a.bairro, brl(a.preco, false), a.area ? `${num(a.area)} m²` : "", precoM2(a) ? `${brl(precoM2(a), false)}/m²` : ""].filter(Boolean).join(", ")}
                    </p>
                  </div>
                  <Contato a={a} />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.45fr_1fr]">
        <section className="min-w-0">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide">
            Precisa de você <span className="font-normal text-cinza">{pend.length}</span>
          </h2>
          <Costura className="my-3" />
          {pend.length === 0 ? (
            <Vazio>Nada esperando você agora.</Vazio>
          ) : (
            <ul className="divide-y divide-linha">
              {pend.slice(0, 14).map((p) => (
                <li key={p.id}>
                  <Link href={p.href} className="-mx-2 flex items-start gap-3 px-2 py-2.5 hover:bg-linho">
                    <span className="w-[86px] shrink-0 pt-0.5 text-[12px] text-cinza">{p.area}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{p.texto}</span>
                      {p.detalhe && <span className="block text-[13px] text-cinza">{p.detalhe}</span>}
                    </span>
                    {p.aprovar ? <Selo tom="forte">Aprovar</Selo> : p.grave ? <Selo tom="erro">Urgente</Selo> : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {pend.length > 14 && <p className="mt-2 text-[13px] text-cinza">E mais {pend.length - 14}, nas seções de cada área.</p>}
        </section>

        <div className="min-w-0 space-y-5">
          <Cartao
            titulo="Hoje na agenda"
            acao={
              <Link href="/agenda" className="text-[13px] underline underline-offset-4">
                Abrir
              </Link>
            }
          >
            {agenda.length === 0 ? (
              <p className="text-[13px] text-cinza">Nenhum compromisso hoje.</p>
            ) : (
              <ul className="space-y-2">
                {agenda.map((e) => (
                  <li key={e.id} className="flex gap-3">
                    <span className="w-11 shrink-0 tabular-nums text-cinza">{e.inicio}</span>
                    <span className="min-w-0">
                      <span className="block font-medium">{e.titulo}</span>
                      <span className="block text-[13px] text-cinza">{[e.quem, e.local].filter(Boolean).join(", ")}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>

          {gestor && perfil !== "comercial" && (
            <Cartao titulo="Aluguéis recebidos por mês">
              <Colunas dados={serie} formato={brlCurto} />
            </Cartao>
          )}
          {(perfil === "socios" || perfil === "comercial" || perfil === "marketing") && (
            <Cartao titulo="Leads do mês por canal">
              <Barras dados={i.porCanal.slice(0, 7)} vazio="Nenhum lead cadastrado neste mês." />
            </Cartao>
          )}
          {perfil === "socios" && (
            <Cartao
              titulo="Financeiro do mês"
              acao={
                <Link href="/financeiro" className="text-[13px] underline underline-offset-4">
                  Abrir
                </Link>
              }
            >
              <dl className="grid grid-cols-3 gap-3 text-[13px]">
                {[
                  ["Entradas", i.entradas],
                  ["Saídas", i.saidas],
                  ["A pagar", i.aPagar],
                ].map(([n, v]) => (
                  <div key={n as string}>
                    <dt className="text-cinza">{n}</dt>
                    <dd className="text-[17px] font-medium tabular-nums">{brlCurto(v as number)}</dd>
                  </div>
                ))}
              </dl>
            </Cartao>
          )}
          {perfil === "socios" && (
            <Cartao titulo="Últimas ações" escuro>
              {dados.logs.length === 0 ? (
                <p className="text-[13px] text-nevoa">As aprovações e mudanças de etapa aparecem aqui.</p>
              ) : (
                <ul className="space-y-1.5 text-[13px]">
                  {dados.logs.slice(0, 6).map((l) => (
                    <li key={l.id} className="flex gap-3">
                      <span className="shrink-0 tabular-nums text-nevoa">{brHora(l.em)}</span>
                      <span>
                        {l.quem}: {l.texto}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Cartao>
          )}
        </div>
      </div>
    </>
  );
}
