import { faltaAniversario, doDia } from "./agenda";
import { resumoDossie } from "./certidoes";
import { CHECK_CORRETOR } from "./comercial";
import { competencia, diasEntre, hoje, prazo } from "./datas";
import { brl } from "./formato";
import { dividirComissao, ETAPAS_VENDA, horasAte, prazoPix } from "./juridico";
import { alertasContrato, situacao } from "./locacao";
import type { Dados, Perfil, Regras } from "./tipos";
import { dentroPadrao } from "./varredura";

export interface Pend {
  id: string;
  area: string;
  texto: string;
  detalhe?: string;
  href: string;
  grave: boolean;
  /** espera um "sim" de alguém */
  aprovar?: boolean;
  /** quantos itens esta linha representa */
  qtd?: number;
  perfis: Perfil[];
}

/** Tudo que espera alguém agora, calculado dos dados. Uma lista só para todos os setores. */
function pendencias(d: Dados, r: Regras): Pend[] {
  const h = hoje();
  const p: Pend[] = [];
  const add = (x: Pend) => p.push(x);
  const contrato = (id: string) => d.contratos.find((c) => c.id === id);
  const corretor = (id: string) => d.corretores.find((c) => c.id === id)?.nome ?? "";

  /* Aprovações */
  const reps = d.repasses.filter((x) => x.status === "calculado");
  if (reps.length) {
    const atras = reps.filter((x) => x.previsto < h).length;
    add({
      id: "repasses",
      area: "Locação",
      href: "/aprovacoes",
      grave: atras > 0,
      aprovar: true,
      qtd: reps.length,
      perfis: ["locacao", "socios"],
      texto:
        reps.length === 1
          ? `Repasse de ${brl(reps[0].liquido)} para ${contrato(reps[0].contratoId)?.proprietario.nome ?? "proprietário"}`
          : `${reps.length} repasses: ${brl(reps.reduce((a, x) => a + x.liquido, 0))}`,
      detalhe: atras ? `${atras} com data prevista vencida` : "dentro da data prevista",
    });
  }
  for (const x of d.multas.filter((x) => x.status === "proposta"))
    add({
      id: `mul${x.id}`,
      area: "Locação",
      texto: `Multa de ${brl(x.valor)} para ${contrato(x.contratoId)?.inquilino.nome ?? "inquilino"}`,
      detalhe: x.motivo,
      href: "/aprovacoes",
      grave: false,
      aprovar: true,
      perfis: ["locacao", "socios"],
    });
  for (const v of d.vendas.filter((v) => v.comissaoStatus === "enviada"))
    add({
      id: `com${v.id}`,
      area: "Comissão",
      texto: `Comissão de ${brl(dividirComissao(v, r, corretor(v.corretorId)).total)}`,
      detalhe: v.imovel,
      href: "/aprovacoes",
      grave: false,
      aprovar: true,
      perfis: ["socios"],
    });
  for (const m of d.minutas.filter((m) => m.status === "em_revisao")) {
    const hh = horasAte(m.prazo);
    add({
      id: `min${m.id}`,
      area: "Jurídico",
      texto: `Revisar minuta: ${m.titulo}`,
      detalhe: hh < 0 ? `prazo venceu há ${-hh}h` : `${hh}h de prazo`,
      href: "/minutas",
      grave: hh < 0,
      aprovar: true,
      perfis: ["juridico"],
    });
  }
  for (const c of d.captacoes.filter((c) => c.fotos.length >= r.fotosMin[c.tipo] && !c.fotosAprovadas))
    add({
      id: `fot${c.id}`,
      area: "Captação",
      texto: `Aprovar fotos: ${c.titulo || c.bairro}`,
      detalhe: `${c.fotos.length} fotos`,
      href: "/captacao",
      grave: false,
      aprovar: true,
      perfis: ["comercial"],
    });
  for (const x of d.posts.filter((x) => x.status === "aprovacao"))
    add({
      id: `pos${x.id}`,
      area: "Marketing",
      texto: `Aprovar post: ${x.titulo}`,
      detalhe: `sai ${prazo(x.data)}`,
      href: "/marketing",
      grave: x.data < h,
      aprovar: true,
      perfis: ["marketing"],
    });

  /* Locação */
  for (const k of d.contratos)
    for (const [i, a] of alertasContrato(k, d.cobrancas, d.contasInquilino, r).entries())
      if (a.cor === "vermelho")
        add({
          id: `loc${k.id}${i}`,
          area: "Locação",
          texto: a.texto,
          detalhe: `${k.imovel}, ${k.inquilino.nome}`,
          href: `/locacao?c=${k.id}`,
          grave: a.tipo === "pagamento" || a.tipo === "conta",
          perfis: ["locacao", "socios"],
        });
  for (const c of d.cobrancas.filter((c) => situacao(c) === "vence_hoje"))
    add({
      id: `vh${c.id}`,
      area: "Locação",
      texto: `Aluguel vence hoje: ${contrato(c.contratoId)?.inquilino.nome ?? ""}`,
      detalhe: brl(c.aluguel + c.encargos + c.extra),
      href: "/locacao/cobrancas",
      grave: false,
      perfis: ["locacao"],
    });
  for (const f of d.funil.filter((f) => f.etapa === "analise" || f.etapa === "contrato")) {
    const dias = diasEntre(f.desde, h);
    if (dias >= 1)
      add({
        id: `fun${f.id}`,
        area: "Locação",
        texto: `${f.etapa === "analise" ? "Pré-análise" : "Contrato"} passou de ${r.prazoAnaliseHoras}h: ${f.imovel}`,
        detalhe: f.interessado.nome,
        href: "/locacao/funil",
        grave: true,
        perfis: ["locacao", "socios"],
      });
  }
  for (const c of d.chamados.filter((c) => c.status === "aberto"))
    add({
      id: `cha${c.id}`,
      area: "Locação",
      texto: `Chamado aberto: ${c.titulo}`,
      detalhe: `${contrato(c.contratoId)?.imovel ?? ""}, ${prazo(c.abertoEm)}`,
      href: "/locacao/atendimento",
      grave: diasEntre(c.abertoEm, h) > 2,
      perfis: ["locacao"],
    });

  /* Jurídico */
  for (const v of d.vendas) {
    const px = prazoPix(v, r);
    if (px && !v.pixEm)
      add({
        id: `pix${v.id}`,
        area: "Pós-venda",
        texto: px.vencido ? "Pix da comissão atrasado" : `Pix da comissão em ${px.horas}h`,
        detalhe: v.imovel,
        href: `/pos-venda?v=${v.id}`,
        grave: px.vencido,
        perfis: ["socios", "comercial", "locacao"],
      });
    const parada = Math.round((Date.now() - new Date(v.desde).getTime()) / 864e5);
    if (v.etapa < 7 && parada >= 7)
      add({
        id: `par${v.id}`,
        area: "Pós-venda",
        texto: `Parada há ${parada} dias em ${ETAPAS_VENDA[v.etapa - 1].nome}`,
        detalhe: v.imovel,
        href: `/pos-venda?v=${v.id}`,
        grave: true,
        perfis: ["socios", "comercial", "juridico"],
      });
  }
  for (const ds of d.dossies) {
    const s = resumoDossie(ds.certidoes);
    if (s.vencidas)
      add({
        id: `cev${ds.id}`,
        area: "Certidões",
        texto: `${s.vencidas} ${s.vencidas === 1 ? "certidão vencida" : "certidões vencidas"}`,
        detalhe: ds.titulo,
        href: `/certidoes?d=${ds.id}`,
        grave: true,
        perfis: ["juridico", "comercial"],
      });
    if (s.positivas && ds.risco === "a_analisar")
      add({
        id: `cep${ds.id}`,
        area: "Certidões",
        texto: `${s.positivas} ${s.positivas === 1 ? "certidão positiva" : "certidões positivas"} sem parecer`,
        detalhe: ds.titulo,
        href: `/certidoes?d=${ds.id}`,
        grave: true,
        perfis: ["juridico", "comercial", "socios"],
      });
    if (s.pendentes && ds.risco === "a_analisar")
      add({
        id: `cef${ds.id}`,
        area: "Certidões",
        texto: `${s.pendentes} ${s.pendentes === 1 ? "certidão a emitir" : "certidões a emitir"}`,
        detalhe: ds.titulo,
        href: `/certidoes?d=${ds.id}`,
        grave: false,
        perfis: ["comercial", "juridico"],
      });
  }

  /* Comercial */
  const semCorretor = d.leads.filter((l) => l.status === "novo" && !l.corretorId).length;
  if (semCorretor)
    add({ id: "leadsem", area: "Leads", texto: `${semCorretor} ${semCorretor === 1 ? "lead sem" : "leads sem"} corretor`, href: "/leads", grave: true, perfis: ["comercial"] });
  const parados = d.leads.filter((l) => l.status === "novo" && diasEntre(l.criadoEm, h) >= 2).length;
  if (parados)
    add({
      id: "leadpar",
      area: "Leads",
      texto: `${parados} ${parados === 1 ? "lead novo" : "leads novos"} há 2 dias ou mais sem atendimento`,
      href: "/leads",
      grave: true,
      perfis: ["comercial", "corretor"],
    });
  const foraJet = d.leads.filter((l) => !l.noJetimob && l.status !== "perdido").length;
  if (foraJet)
    add({ id: "leadjet", area: "Leads", texto: `${foraJet} ${foraJet === 1 ? "lead" : "leads"} ainda fora do JetImob`, href: "/leads", grave: false, perfis: ["comercial"] });
  for (const c of d.corretores.filter((c) => c.status === "entrando")) {
    const falta = CHECK_CORRETOR.flatMap((g) => g.itens).filter((i) => !c.checklist[i.id]);
    if (falta.length)
      add({
        id: `cor${c.id}`,
        area: "Corretores",
        texto: `${c.nome}: ${falta.length} ${falta.length === 1 ? "item" : "itens"} para concluir a entrada`,
        detalhe: falta
          .slice(0, 3)
          .map((i) => i.nome)
          .join(", "),
        href: "/corretores",
        grave: diasEntre(c.entrada, h) > 10,
        perfis: falta.some((i) => i.quem === "Yan") ? ["comercial", "marketing"] : ["comercial"],
      });
  }
  const abordar = d.anuncios.filter((a) => a.status === "abordar" && !/\bsarto\b/i.test(a.anunciante) && dentroPadrao(a, r));
  const novos = abordar.filter((a) => diasEntre(a.primeiraVez, h) < 7).length;
  if (abordar.length)
    add({
      id: "varr",
      area: "Varredura",
      texto: `${abordar.length} ${abordar.length === 1 ? "anúncio" : "anúncios"} no padrão para abordar`,
      detalhe: novos ? `${novos} ${novos === 1 ? "novo" : "novos"} na semana` : undefined,
      href: "/varredura",
      grave: false,
      perfis: ["comercial"],
    });
  const alertas = d.notas.filter((n) => n.motivo).length;
  if (alertas)
    add({
      id: "jetat",
      area: "Carteira",
      texto: `${alertas} ${alertas === 1 ? "anúncio requer" : "anúncios requerem"} atenção`,
      href: "/carteira?aba=atencao",
      grave: true,
      perfis: ["comercial", "marketing"],
    });

  /* Agenda, financeiro, rotina */
  for (const e of d.eventos.filter((e) => e.agenda === "videomaker" && e.entrega && !e.entregue)) {
    const n = diasEntre(h, e.entrega as string);
    if (n <= 1)
      add({ id: `ent${e.id}`, area: "Videomaker", texto: `Entrega ${prazo(e.entrega as string)}: ${e.titulo}`, href: "/agenda", grave: n < 0, perfis: ["marketing", "comercial"] });
  }
  for (const c of d.contasPagar.filter((c) => !c.pagoEm)) {
    const n = diasEntre(h, c.vencimento);
    if (n <= 5)
      add({
        id: `cp${c.id}`,
        area: "Financeiro",
        texto: `${c.fornecedor}: ${brl(c.valor)}`,
        detalhe: `vence ${prazo(c.vencimento)}`,
        href: "/financeiro",
        grave: n < 0,
        perfis: ["locacao", "socios"],
      });
  }
  for (const e of d.estoque.filter((e) => e.qtd < e.minimo))
    add({
      id: `est${e.id}`,
      area: "Estoque",
      texto: `Repor ${e.item.toLowerCase()}`,
      detalhe: `${e.qtd} de ${e.minimo} ${e.unidade}`,
      href: "/rotina",
      grave: false,
      perfis: ["locacao"],
    });
  for (const a of d.aniversarios) {
    const n = faltaAniversario(a.dia, h);
    if (n === 0 && a.enviadoAno !== Number(h.slice(0, 4)))
      add({
        id: `ani${a.id}`,
        area: "Aniversário",
        texto: `Hoje é aniversário de ${a.nome}`,
        detalhe: a.tipo === "cliente" ? "Cliente" : "Equipe",
        href: "/rotina",
        grave: false,
        perfis: ["locacao", "comercial", "socios", "marketing"],
      });
  }
  return p.sort((a, b) => Number(b.grave) - Number(a.grave));
}

