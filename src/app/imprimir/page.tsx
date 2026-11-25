"use client";
import { useEffect, useState } from "react";
import { Logo, Simbolo } from "@/componentes/logo";
import { Costura } from "@/componentes/ui";
import { useFotos } from "@/componentes/uso";
import { NOME_RESULTADO, resumoDossie, situacaoCert, tipoCert } from "@/lib/certidoes";
import { faltando, TIPOS_IMOVEL } from "@/lib/comercial";
import { br, brCompLongo, brHora, hoje, MESES, porExtenso } from "@/lib/datas";
import { arred, brl, mascaraDoc, num } from "@/lib/formato";
import { dividirComissao, MARCA, preencher, resumoNegociacao } from "@/lib/juridico";
import { useSarto } from "@/lib/store";
import type { Captacao } from "@/lib/tipos";

const CRECI = "CRECI/GO CJ 36.221";

function Topo({ tag, titulo, sub }: { tag: string; titulo: string; sub?: string }) {
  return (
    <header className="mb-7">
      <div className="flex items-start justify-between">
        <Logo className="h-8" />
        <p className="text-right text-[10px] uppercase tracking-wide text-cinza">
          #{tag}
          <br />
          {br(hoje())}
        </p>
      </div>
      <Costura className="my-5" />
      <h1 className="text-[24px] font-semibold leading-tight">{titulo}</h1>
      {sub && <p className="mt-1 text-cinza">{sub}</p>}
    </header>
  );
}
const Pe = () => (
  <footer className="mt-auto flex items-end justify-between pt-8 text-[10px] text-cinza">
    <span>Sarto Imóveis LTDA. {CRECI}</span>
    <span>sartoimoveis.com.br</span>
  </footer>
);
const Folha = ({ children }: { children: React.ReactNode }) => <div className="folha flex flex-col">{children}</div>;

