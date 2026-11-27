"use client";
import { MessageCircle, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CAMPOS_PESSOA, Formulario, type GrupoDef } from "@/componentes/formulario";
import { Abas, Botao, Cabecalho, Confirmar, Copiar, cx, estiloBotao, Fita, Gaveta, Itens, Nota, Numero, Numeros, Selo, Vazio, Tabela, Quadro } from "@/componentes/ui";
import { useParam } from "@/componentes/uso";
import { certidoesPadrao, resumoDossie } from "@/lib/certidoes";
import { agora, brHora, competencia, hoje } from "@/lib/datas";
import { brl, brlCurto, linkWhats, novoId, num } from "@/lib/formato";
import { camposDaVenda, dividirComissao, ETAPAS_VENDA, impedimentos, itensDaEtapa, prazoPix, resumoNegociacao } from "@/lib/juridico";
import { pode, quemPode } from "@/lib/regras";
import { acao, useSarto } from "@/lib/store";
import type { Parte, Venda } from "@/lib/tipos";

const vazia = { nome: "", doc: "", tel: "", email: "" };

export default function PosVenda() {
  const { dados, regras, perfil } = useSarto();
  const { salvar, remover, avisar, registrar } = acao();
  const pv = useParam("v");
  const [ed, setEd] = useState<Venda | null>(() => dados.vendas.find((v) => v.id === pv) ?? null);
  const [aba, setAba] = useState<"etapas" | "dados" | "comissao" | "avisos">("etapas");
  const [apaga, setApaga] = useState(false);

  const nova = (): Venda => ({
    id: novoId(),
    imovel: "",
    imovelCod: "",
    vendedor: vazia,
    comprador: vazia,
    valor: 0,
    comissaoPct: regras.comissaoVenda,
    forma: "avista",
    financiado: 0,
    banco: "",
    sinal: 0,
    condicoes: "",
    corretorId: "",
    etapa: 1,
    desde: agora(),
    checklist: {},
    participantes: [],
    comissaoStatus: "calcular",
    avisos: [],
    obs: "",
    criadaEm: hoje(),
  });
  const nomeCor = (id: string) => dados.corretores.find((c) => c.id === id)?.nome ?? "";
  const corTel = (id: string) => dados.corretores.find((c) => c.id === id)?.tel ?? "";
  const existe = !!ed && dados.vendas.some((v) => v.id === ed.id);
  const dossie = ed ? dados.dossies.find((d) => d.origem === "venda" && d.origemId === ed.id) : undefined;
  const minutas = ed ? dados.minutas.filter((m) => m.vendaId === ed.id) : [];
  const trava = ed
    ? impedimentos(
        ed,
        dossie,
        minutas.some((m) => m.status === "liberada"),
      )
    : [];
  const div = ed ? dividirComissao(ed, regras, nomeCor(ed.corretorId)) : null;
  const gravar = (v: Venda) => {
    setEd(v);
    salvar("vendas", v);
  };

  const grupos: GrupoDef[] = [
    {
      grupo: "Negócio",
      campos: [
        { k: "imovel", nome: "Imóvel", col: 4, obrigatorio: true },
        { k: "imovelCod", nome: "Código", col: 2 },
        { k: "valor", nome: "Valor da venda", tipo: "dinheiro", col: 2, obrigatorio: true },
        { k: "comissaoPct", nome: "Comissão (%)", tipo: "numero", col: 2 },
        { k: "sinal", nome: "Sinal", tipo: "dinheiro", col: 2 },
        {
          k: "forma",
          nome: "Pagamento",
          tipo: "opcoes",
          col: 2,
          opcoes: [
            { id: "avista", nome: "À vista" },
            { id: "financiado", nome: "Financiado" },
            { id: "permuta", nome: "Com permuta" },
          ],
        },
        { k: "financiado", nome: "Valor financiado", tipo: "dinheiro", col: 2, se: (v) => v.forma === "financiado" },
        { k: "banco", nome: "Banco", col: 2, se: (v) => v.forma === "financiado" },
        { k: "corretorId", nome: "Corretor", tipo: "opcoes", col: 3, opcoes: [{ id: "", nome: "Escolha" }, ...dados.corretores.map((c) => ({ id: c.id, nome: c.nome }))] },
        { k: "criadaEm", nome: "Fechada em", tipo: "data", col: 3 },
        { k: "condicoes", nome: "Condições combinadas", tipo: "area", col: 6, dica: "Posse, móveis que ficam, prazo de chaves, permuta, o que foi prometido" },
      ],
    },
    { grupo: "Vendedor", campos: CAMPOS_PESSOA("vendedor", "Nome", true) },
    { grupo: "Comprador", campos: CAMPOS_PESSOA("comprador", "Nome", true) },
  ];

  const avancar = () => {
    if (!ed) return;
    const prox = ETAPAS_VENDA[ed.etapa];
    if (!prox) return;
    const texto = `${ed.imovel}: etapa ${prox.n}, ${prox.nome}. Com ${prox.quem}.`;
    gravar({ ...ed, etapa: prox.n, desde: agora(), avisos: [{ em: agora(), para: prox.quem, texto }, ...ed.avisos] });
    registrar("Pós-venda", `${ed.imovel} foi para ${prox.nome.toLowerCase()}`);
    avisar(`Etapa ${prox.n}: ${prox.nome}`);
  };

  const abrirDossie = () => {
    if (!ed) return;
    if (dossie) return window.location.assign(`/certidoes?d=${dossie.id}`);
    const base: Parte = { id: "", papel: "", tipo: "PF", nome: "", doc: "", nascimento: "", mae: "", matricula: "", inscricao: "" };
    const tipo = (d: string): Parte["tipo"] => (d.length > 11 ? "PJ" : "PF");
    const partes: Parte[] = [
      { ...base, id: novoId(), papel: "Vendedor", tipo: tipo(ed.vendedor.doc), nome: ed.vendedor.nome, doc: ed.vendedor.doc },
      { ...base, id: novoId(), papel: "Imóvel", tipo: "IMOVEL", nome: ed.imovel },
    ];
    const id = novoId();
    salvar("vendas", ed);
    salvar("dossies", {
      id,
      titulo: ed.imovel,
      origem: "venda",
      origemId: ed.id,
      partes,
      parecer: "",
      risco: "a_analisar",
      criadoEm: hoje(),
      certidoes: partes.flatMap((p) => certidoesPadrao(p.tipo).map((t) => ({ id: novoId(), parteId: p.id, tipo: t, status: "pendente" as const }))),
    });
    registrar("Certidões", `abriu dossiê de ${ed.imovel}`);
    window.location.assign(`/certidoes?d=${id}`);
  };

  const gerarMinuta = () => {
    if (!ed) return;
    const modelo = ed.forma === "financiado" ? "mod_cv_financiado" : "mod_cv_avista";
    const m = dados.modelos.find((x) => x.id === modelo) ?? dados.modelos[0];
    if (!m) return avisar("Nenhum modelo cadastrado", "erro");
    const id = novoId();
    salvar("minutas", {
      id,
      titulo: `${m.nome}: ${ed.imovel}`,
      modeloId: m.id,
      vendaId: ed.id,
      campos: camposDaVenda(ed),
      texto: "",
      status: "rascunho",
      criadaEm: agora(),
      prazo: new Date(Date.now() + regras.prazoMinutaHoras * 36e5).toISOString(),
      notas: "",
    });
    window.location.assign(`/minutas?m=${id}`);
  };

  const abertas = dados.vendas.filter((v) => !(v.etapa === 7 && itensDaEtapa(v).every((i) => v.checklist[i.id])));
  const mes = dados.vendas.filter((v) => v.criadaEm.startsWith(competencia(hoje())));
  const textoAvisos = ed ? `${ed.imovel}: a venda está na etapa ${ed.etapa}, ${ETAPAS_VENDA[ed.etapa - 1].nome}. Com ${ETAPAS_VENDA[ed.etapa - 1].quem}.` : "";

  return (
    <>
      <Cabecalho area="JURÍDICO PÓSVENDA" titulo="Pós-venda" texto="Sete etapas, da venda fechada às chaves. Uma etapa só abre quando a anterior está completa.">
        <Botao
          tom="cheio"
          onClick={() => {
            setEd(nova());
            setAba("dados");
          }}
        >
          <Plus size={16} /> Venda fechada
        </Botao>
      </Cabecalho>
      <Numeros>
        <Numero valor={abertas.length} nome="Em andamento" />
        <Numero valor={brlCurto(mes.reduce((a, v) => a + v.valor, 0))} nome="VGV do mês" nota={`${mes.length} ${mes.length === 1 ? "venda" : "vendas"}`} />
        <Numero valor={brlCurto(abertas.filter((v) => v.comissaoStatus !== "lancada").reduce((a, v) => a + (v.valor * v.comissaoPct) / 100, 0))} nome="Comissão a lançar" />
        <Numero valor={dados.vendas.filter((v) => prazoPix(v, regras)).length} nome="Esperando Pix" nota={`prazo de ${regras.prazoPixHoras}h`} />
      </Numeros>

      {dados.vendas.length === 0 && <Vazio>Nenhuma venda registrada.</Vazio>}
      <Quadro nome="Etapas da venda">
        <div className="grid grid-cols-1 md:min-w-[1000px] md:grid-cols-7 gap-3">
          {ETAPAS_VENDA.map((e) => (
            <section key={e.n}>
              <h2 className="mb-2 border-b border-carvao pb-1.5 leading-tight">
                <span className="block text-[24px] font-light">{e.n}.</span>
                <span className="text-[13px] font-semibold">{e.nome}</span>
              </h2>
              <div className="space-y-2">
                {dados.vendas
                  .filter((v) => v.etapa === e.n)
                  .map((v) => {
                    const its = itensDaEtapa(v);
                    const px = prazoPix(v, regras);
                    const parada = Math.round((Date.now() - new Date(v.desde).getTime()) / 864e5);
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setEd(v);
                          setAba("etapas");
                        }}
                        className="rounded-[var(--radius-cartao)] block w-full bg-linho p-3 text-left hover:bg-linha"
                      >
                        <span className="block font-medium leading-snug">{v.imovel}</span>
                        <span className="block text-[12px] text-cinza">{nomeCor(v.corretorId)}</span>
                        <span className="my-1.5 block tabular-nums">{brlCurto(v.valor)}</span>
                        <Fita parte={its.filter((i) => v.checklist[i.id]).length} total={its.length} />
                        <span className="mt-1.5 flex flex-wrap gap-1">
                          {px && <Selo tom={px.vencido ? "erro" : "alerta"}>{px.vencido ? "Pix atrasado" : `Pix em ${px.horas}h`}</Selo>}
                          {parada >= 7 && v.etapa < 7 && <Selo tom="erro">{parada} dias parada</Selo>}
                          {v.comissaoStatus === "enviada" && <Selo tom="alerta">Espera OK</Selo>}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </section>
          ))}
        </div>
      </Quadro>

      <Gaveta
        larga
        aberta={!!ed}
        titulo={ed?.imovel || "Venda fechada"}
        sub={ed && [ed.valor ? brl(ed.valor) : "", nomeCor(ed.corretorId)].filter(Boolean).join(", ")}
        onFecha={() => setEd(null)}
        rodape={
          ed && (
            <>
              {existe && (
                <Botao tom="texto" onClick={() => setApaga(true)}>
                  Excluir
                </Botao>
              )}
              {existe && ed.etapa < 7 && aba === "etapas" && (
                <Botao tom="cheio" disabled={trava.length > 0} onClick={avancar}>
                  Passar para {ETAPAS_VENDA[ed.etapa].nome}
                </Botao>
              )}
              {(aba === "dados" || !existe) && (
                <Botao
                  tom="cheio"
                  disabled={!ed.imovel || !ed.valor}
                  onClick={() => {
                    if (!existe) registrar("Pós-venda", `registrou venda de ${ed.imovel} por ${brl(ed.valor)}`);
                    salvar("vendas", ed);
                    avisar("Venda salva");
                    setAba("etapas");
                  }}
                >
                  Salvar venda
                </Botao>
              )}
            </>
          )
        }
      >
        {ed && (
          <>
            <Abas
              atual={aba}
              onMuda={setAba}
              itens={[
                { id: "etapas", nome: "Andamento" },
                { id: "dados", nome: "Negociação" },
                { id: "comissao", nome: "Comissão" },
                { id: "avisos", nome: "Avisos", n: ed.avisos.length || undefined },
              ]}
            />
            {aba === "etapas" && !existe && <Nota>Salve a negociação para começar o andamento.</Nota>}
            {aba === "etapas" && existe && (
              <div className="space-y-7">
                <ol className="flex gap-1" aria-label="Etapas">
                  {ETAPAS_VENDA.map((e) => (
                    <li key={e.n} className={cx("h-2 flex-1", e.n < ed.etapa ? "bg-carvao" : e.n === ed.etapa ? "bg-nevoa" : "bg-linha")} title={e.nome} />
                  ))}
                </ol>
                {trava.length > 0 && ed.etapa < 7 && <Nota tom="alerta">Para avançar falta: {trava.join("; ")}.</Nota>}
                <div>
                  <h3 className="text-[16px] font-semibold">
                    {ed.etapa}. {ETAPAS_VENDA[ed.etapa - 1].nome} <span className="font-normal text-cinza">com {ETAPAS_VENDA[ed.etapa - 1].quem}</span>
                  </h3>
                  <Itens
                    itens={itensDaEtapa(ed)}
                    check={ed.checklist}
                    onMuda={(checklist) => {
                      const f = { ...ed, checklist };
                      if (checklist.assinado && !ed.assinadoEm) f.assinadoEm = agora();
                      if (!checklist.assinado) f.assinadoEm = undefined;
                      if (checklist.pix && !ed.pixEm) f.pixEm = agora();
                      if (!checklist.pix) f.pixEm = undefined;
                      gravar(f);
                    }}
                  />
                  <div className="mt-4 flex flex-wrap gap-2">
                    {ed.etapa === 2 && (
                      <>
                        <Copiar texto={resumoNegociacao(ed, nomeCor(ed.corretorId))}>Copiar resumo</Copiar>
                        <a className={estiloBotao("linha", true)} href={`/imprimir?tipo=resumo&id=${ed.id}`} target="_blank" rel="noreferrer">
                          Abrir para imprimir
                        </a>
                      </>
                    )}
                    {ed.etapa === 3 && (
                      <Botao pequeno tom="cheio" onClick={abrirDossie}>
                        {dossie ? "Abrir dossiê de certidões" : "Criar dossiê de certidões"}
                      </Botao>
                    )}
                    {ed.etapa === 4 && (
                      <Botao pequeno tom="cheio" onClick={gerarMinuta}>
                        Gerar minuta
                      </Botao>
                    )}
                    {ed.etapa === 6 && (
                      <Botao pequeno onClick={() => setAba("comissao")}>
                        Ver comissão
                      </Botao>
                    )}
                  </div>
                  {ed.etapa === 5 && prazoPix(ed, regras) && (
                    <p className={cx("mt-3", prazoPix(ed, regras)?.vencido ? "text-erro" : "text-alerta")}>
                      {prazoPix(ed, regras)?.vencido ? `Pix atrasado há ${-(prazoPix(ed, regras)?.horas ?? 0)}h.` : `Pix deve entrar em até ${prazoPix(ed, regras)?.horas}h.`}
                    </p>
                  )}
                </div>
                {dossie && (
                  <div className="rounded-[var(--radius-cartao)] bg-linho p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">
                        Certidões: {resumoDossie(dossie.certidoes).prontas} de {resumoDossie(dossie.certidoes).total}
                      </p>
                      <Link href={`/certidoes?d=${dossie.id}`} className="underline underline-offset-4">
                        Abrir dossiê
                      </Link>
                    </div>
                    <p className="text-[13px] text-cinza">
                      Parecer: {{ a_analisar: "a analisar", liberado: "liberado", com_ressalva: "com ressalva", travado: "travado" }[dossie.risco]}
                      {dossie.revisao && ` por ${dossie.revisao.por}`}
                    </p>
                  </div>
                )}
                {minutas.length > 0 && (
                  <div className="rounded-[var(--radius-cartao)] bg-linho p-4">
                    {minutas.map((m) => (
                      <p key={m.id} className="flex flex-wrap justify-between gap-2">
                        <span>{m.titulo}</span>
                        <Link href={`/minutas?m=${m.id}`} className="underline underline-offset-4">
                          {{ rascunho: "Rascunho", em_revisao: "Com a Gabi", ajustar: "Ajustar", liberada: "Liberada" }[m.status]}
                        </Link>
                      </p>
                    ))}
                  </div>
                )}
                <details>
                  <summary className="text-[13px] font-medium underline underline-offset-4">Ver todas as etapas</summary>
                  <div className="mt-3 space-y-4">
                    {ETAPAS_VENDA.filter((e) => e.n !== ed.etapa).map((e) => (
                      <div key={e.n}>
                        <h4 className="text-[12px] font-semibold uppercase text-cinza">
                          {e.n}. {e.nome}
                        </h4>
                        <Itens travado={e.n > ed.etapa} itens={e.itens} check={ed.checklist} onMuda={(checklist) => gravar({ ...ed, checklist })} />
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
            {aba === "dados" && <Formulario grupos={grupos} valor={ed} onMuda={setEd} />}
            {aba === "comissao" && div && (
              <div className="space-y-5">
                <p className="text-[28px] font-light tabular-nums">{brl(div.total)}</p>
                <Tabela>
                  <thead>
                    <tr>
                      <th>Quem</th>
                      <th>Papel</th>
                      <th className="n">%</th>
                      <th className="n">Valor</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {div.linhas.map((l) => {
                      const i = ed.participantes.findIndex((p) => !l.fixo && p.nome === l.nome && p.papel === l.papel);
                      return (
                        <tr key={l.nome + l.papel + l.pct}>
                          <td className="font-medium">{l.nome}</td>
                          <td>{l.papel}</td>
                          <td className="n">{num(l.pct, 2)}</td>
                          <td className="n">{brl(l.valor)}</td>
                          <td className="w-10">
                            {i >= 0 && (
                              <button type="button" aria-label={`Remover ${l.nome}`} onClick={() => gravar({ ...ed, participantes: ed.participantes.filter((_, j) => j !== i) })}>
                                <Trash2 size={15} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Tabela>
                {!div.valido && <Nota tom="erro">A soma passa de 100%. Reveja os participantes.</Nota>}
                <NovoParticipante onIncluir={(p) => gravar({ ...ed, participantes: [...ed.participantes, p] })} />
                <div className="flex flex-wrap items-center gap-2 border-t border-linha pt-4">
                  {ed.comissaoStatus === "calcular" && (
                    <Botao
                      tom="cheio"
                      disabled={!div.valido || !existe}
                      onClick={() => {
                        gravar({ ...ed, comissaoStatus: "enviada", checklist: { ...ed.checklist, relatorio: acao().feito() } });
                        registrar("Comissão", `enviou relatório de ${brl(div.total)} (${ed.imovel})`);
                        avisar("Relatório enviado para o OK do Pedro");
                      }}
                    >
                      Enviar relatório ao Pedro
                    </Botao>
                  )}
                  {ed.comissaoStatus === "enviada" && (
                    <>
                      <Selo tom="alerta">Espera OK do Pedro</Selo>
                      <Botao
                        tom="cheio"
                        disabled={!pode(perfil, "comissao")}
                        title={pode(perfil, "comissao") ? undefined : `Quem aprova: ${quemPode("comissao")}`}
                        onClick={() => {
                          const f = acao().feito();
                          gravar({ ...ed, comissaoStatus: "aprovada", comissaoAprovada: f, checklist: { ...ed.checklist, ok: f } });
                          registrar("Comissão", `aprovou ${brl(div.total)} (${ed.imovel})`);
                        }}
                      >
                        Dar OK
                      </Botao>
                    </>
                  )}
                  {ed.comissaoStatus === "aprovada" && (
                    <>
                      <Selo tom="ok">OK de {ed.comissaoAprovada?.por}</Selo>
                      <Botao
                        tom="cheio"
                        disabled={perfil !== "locacao" && perfil !== "socios"}
                        onClick={() => {
                          gravar({ ...ed, comissaoStatus: "lancada", checklist: { ...ed.checklist, lancada: acao().feito() } });
                          salvar("lancamentos", {
                            id: novoId(),
                            data: hoje(),
                            descricao: `Comissão ${ed.imovel} (parte da Sarto)`,
                            valor: div.linhas.find((l) => l.nome === "Sarto")?.valor ?? 0,
                            categoria: "Comissões",
                            origem: "comissao",
                          });
                          registrar("Comissão", `lançou a comissão de ${ed.imovel}`);
                          avisar("Lançada no financeiro");
                        }}
                      >
                        Lançar no financeiro
                      </Botao>
                    </>
                  )}
                  {ed.comissaoStatus === "lancada" && <Selo tom="ok">Lançada</Selo>}
                  {existe && (
                    <a className={estiloBotao()} href={`/imprimir?tipo=comissao&id=${ed.id}`} target="_blank" rel="noreferrer">
                      Relatório
                    </a>
                  )}
                </div>
              </div>
            )}
            {aba === "avisos" && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {[
                    { n: "Corretor", t: corTel(ed.corretorId) },
                    { n: "Vendedor", t: ed.vendedor.tel },
                    { n: "Comprador", t: ed.comprador.tel },
                  ].map((x) => (
                    <a
                      key={x.n}
                      className={cx(estiloBotao("linha", true), !x.t && "pointer-events-none opacity-45")}
                      href={linkWhats(x.t, textoAvisos)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => gravar({ ...ed, avisos: [{ em: agora(), para: x.n, texto: textoAvisos }, ...ed.avisos] })}
                    >
                      <MessageCircle size={15} /> Avisar {x.n.toLowerCase()}
                    </a>
                  ))}
                </div>
                {ed.avisos.length === 0 ? (
                  <Vazio>Os avisos de mudança de etapa ficam registrados aqui.</Vazio>
                ) : (
                  <ul className="divide-y divide-linha">
                    {ed.avisos.map((a) => (
                      <li key={a.em + a.para} className="flex gap-4 py-2">
                        <span className="shrink-0 tabular-nums text-cinza">{brHora(a.em)}</span>
                        <span>
                          <b className="font-medium">{a.para}:</b> {a.texto}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </Gaveta>
      <Confirmar
        aberta={apaga}
        titulo="Excluir esta venda?"
        texto="O andamento e a comissão desta venda serão apagados. O dossiê de certidões continua."
        sim="Excluir venda"
        onNao={() => setApaga(false)}
        onSim={() => {
          if (ed) remover("vendas", ed.id);
          setApaga(false);
          setEd(null);
        }}
      />
    </>
  );
}

function NovoParticipante({ onIncluir }: { onIncluir: (p: { nome: string; papel: string; pct: number }) => void }) {
  const [p, setP] = useState({ nome: "", papel: "", pct: 0 });
  return (
    <div className="rounded-[var(--radius-cartao)] bg-linho p-4">
      <Formulario
        grupos={[
          {
            grupo: "Outro participante",
            campos: [
              { k: "nome", nome: "Nome", col: 2 },
              { k: "papel", nome: "Papel", col: 2, dica: "Ex.: indicação, parceria" },
              { k: "pct", nome: "% da comissão", tipo: "numero", col: 2 },
            ],
          },
        ]}
        valor={p}
        onMuda={setP}
      />
      <Botao
        className="mt-3"
        pequeno
        disabled={!p.nome || !p.pct}
        onClick={() => {
          onIncluir(p);
          setP({ nome: "", papel: "", pct: 0 });
        }}
      >
        Incluir
      </Botao>
    </div>
  );
}