export const pendenciasDe = (perfil: Perfil, d: Dados, r: Regras) => pendencias(d, r).filter((x) => x.perfis.includes(perfil));

/** Indicadores dos gestores, só com o que existe no painel */
export function indicadores(d: Dados, comp = competencia(hoje())) {
  const doMes = (x?: string) => !!x && x.slice(0, 7) === comp;
  const porCanal = new Map<string, number>();
  for (const l of d.leads.filter((l) => doMes(l.criadoEm))) porCanal.set(l.canal || "Sem canal", (porCanal.get(l.canal || "Sem canal") ?? 0) + 1);
  const cob = d.cobrancas.filter((c) => c.comp === comp);
  const tot = (xs: typeof cob) => xs.reduce((a, c) => a + c.aluguel + c.encargos + c.extra, 0);
  const lan = d.lancamentos.filter((l) => doMes(l.data));
  const visitas = [...Array(31)].flatMap((_, i) =>
    doDia(
      d.eventos.filter((e) => e.agenda === "visitas"),
      `${comp}-${String(i + 1).padStart(2, "0")}`,
    ),
  ).length;
  return {
    leads: d.leads.filter((l) => doMes(l.criadoEm)).length,
    porCanal: [...porCanal].map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor),
    atendimentos: d.leads.filter((l) => l.status !== "novo" && l.status !== "perdido" && doMes(l.atualizadoEm)).length,
    visitas,
    vgv: d.vendas.filter((v) => doMes(v.criadaEm)).reduce((a, v) => a + v.valor, 0),
    vendas: d.vendas.filter((v) => doMes(v.criadaEm)).length,
    captacoes: d.captacoes.filter((c) => doMes(c.criadoEm)).length,
    captacoesVarredura: d.captacoes.filter((c) => doMes(c.criadoEm) && c.origem === "Varredura").length,
    posts: d.posts.filter((p) => p.status === "publicado" && doMes(p.data)).length,
    faturamentoLocacao: tot(cob),
    recebidoLocacao: tot(cob.filter((c) => c.pagoEm)),
    atrasados: d.cobrancas.filter((c) => situacao(c) === "atrasada"),
    repassesAbertos: d.repasses.filter((x) => x.status !== "pago").reduce((a, x) => a + x.liquido, 0),
    entradas: lan.filter((l) => l.valor > 0).reduce((a, l) => a + l.valor, 0),
    saidas: -lan.filter((l) => l.valor < 0).reduce((a, l) => a + l.valor, 0),
    aPagar: d.contasPagar.filter((c) => !c.pagoEm).reduce((a, c) => a + c.valor, 0),
    custos: d.custos.filter((c) => c.comp === comp).reduce((a, c) => a + c.valor, 0),
  };
}