function Imovel({ c }: { c: Captacao }) {
  const urls = useFotos(c.fotos);
  const fotos = c.fotos.map((k) => urls[k]).filter(Boolean);
  const itens = (
    [
      ["Área construída", c.area && `${num(c.area)} m²`],
      ["Terreno", c.terreno && `${num(c.terreno)} m²`],
      ["Quartos", c.quartos],
      ["Suítes", c.suites],
      ["Banheiros", c.banheiros],
      ["Vagas", c.vagas],
      ["Condomínio", c.valorCondominio && `${brl(c.valorCondominio, false)} por mês`],
      ["IPTU", c.iptu && `${brl(c.iptu, false)} por ano`],
    ] as [string, string | number][]
  ).filter(([, v]) => v);
  const dif = c.diferenciais.split("\n").map((x) => x.trim()).filter(Boolean);
  const falta = faltando(c);
  return (
    <>
      {falta.length > 0 && <p className="nao-imprime mx-auto mt-4 max-w-[210mm] bg-alertaf px-4 py-2 text-alerta">Falta preencher: {falta.join(", ")}.</p>}
      <div className="folha flex flex-col !p-0 print:!min-h-[296mm]">
        <div className="relative h-[128mm] bg-carvao text-papel">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {fotos[0] ? <img src={fotos[0]} alt="" className="absolute inset-0 size-full object-cover" /> : <Simbolo className="absolute left-1/2 top-1/2 h-40 -translate-x-1/2 -translate-y-1/2 text-tecido" />}
          <div className="absolute inset-0 bg-gradient-to-t from-tinta/85 via-tinta/15 to-tinta/45" />
          <Logo className="absolute left-[17mm] top-[14mm] h-9" />
          <div className="absolute inset-x-[17mm] bottom-[12mm]">
            <p className="text-[11px] uppercase tracking-wide">
              {TIPOS_IMOVEL[c.tipo]} {c.finalidade === "venda" ? "à venda" : "para locação"}
              {c.exclusividade === "sim" && ", exclusivo Sarto"}
            </p>
            <h1 className="mt-1 text-[30px] font-semibold leading-tight">{c.titulo || c.bairro}</h1>
            <p>{[c.condominioNome, c.bairro, c.cidade].filter(Boolean).join(", ")}</p>
          </div>
        </div>
        <div className="flex flex-1 flex-col px-[17mm] py-[11mm]">
          <div className="flex items-end justify-between border-b border-carvao pb-4">
            <p className="text-[34px] font-light leading-none tabular-nums">{c.valor ? brl(c.valor, false) : "Sob consulta"}</p>
            {c.codigo && <p className="text-[11px] text-cinza">Cód. {c.codigo}</p>}
          </div>
          <dl className="my-5 grid grid-cols-4 gap-x-5 gap-y-4">
            {itens.map(([k, v]) => (
              <div key={k}>
                <dd className="text-[19px] font-light leading-tight">{v}</dd>
                <dt className="text-[10px] uppercase tracking-wide text-cinza">{k}</dt>
              </div>
            ))}
          </dl>
          <Costura />
          <div className="mt-5 grid grid-cols-[1.5fr_1fr] gap-8">
            <p className="whitespace-pre-line text-[11.5px] leading-relaxed">{c.descricao}</p>
            {dif.length > 0 && (
              <div>
                <h2 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide">Diferenciais</h2>
                <ul className="space-y-1 text-[11.5px]">
                  {dif.map((d) => (
                    <li key={d} className="border-b border-linha pb-1">
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <Pe />
        </div>
      </div>
      {fotos.length > 1 && (
        <Folha>
          <Topo tag="IMÓVEL" titulo={c.titulo || c.bairro} />
          <div className="grid grid-cols-2 gap-[4mm]">
            {fotos.slice(1, 7).map((u) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={u} src={u} alt="" className="h-[62mm] w-full object-cover" />
            ))}
          </div>
          <Pe />
        </Folha>
      )}
    </>
  );
}

function Conteudo({ p }: { p: URLSearchParams }) {
  const { dados, regras } = useSarto();
  const id = p.get("id") ?? "";
  const nada = <p className="py-20 text-center text-cinza">Documento não encontrado neste navegador.</p>;

  switch (p.get("tipo")) {
    case "imovel": {
      const c = dados.captacoes.find((x) => x.id === id);
      return c ? <Imovel c={c} /> : nada;
    }
    case "extrato": {
      const r = dados.repasses.find((x) => x.id === id);
      const k = r && dados.contratos.find((x) => x.id === r.contratoId);
      const c = r && dados.cobrancas.find((x) => x.contratoId === r.contratoId && x.comp === r.comp);
      if (!r || !k) return nada;
      const L: [string, number][] = [["Aluguel recebido", r.bruto], [r.taxaPct === 100 ? "Intermediação (1º aluguel)" : `Taxa de administração (${num(r.taxaPct)}%)`, -r.taxa]];
      if (r.descontos) L.push([r.descontoMotivo || "Descontos", -r.descontos]);
      return (
        <Folha>
          <Topo tag="LOCAÇÃO" titulo="Extrato do proprietário" sub={brCompLongo(r.comp)} />
          <dl className="mb-6 grid grid-cols-2 gap-y-2 text-[13px]">
            <div>
              <dt className="text-cinza">Proprietário</dt>
              <dd className="font-medium">{k.proprietario.nome}</dd>
            </div>
            <div>
              <dt className="text-cinza">Imóvel</dt>
              <dd className="font-medium">{k.imovel}</dd>
            </div>
            <div>
              <dt className="text-cinza">Inquilino</dt>
              <dd className="font-medium">{k.inquilino.nome}</dd>
            </div>
            <div>
              <dt className="text-cinza">Pago pelo inquilino em</dt>
              <dd className="font-medium">{br(c?.pagoEm)}</dd>
            </div>
          </dl>
          <table className="tabela">
            <tbody>
              {L.map(([n, v]) => (
                <tr key={n}>
                  <td>{n}</td>
                  <td className="n">{brl(v)}</td>
                </tr>
              ))}
              <tr>
                <td className="font-semibold">Líquido</td>
                <td className="n text-[20px] font-medium">{brl(r.liquido)}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-4 text-[12px] text-cinza">
            {r.status === "pago" ? `Repassado em ${br(r.pagoEm)}.` : `Previsto para ${br(r.previsto)}.`} {k.encargosNoBoleto && "Condomínio e IPTU cobrados no boleto não compõem este repasse."}
          </p>
          <Pe />
        </Folha>
      );
    }
    case "informe": {
      const ano = p.get("ano") ?? "";
      const dono = p.get("dono") ?? "";
      const ks = dados.contratos.filter((k) => k.proprietario.nome === dono);
      if (!ks.length) return nada;
      return (
        <Folha>
          <Topo tag="LOCAÇÃO" titulo={`Informe de rendimentos ${ano}`} sub={`${dono}${ks[0].proprietario.doc ? `, ${mascaraDoc(ks[0].proprietario.doc)}` : ""}`} />
          {ks.map((k) => {
            const cs = dados.cobrancas.filter((c) => c.contratoId === k.id && c.pagoEm?.startsWith(ano));
            const taxa = (m: string) => dados.repasses.filter((r) => r.contratoId === k.id && cs.some((c) => c.comp === r.comp && c.pagoEm?.startsWith(m))).reduce((a, r) => a + r.taxa, 0);
            const ms = MESES.map((n, i) => {
              const m = `${ano}-${String(i + 1).padStart(2, "0")}`;
              return { n, b: arred(cs.filter((c) => c.pagoEm?.startsWith(m)).reduce((a, c) => a + c.aluguel, 0)), t: arred(taxa(m)) };
            }).filter((x) => x.b);
            if (!ms.length) return null;
            const sb = arred(ms.reduce((a, x) => a + x.b, 0));
            const st = arred(ms.reduce((a, x) => a + x.t, 0));
            return (
              <section key={k.id} className="mb-6">
                <h2 className="font-semibold">{k.imovel}</h2>
                <p className="mb-2 text-[12px] text-cinza">
                  Inquilino: {k.inquilino.nome} {mascaraDoc(k.inquilino.doc)}
                </p>
                <table className="tabela text-[12px]">
                  <thead>
                    <tr>
                      <th>Mês do recebimento</th>
                      <th className="n">Aluguel</th>
                      <th className="n">Taxa</th>
                      <th className="n">Líquido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ms.map((x) => (
                      <tr key={x.n}>
                        <td>{x.n}</td>
                        <td className="n">{brl(x.b)}</td>
                        <td className="n">{brl(x.t)}</td>
                        <td className="n">{brl(x.b - x.t)}</td>
                      </tr>
                    ))}
                    <tr className="font-semibold">
                      <td>Total</td>
                      <td className="n">{brl(sb)}</td>
                      <td className="n">{brl(st)}</td>
                      <td className="n">{brl(sb - st)}</td>
                    </tr>
                  </tbody>
                </table>
              </section>
            );
          })}
          <p className="text-[11px] text-cinza">Valores pela data do recebimento. Confira com o contador antes de declarar.</p>
          <Pe />
        </Folha>
      );
    }
    case "resumo": {
      const v = dados.vendas.find((x) => x.id === id);
      if (!v) return nada;
      return (
        <Folha>
          <Topo tag="JURÍDICO" titulo="Resumo da negociação" sub={v.imovel} />
          <p className="whitespace-pre-line text-[13px] leading-relaxed">{resumoNegociacao(v, dados.corretores.find((c) => c.id === v.corretorId)?.nome ?? "").split("\n").slice(2).join("\n")}</p>
          <Pe />
        </Folha>
      );
    }
    case "comissao": {
      const v = dados.vendas.find((x) => x.id === id);
      if (!v) return nada;
      const d = dividirComissao(v, regras, dados.corretores.find((c) => c.id === v.corretorId)?.nome ?? "");
      return (
        <Folha>
          <Topo tag="COMISSÃO" titulo="Relatório de comissão" sub={v.imovel} />
          <dl className="mb-6 grid grid-cols-3 gap-4 text-[13px]">
            {[
              ["Valor da venda", brl(v.valor)],
              ["Comissão", `${num(v.comissaoPct)}%`],
              ["Total", brl(d.total)],
              ["Vendedor", v.vendedor.nome],
              ["Comprador", v.comprador.nome],
              ["Fechada em", br(v.criadaEm)],
            ].map(([k, x]) => (
              <div key={k}>
                <dt className="text-cinza">{k}</dt>
                <dd className="font-medium">{x}</dd>
              </div>
            ))}
          </dl>
          <table className="tabela">
            <thead>
              <tr>
                <th>Quem</th>
                <th>Papel</th>
                <th className="n">% da comissão</th>
                <th className="n">Valor</th>
              </tr>
            </thead>
            <tbody>
              {d.linhas.map((l) => (
                <tr key={l.nome + l.papel + l.pct}>
                  <td className="font-medium">{l.nome}</td>
                  <td>{l.papel}</td>
                  <td className="n">{num(l.pct, 2)}</td>
                  <td className="n">{brl(l.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-5 text-[13px]">{v.comissaoAprovada ? `OK de ${v.comissaoAprovada.por} em ${brHora(v.comissaoAprovada.em)}.` : "Ainda sem aprovação."}</p>
          <Pe />
        </Folha>
      );
    }
    case "dossie": {
      const ds = dados.dossies.find((x) => x.id === id);
      if (!ds) return nada;
      const r = resumoDossie(ds.certidoes);
      const pontos = ds.certidoes.filter((c) => c.resultado === "positiva" || c.resultado === "positiva_efeito_negativa" || situacaoCert(c) === "vencida" || (c.alertas?.length ?? 0) > 0);
      return (
        <Folha>
          <Topo tag="JURÍDICO" titulo="Dossiê de certidões" sub={ds.titulo} />
          <dl className="mb-5 grid grid-cols-4 gap-4">
            {[
              ["Em dia", `${r.prontas} de ${r.total}`],
              ["Positivas", r.positivas],
              ["Vencidas", r.vencidas],
              ["Pendentes", r.pendentes],
            ].map(([k, v]) => (
              <div key={k}>
                <dd className="text-[24px] font-light leading-none">{v}</dd>
                <dt className="mt-1 text-[11px] text-cinza">{k}</dt>
              </div>
            ))}
          </dl>
          {pontos.length > 0 && (
            <section className="mb-5 border border-erro p-3 text-[12px]">
              <h2 className="mb-1 font-semibold text-erro">Pontos de atenção</h2>
              <ul className="space-y-1">
                {pontos.map((c) => (
                  <li key={c.id}>
                    <b className="font-medium">
                      {tipoCert(c.tipo)?.nome}, {ds.partes.find((x) => x.id === c.parteId)?.nome}:
                    </b>{" "}
                    {[c.resultado && c.resultado !== "negativa" && NOME_RESULTADO[c.resultado], situacaoCert(c) === "vencida" && `vencida em ${br(c.validade)}`, ...(c.alertas ?? []), c.obs].filter(Boolean).join(". ")}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {ds.partes.map((x) => (
            <section key={x.id} className="mb-5">
              <h2 className="text-[13px]">
                <span className="uppercase text-cinza">{x.papel}</span> <b className="font-semibold">{x.nome}</b> {x.tipo === "IMOVEL" ? [x.matricula && `matrícula ${x.matricula}`, x.inscricao && `inscrição ${x.inscricao}`].filter(Boolean).join(", ") : mascaraDoc(x.doc)}
              </h2>
              <table className="tabela text-[11px]">
                <thead>
                  <tr>
                    <th>Certidão</th>
                    <th>Resultado</th>
                    <th>Emissão</th>
                    <th>Validade</th>
                    <th>Número</th>
                    <th>Conferida</th>
                  </tr>
                </thead>
                <tbody>
                  {ds.certidoes
                    .filter((c) => c.parteId === x.id && c.status !== "dispensada")
                    .map((c) => (
                      <tr key={c.id}>
                        <td>
                          {tipoCert(c.tipo)?.nome}
                          <span className="block text-cinza">{tipoCert(c.tipo)?.orgao}</span>
                        </td>
                        <td className={c.resultado === "positiva" ? "font-semibold text-erro" : ""}>{c.resultado ? NOME_RESULTADO[c.resultado] : "pendente"}</td>
                        <td>{br(c.emitidaEm)}</td>
                        <td>{br(c.validade)}</td>
                        <td className="break-all">{c.numero ?? "—"}</td>
                        <td>{c.conferida?.por ?? "não"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </section>
          ))}
          <section className="bg-linho p-4">
            <h2 className="text-[12px] font-semibold uppercase">Parecer</h2>
            <p className="whitespace-pre-line text-[12px]">{ds.parecer || "Sem parecer."}</p>
            <p className="mt-2 text-[11px] text-cinza">{ds.revisao ? `${{ a_analisar: "A analisar", liberado: "Liberado", com_ressalva: "Com ressalva", travado: "Travado" }[ds.risco]} por ${ds.revisao.por} em ${brHora(ds.revisao.em)}` : "Aguardando a Gabi"}</p>
          </section>
          <Pe />
        </Folha>
      );
    }
    case "minuta": {
      const m = dados.minutas.find((x) => x.id === id);
      const mod = m && dados.modelos.find((x) => x.id === m.modeloId);
      if (!m) return nada;
      const texto = m.texto || preencher(mod?.corpo ?? "", m.campos);
      const lib = m.status === "liberada";
      return (
        <Folha>
          <div className="mb-6 flex items-center justify-between">
            <Logo className="h-7" />
            {lib ? <span className="text-[11px] text-cinza">Revisada por {m.revisao?.por}</span> : <span className="border border-erro px-2 py-1 text-[11px] font-semibold text-erro">{MARCA}</span>}
          </div>
          <div className="whitespace-pre-wrap text-[12px] leading-[1.75]">{texto}</div>
          <Pe />
        </Folha>
      );
    }
    default:
      return nada;
  }
}

export default function Imprimir() {
  const [p, setP] = useState<URLSearchParams | null>(null);
  useEffect(() => {
    Promise.resolve(useSarto.persist.rehydrate()).then(() => setP(new URLSearchParams(window.location.search)));
  }, []);
  return (
    <div className="min-h-dvh bg-linho print:min-h-0 print:bg-white">
      <div className="nao-imprime escuro sticky top-0 z-10 flex items-center justify-between bg-carvao px-5 py-3 text-papel">
        <span className="text-[13px] text-nevoa">Na janela de impressão, escolha Salvar como PDF e ligue os gráficos de fundo.</span>
        <button type="button" className="min-h-9 bg-papel px-4 font-medium text-carvao hover:bg-linho" onClick={() => window.print()}>
          Imprimir ou salvar PDF
        </button>
      </div>
      {p && <Conteudo p={p} />}
      <p className="nao-imprime pb-8 text-center text-[12px] text-cinza">
        {porExtenso(hoje())}
      </p>
    </div>
  );
}
