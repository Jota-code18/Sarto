import { competencia, type Dia, diasEntre, hoje, maisComp } from "./datas";
import { arred, brl, num } from "./formato";
import { alertasContrato, situacao, totalCobranca } from "./locacao";
import type { Chamado, Cobranca, ContaInquilino, Contrato, FunilLocacao, MultaProposta, Regras, Repasse } from "./tipos";

/**
 * Relatório da gestão de locação: indicadores com meta, o que está fora do lugar e o que está certo.
 * As metas seguem o que o mercado usa (inadimplência abaixo de 5%, repasse no prazo, seguro em todos
 * os contratos, chamado resolvido em até 3 dias) e podem ser ajustadas aqui.
 */
export type Estado = "ok" | "atencao" | "fora" | "sem_dado";
export interface Indicador {
  id: string;
  grupo: "Dinheiro" | "Repasse" | "Carteira" | "Proteção" | "Atendimento";
  nome: string;
  valor: string;
  meta: string;
  estado: Estado;
  /** como se calcula, para quem lê o relatório */
  conta: string;
}
interface Pendencia {
  gravidade: "fora" | "atencao";
  contratoId?: string;
  imovel: string;
  texto: string;
}
export interface Relatorio {
  comp: string;
  ativos: number;
  indicadores: Indicador[];
  fora: Pendencia[];
  certo: string[];
}

export interface Base {
  contratos: Contrato[];
  cobrancas: Cobranca[];
  repasses: Repasse[];
  contasInquilino: ContaInquilino[];
  chamados: Chamado[];
  multas: MultaProposta[];
  funil: FunilLocacao[];
}

const pct = (a: number, b: number) => (b ? (a / b) * 100 : 0);
const fmtPct = (v: number) => `${num(v, v % 1 ? 1 : 0)}%`;
/** pior de dois estados */
const pior = (a: Estado, b: Estado): Estado => (["fora", "atencao", "ok", "sem_dado"].find((x) => x === a || x === b) as Estado) ?? a;
const faixa = (v: number, bom: (x: number) => boolean, ruim: (x: number) => boolean): Estado => (bom(v) ? "ok" : ruim(v) ? "fora" : "atencao");

export function relatorioLocacao(b: Base, r: Regras, comp: string = competencia(hoje()), ref: Dia = hoje()): Relatorio {
  const ativos = b.contratos.filter((k) => k.status !== "encerrado");
  const vigente = (k: Contrato) => competencia(k.inicio) < comp && competencia(k.fim) >= comp;
  const doMes = b.cobrancas.filter((c) => c.comp === comp);
  const porContrato = new Map(b.contratos.map((k) => [k.id, k]));
  const nome = (id?: string) => (id && porContrato.get(id)?.imovel) || "Contrato não encontrado";
  const ind: Indicador[] = [];
  const fora: Pendencia[] = [];
  const certo: string[] = [];
  const add = (i: Indicador) => ind.push(i);

  // ---------- Dinheiro
  const cobrado = doMes.reduce((a, c) => a + totalCobranca(c), 0);
  const recebido = doMes.reduce((a, c) => a + (c.pagoEm ? (c.valorPago ?? totalCobranca(c)) : 0), 0);
  const vencidas = doMes.filter((c) => diasEntre(c.vencimento, ref) > 0 || c.pagoEm);
  const emDia = vencidas.filter((c) => c.pagoEm && c.pagoEm <= c.vencimento).length;
  add({
    id: "recebimento",
    grupo: "Dinheiro",
    nome: "Recebido do que foi cobrado no mês",
    valor: doMes.length ? `${fmtPct(pct(recebido, cobrado))} (${brl(recebido, false)} de ${brl(cobrado, false)})` : "—",
    meta: "95% ou mais depois do vencimento",
    estado: !doMes.length
      ? "sem_dado"
      : vencidas.length < doMes.length
        ? "ok"
        : faixa(
            pct(recebido, cobrado),
            (v) => v >= 95,
            (v) => v < 85,
          ),
    conta: "Soma do que foi pago ÷ soma das cobranças da competência",
  });
  add({
    id: "em_dia",
    grupo: "Dinheiro",
    nome: "Pagos até o vencimento",
    valor: vencidas.length ? `${fmtPct(pct(emDia, vencidas.length))} (${emDia} de ${vencidas.length})` : "—",
    meta: "90% ou mais",
    estado: vencidas.length
      ? faixa(
          pct(emDia, vencidas.length),
          (v) => v >= 90,
          (v) => v < 75,
        )
      : "sem_dado",
    conta: "Cobranças pagas até o dia do vencimento ÷ cobranças já vencidas",
  });
  const atrasadas = b.cobrancas.filter((c) => situacao(c, ref) === "atrasada" && porContrato.get(c.contratoId)?.status !== "encerrado");
  const emAtraso = atrasadas.reduce((a, c) => a + totalCobranca(c), 0);
  const carteira = ativos.reduce((a, k) => a + k.aluguel, 0);
  const contratosAtraso = new Set(atrasadas.map((c) => c.contratoId)).size;
  add({
    id: "inadimplencia",
    grupo: "Dinheiro",
    nome: "Inadimplência",
    valor: ativos.length ? `${fmtPct(pct(contratosAtraso, ativos.length))} dos contratos, ${brl(emAtraso, false)} em atraso` : "—",
    meta: "Até 5% dos contratos",
    estado: ativos.length
      ? faixa(
          pct(contratosAtraso, ativos.length),
          (v) => v <= 5,
          (v) => v > 10,
        )
      : "sem_dado",
    conta: "Contratos com aluguel vencido e não pago ÷ contratos ativos",
  });
  const faixas = { "até 15 dias": 0, "16 a 30 dias": 0, "mais de 30 dias": 0 };
  for (const c of atrasadas) {
    const n = diasEntre(c.vencimento, ref);
    faixas[n <= 15 ? "até 15 dias" : n <= 30 ? "16 a 30 dias" : "mais de 30 dias"] += totalCobranca(c);
    fora.push({
      gravidade: n > 15 ? "fora" : "atencao",
      contratoId: c.contratoId,
      imovel: nome(c.contratoId),
      texto: `Aluguel de ${c.comp.slice(5)}/${c.comp.slice(0, 4)} atrasado há ${n} dias: ${brl(totalCobranca(c), false)}`,
    });
  }
  add({
    id: "idade_atraso",
    grupo: "Dinheiro",
    nome: "Atraso por idade",
    valor: atrasadas.length
      ? Object.entries(faixas)
          .map(([k, v]) => `${k}: ${brl(v, false)}`)
          .join(" · ")
      : "Nada em atraso",
    meta: "Nada acima de 30 dias",
    estado: atrasadas.length ? (faixas["mais de 30 dias"] > 0 ? "fora" : faixas["16 a 30 dias"] > 0 ? "atencao" : "ok") : "ok",
    conta: "Valor em atraso separado por dias desde o vencimento",
  });
  const taxas = b.repasses.filter((x) => x.comp === comp && x.taxaPct < 100);
  const taxaMedia = taxas.length
    ? pct(
        taxas.reduce((a, x) => a + x.taxa, 0),
        taxas.reduce((a, x) => a + x.bruto, 0),
      )
    : 0;
  add({
    id: "receita_adm",
    grupo: "Dinheiro",
    nome: "Receita de administração no mês",
    valor: taxas.length ? `${brl(arred(taxas.reduce((a, x) => a + x.taxa, 0)), false)}, taxa média de ${fmtPct(taxaMedia)}` : "—",
    meta: `Taxa média perto de ${r.taxaPadrao}%`,
    estado: !taxas.length
      ? "sem_dado"
      : faixa(
          taxaMedia,
          (v) => v >= r.taxaReduzida - 0.01,
          (v) => v < r.taxaReduzida - 1,
        ),
    conta: "Soma das taxas dos repasses da competência; taxa média = taxa ÷ aluguel bruto",
  });

  // ---------- Repasse
  const pagas = b.cobrancas.filter((c) => c.pagoEm);
  const repassePor = new Map(b.repasses.map((x) => [`${x.contratoId}|${x.comp}`, x]));
  const prazos: number[] = [];
  let noPrazo = 0;
  let comRepasse = 0;
  for (const c of pagas) {
    const rp = repassePor.get(`${c.contratoId}|${c.comp}`);
    const dias = diasEntre(c.pagoEm as Dia, ref);
    if (!rp) {
      if (dias > 5 && porContrato.get(c.contratoId)?.status !== "encerrado")
        fora.push({
          gravidade: dias > 10 ? "fora" : "atencao",
          contratoId: c.contratoId,
          imovel: nome(c.contratoId),
          texto: `Aluguel de ${c.comp.slice(5)}/${c.comp.slice(0, 4)} pago há ${dias} dias e sem repasse calculado`,
        });
      continue;
    }
    if (rp.liquido === 0) continue;
    comRepasse++;
    if (rp.status === "pago" && rp.pagoEm) {
      prazos.push(Math.max(0, diasEntre(c.pagoEm as Dia, rp.pagoEm)));
      if (rp.pagoEm <= rp.previsto) noPrazo++;
    } else if (rp.previsto < ref)
      fora.push({
        gravidade: "fora",
        contratoId: rp.contratoId,
        imovel: nome(rp.contratoId),
        texto: `Repasse de ${rp.comp.slice(5)}/${rp.comp.slice(0, 4)} (${brl(rp.liquido, false)}) previsto para ${rp.previsto.split("-").reverse().join("/")} e não feito`,
      });
  }
  const feitos = prazos.length;
  add({
    id: "repasse_prazo",
    grupo: "Repasse",
    nome: "Repasses feitos no prazo",
    valor: feitos ? `${fmtPct(pct(noPrazo, feitos))} (${noPrazo} de ${feitos})` : "—",
    meta: "100%",
    estado: feitos
      ? faixa(
          pct(noPrazo, feitos),
          (v) => v >= 99,
          (v) => v < 90,
        )
      : "sem_dado",
    conta: "Repasses pagos até a data prevista no contrato ÷ repasses pagos",
  });
  const medio = feitos ? prazos.reduce((a, x) => a + x, 0) / feitos : 0;
  add({
    id: "repasse_dias",
    grupo: "Repasse",
    nome: "Tempo médio do pagamento ao repasse",
    valor: feitos ? `${num(medio, 1)} dias` : "—",
    meta: "Até 5 dias",
    estado: feitos
      ? faixa(
          medio,
          (v) => v <= 5,
          (v) => v > 10,
        )
      : "sem_dado",
    conta: "Média de dias entre o inquilino pagar e o proprietário receber",
  });
  const pendentes = b.repasses.filter((x) => x.status !== "pago" && x.liquido > 0);
  add({
    id: "repasse_pendente",
    grupo: "Repasse",
    nome: "Repasses esperando aprovação ou envio",
    valor: pendentes.length
      ? `${pendentes.length}, ${brl(
          pendentes.reduce((a, x) => a + x.liquido, 0),
          false,
        )}`
      : "Nenhum",
    meta: "Nenhum depois da data prevista",
    estado: pendentes.some((x) => x.previsto < ref) ? "fora" : pendentes.length ? "atencao" : "ok",
    conta: "Repasses calculados ou aprovados que ainda não foram pagos",
  });
  if (comRepasse && !pendentes.length && feitos === noPrazo) certo.push("Todos os repasses saíram no prazo");

  // ---------- Carteira
  add({
    id: "carteira",
    grupo: "Carteira",
    nome: "Contratos ativos e aluguel sob gestão",
    valor: `${ativos.length} contratos, ${brl(carteira, false)} por mês, média de ${brl(ativos.length ? carteira / ativos.length : 0, false)}`,
    meta: "Crescer mês a mês",
    estado: ativos.length ? "ok" : "sem_dado",
    conta: "Soma dos aluguéis dos contratos que não estão encerrados",
  });
  // contrato vigente sem cobrança no mês e cobrança repetida: o que o Jetimob não mostra
  const temCob = new Map<string, number>();
  for (const c of doMes) temCob.set(c.contratoId, (temCob.get(c.contratoId) ?? 0) + 1);
  const semCob = ativos.filter((k) => vigente(k) && !temCob.has(k.id));
  const duplas = [...temCob].filter(([, n]) => n > 1);
  for (const k of semCob) fora.push({ gravidade: "fora", contratoId: k.id, imovel: k.imovel, texto: `Contrato ativo sem cobrança de ${comp.slice(5)}/${comp.slice(0, 4)}` });
  for (const [id, n] of duplas)
    fora.push({ gravidade: "fora", contratoId: id, imovel: nome(id), texto: `${n} cobranças na mesma competência ${comp.slice(5)}/${comp.slice(0, 4)}` });
  add({
    id: "cobranca_mes",
    grupo: "Carteira",
    nome: "Contratos com a cobrança do mês certa",
    valor: ativos.length ? `${ativos.filter(vigente).length - semCob.length - duplas.length} de ${ativos.filter(vigente).length}` : "—",
    meta: "Todos: uma cobrança por contrato",
    estado: !ativos.length ? "sem_dado" : semCob.length || duplas.length ? "fora" : "ok",
    conta: "Contratos vigentes com exatamente uma cobrança na competência",
  });
  if (ativos.length && !semCob.length && !duplas.length) certo.push("Todo contrato vigente tem uma cobrança no mês, sem repetição");
  const ano = maisComp(comp, -11);
  const encerrados12 = b.contratos.filter((k) => k.status === "encerrado" && competencia(k.fim) >= ano);
  add({
    id: "rotatividade",
    grupo: "Carteira",
    nome: "Saídas nos últimos 12 meses",
    valor: `${encerrados12.length} (${fmtPct(pct(encerrados12.length, ativos.length + encerrados12.length))} da carteira)`,
    meta: "Até 20% ao ano",
    estado:
      ativos.length + encerrados12.length
        ? faixa(
            pct(encerrados12.length, ativos.length + encerrados12.length),
            (v) => v <= 20,
            (v) => v > 30,
          )
        : "sem_dado",
    conta: "Contratos encerrados em 12 meses ÷ (ativos + encerrados)",
  });
  const funilAtivo = b.funil.filter((f) => f.etapa !== "ativo");
  const diasFunil = funilAtivo.map((f) => diasEntre(f.criadoEm, ref));
  const medioFunil = diasFunil.length ? diasFunil.reduce((a, x) => a + x, 0) / diasFunil.length : 0;
  add({
    id: "funil",
    grupo: "Carteira",
    nome: "Imóveis esperando inquilino",
    valor: funilAtivo.length ? `${funilAtivo.length}, há ${num(medioFunil)} dias em média` : "Nenhum no funil",
    meta: "Alugar em até 30 dias",
    estado: funilAtivo.length
      ? faixa(
          medioFunil,
          (v) => v <= 30,
          (v) => v > 60,
        )
      : "ok",
    conta: "Média de dias desde a entrada no funil de locação",
  });
  for (const f of funilAtivo.filter((x) => diasEntre(x.criadoEm, ref) > 60))
    fora.push({ gravidade: "atencao", imovel: f.imovel, texto: `No funil há ${diasEntre(f.criadoEm, ref)} dias: rever preço ou anúncio` });

  // ---------- Proteção: seguro, garantia, reajuste, fim e checklist (alertas por contrato)
  const alertas = ativos.flatMap((k) => alertasContrato(k, [], b.contasInquilino, r, ref).map((a) => ({ ...a, imovel: k.imovel })));
  const conta = (tipo: string) => alertas.filter((a) => a.tipo === tipo);
  const semSeguro = ativos.filter((k) => !k.seguroVence || k.seguroVence < ref);
  add({
    id: "seguro",
    grupo: "Proteção",
    nome: "Contratos com seguro incêndio em dia",
    valor: ativos.length ? `${ativos.length - semSeguro.length} de ${ativos.length}` : "—",
    meta: "Todos",
    estado: !ativos.length ? "sem_dado" : semSeguro.length ? "fora" : conta("seguro").length ? "atencao" : "ok",
    conta: "Contratos com data de vencimento do seguro no futuro",
  });
  for (const k of semSeguro)
    fora.push({ gravidade: "fora", contratoId: k.id, imovel: k.imovel, texto: k.seguroVence ? "Seguro incêndio vencido" : "Sem seguro incêndio cadastrado" });
  const garantia = conta("garantia");
  add({
    id: "garantia",
    grupo: "Proteção",
    nome: "Garantias vencidas ou vencendo em 45 dias",
    valor: String(garantia.length),
    meta: "Nenhuma vencida",
    estado: garantia.some((a) => a.cor === "vermelho") ? "fora" : garantia.length ? "atencao" : ativos.length ? "ok" : "sem_dado",
    conta: "Contratos com garantia que vence antes de 45 dias",
  });
  const reaj = conta("reajuste");
  add({
    id: "reajuste",
    grupo: "Proteção",
    nome: "Reajustes atrasados",
    valor: String(reaj.filter((a) => a.cor === "vermelho").length),
    meta: "Nenhum",
    estado: reaj.some((a) => a.cor === "vermelho") ? "fora" : reaj.length ? "atencao" : ativos.length ? "ok" : "sem_dado",
    conta: "Contratos com aniversário passado e sem reajuste aplicado",
  });
  const fim = conta("fim");
  add({
    id: "renovacao",
    grupo: "Proteção",
    nome: "Contratos que vencem em 90 dias",
    valor: String(fim.length),
    meta: "Conversa de renovação começada",
    estado: fim.some((a) => a.cor === "vermelho") ? "fora" : fim.length ? "atencao" : ativos.length ? "ok" : "sem_dado",
    conta: "Contratos com data de fim nos próximos 90 dias",
  });
  const check = conta("checklist").concat(conta("conta"));
  add({
    id: "checklist",
    grupo: "Proteção",
    nome: "Pendências de documentos, vistoria e contas",
    valor: String(check.length),
    meta: "Nenhuma vencida",
    estado: check.some((a) => a.cor === "vermelho") ? "fora" : check.length ? "atencao" : ativos.length ? "ok" : "sem_dado",
    conta: "Itens do checklist do contrato e comprovantes de contas em aberto",
  });
  for (const a of [...garantia, ...reaj, ...fim, ...check].filter((x) => !(x.tipo === "seguro")))
    fora.push({ gravidade: a.cor === "vermelho" ? "fora" : "atencao", contratoId: a.contratoId, imovel: a.imovel, texto: a.texto });
  if (ativos.length && !semSeguro.length) certo.push("Todos os contratos com seguro incêndio em dia");
  if (ativos.length && !reaj.some((a) => a.cor === "vermelho")) certo.push("Nenhum reajuste atrasado");

  // ---------- Atendimento
  const abertos = b.chamados.filter((c) => c.status !== "concluido");
  const velhos = abertos.filter((c) => diasEntre(c.abertoEm, ref) > 3);
  add({
    id: "chamados",
    grupo: "Atendimento",
    nome: "Chamados abertos há mais de 3 dias",
    valor: `${velhos.length} de ${abertos.length} abertos`,
    meta: "Nenhum (não urgente em até 3 dias)",
    estado: velhos.some((c) => diasEntre(c.abertoEm, ref) > 10) ? "fora" : velhos.length ? "atencao" : "ok",
    conta: "Chamados não concluídos com mais de 3 dias desde a abertura",
  });
  for (const c of velhos)
    fora.push({
      gravidade: diasEntre(c.abertoEm, ref) > 10 ? "fora" : "atencao",
      contratoId: c.contratoId,
      imovel: nome(c.contratoId),
      texto: `Chamado "${c.titulo}" aberto há ${diasEntre(c.abertoEm, ref)} dias`,
    });
  const multas = b.multas.filter((m) => m.status === "proposta");
  add({
    id: "multas",
    grupo: "Atendimento",
    nome: "Multas esperando decisão",
    valor: String(multas.length),
    meta: "Decidir na semana",
    estado: multas.some((m) => diasEntre(m.criadaEm, ref) > 7) ? "atencao" : "ok",
    conta: "Multas propostas ainda sem aprovação ou recusa",
  });
  if (doMes.length && !atrasadas.length) certo.push("Nenhum aluguel em atraso");
  if (!velhos.length && abertos.length) certo.push("Chamados dentro do prazo");

  const peso = { fora: 0, atencao: 1 };
  fora.sort((x, y) => peso[x.gravidade] - peso[y.gravidade] || x.imovel.localeCompare(y.imovel));
  return { comp, ativos: ativos.length, indicadores: ind, fora, certo };
}

/** Situação geral: o pior dos indicadores que têm dado */
export const geral = (r: Relatorio): Estado => r.indicadores.filter((i) => i.estado !== "sem_dado").reduce<Estado>((a, i) => pior(a, i.estado), "ok");
