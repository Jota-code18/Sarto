import { competencia, type Dia, diaNoMes, diasEntre, hoje, maisComp, maisMeses } from "./datas";
import { arred, brl } from "./formato";
import type { Cobranca, ContaInquilino, Contrato, Regras, Repasse } from "./tipos";

/** 10%; cai para 8% acima de R$ 7.000 ou com 3 ou mais imóveis do mesmo dono */
export function taxaAdm(c: Pick<Contrato, "aluguel" | "imoveisDoDono">, r: Regras) {
  return c.aluguel > r.taxaReduzidaAcima || c.imoveisDoDono >= r.taxaReduzidaImoveis ? r.taxaReduzida : r.taxaPadrao;
}

export const totalCobranca = (c: Cobranca) => arred(c.aluguel + c.encargos + c.extra);

export function situacao(c: Cobranca, ref: Dia = hoje()): "paga" | "a_vencer" | "vence_hoje" | "atrasada" {
  if (c.pagoEm) return "paga";
  const n = diasEntre(c.vencimento, ref);
  return n > 0 ? "atrasada" : n === 0 ? "vence_hoje" : "a_vencer";
}

/** Multa sobre o total, juros simples por dia corrido (mês de 30 dias) */
export function acrescimos(c: Cobranca, k: Pick<Contrato, "multaPct" | "jurosMes">, ref: Dia = hoje()) {
  const base = totalCobranca(c);
  const dias = Math.max(0, diasEntre(c.vencimento, c.pagoEm ?? ref));
  if (dias === 0) return { dias, multa: 0, juros: 0, total: base };
  const multa = arred((base * k.multaPct) / 100);
  const juros = arred((base * (k.jurosMes / 100) * dias) / 30);
  return { dias, multa, juros, total: arred(base + multa + juros) };
}

/** Primeira cobrança: mês seguinte ao início. Uma por competência até o fim do contrato. */
export function gerarCobrancas(contratos: Contrato[], existentes: Cobranca[], comp: string, id: () => string): Cobranca[] {
  const tem = new Set(existentes.map((c) => `${c.contratoId}|${c.comp}`));
  return contratos
    .filter((k) => k.status !== "encerrado")
    .filter((k) => comp > competencia(k.inicio) && comp <= competencia(k.fim))
    .filter((k) => !tem.has(`${k.id}|${comp}`))
    .map((k) => ({
      id: id(),
      contratoId: k.id,
      comp,
      vencimento: diaNoMes(comp, k.diaVencimento),
      aluguel: k.aluguel,
      encargos: k.encargosNoBoleto ? arred(k.condominio + k.iptuMensal) : 0,
      extra: 0,
      extraMotivo: "",
      avisos: [],
    }));
}

/** Repasse só nasce de cobrança paga. O 1º aluguel fica com a imobiliária. */
export function calcularRepasse(c: Cobranca, k: Contrato, r: Regras, descontos: number, descontoMotivo: string, id: string): Repasse {
  const primeiro = c.comp === maisComp(competencia(k.inicio), 1);
  const taxaPct = primeiro ? 100 : taxaAdm(k, r);
  const taxa = arred((c.aluguel * taxaPct) / 100);
  const liquido = arred(c.aluguel - taxa - descontos);
  return {
    id,
    contratoId: k.id,
    comp: c.comp,
    bruto: c.aluguel,
    taxaPct,
    taxa,
    descontos: arred(descontos),
    descontoMotivo,
    liquido,
    previsto: diaNoMes(c.comp, k.diaRepasse),
    // nada a transferir (1º aluguel): não ocupa a fila de aprovação
    status: liquido === 0 ? "pago" : "calculado",
  };
}

export const proximoReajuste = (k: Contrato) => maisMeses(k.ultimoReajuste, 12);

export const CHECK_CONTRATO: { id: string; nome: string; curto: string }[] = [
  { id: "documentos", nome: "Documentação completa", curto: "Docs" },
  { id: "vistoria", nome: "Vistoria de entrada com laudo", curto: "Vistoria" },
  { id: "garantia", nome: "Garantia formalizada", curto: "Garantia" },
  { id: "seguro", nome: "Seguro incêndio contratado", curto: "Seguro" },
  { id: "energia", nome: "Energia no nome do inquilino (Equatorial)", curto: "Energia" },
  { id: "agua", nome: "Água no nome do inquilino (Saneago)", curto: "Água" },
  { id: "chaves", nome: "Chaves entregues", curto: "Chaves" },
];

export const CHECK_SAIDA: { id: string; nome: string }[] = [
  { id: "aviso", nome: "Aviso de saída recebido por escrito" },
  { id: "vistoria", nome: "Vistoria de saída com laudo" },
  { id: "reparos", nome: "Reparos feitos ou descontados" },
  { id: "contas", nome: "Água, energia, condomínio e IPTU quitados" },
  { id: "chaves", nome: "Chaves devolvidas" },
  { id: "garantia", nome: "Caução devolvida ou garantia baixada" },
  { id: "distrato", nome: "Distrato assinado" },
];

export type Cor = "verde" | "amarelo" | "vermelho";
export interface Alerta {
  cor: Cor;
  texto: string;
  quando?: Dia;
  contratoId: string;
  tipo: "pagamento" | "conta" | "checklist" | "seguro" | "garantia" | "reajuste" | "fim";
}

/** Tudo que está fora do lugar em um contrato, do mais grave para o menos grave */
export function alertasContrato(k: Contrato, cobrancas: Cobranca[], contas: ContaInquilino[], r: Regras, ref: Dia = hoje()): Alerta[] {
  const a: Alerta[] = [];
  const add = (cor: Cor, tipo: Alerta["tipo"], texto: string, quando?: Dia) => a.push({ cor, tipo, texto, quando, contratoId: k.id });
  if (k.status === "encerrado") return a;

  for (const c of cobrancas.filter((x) => x.contratoId === k.id && !x.pagoEm)) {
    const n = diasEntre(c.vencimento, ref);
    if (n > 0) add("vermelho", "pagamento", `Aluguel atrasado há ${n} ${n === 1 ? "dia" : "dias"}: ${brl(acrescimos(c, k, ref).total)}`, c.vencimento);
    else if (n >= -3) add("amarelo", "pagamento", n === 0 ? "Aluguel vence hoje" : `Aluguel vence em ${-n} ${n === -1 ? "dia" : "dias"}`, c.vencimento);
  }

  const nomes = { iptu: "IPTU", condominio: "condomínio", agua: "água", energia: "energia" } as const;
  for (const ct of contas.filter((x) => x.contratoId === k.id)) {
    for (const [t, v] of Object.entries(ct.itens)) {
      const nome = nomes[t as keyof typeof nomes];
      // IPTU e condomínio são dívida do imóvel: cobrança mais rígida
      const grave = t === "iptu" || t === "condominio";
      if (v === "atrasada") add("vermelho", "conta", `Conta de ${nome} em atraso (${ct.comp.slice(5)}/${ct.comp.slice(0, 4)})`);
      else if (v === "pendente" && ct.comp < competencia(ref))
        add(grave ? "vermelho" : "amarelo", "conta", `Sem comprovante de ${nome} (${ct.comp.slice(5)}/${ct.comp.slice(0, 4)})`);
    }
  }

  const idade = diasEntre(k.inicio, ref);
  for (const it of CHECK_CONTRATO) {
    if (k.checklist[it.id]) continue;
    const titularidade = it.id === "energia" || it.id === "agua";
    if (titularidade) {
      const falta = r.prazoTitularidadeDias - idade;
      if (falta < 0) add("vermelho", "checklist", `${it.nome}: prazo de ${r.prazoTitularidadeDias} dias vencido, cabe propor multa`);
      else if (falta <= 10) add("amarelo", "checklist", `${it.nome}: faltam ${falta} dias`);
    } else if (idade > 0) add(idade > 15 ? "vermelho" : "amarelo", "checklist", `Pendente: ${it.nome.toLowerCase()}`);
  }

  const vence = (d: Dia, tipo: Alerta["tipo"], nome: string, aviso: number) => {
    if (!d) return;
    const n = diasEntre(ref, d);
    if (n < 0) add("vermelho", tipo, `${nome} há ${-n} dias`.replace("vence", "venceu"), d);
    else if (n <= aviso) add(n <= 15 ? "vermelho" : "amarelo", tipo, `${nome} em ${n} dias`, d);
  };
  vence(k.seguroVence, "seguro", "Seguro incêndio vence", 45);
  vence(k.garantiaVence, "garantia", "Garantia vence", 45);
  vence(k.fim, "fim", "Contrato vence", 90);

  const pr = proximoReajuste(k);
  const n = diasEntre(ref, pr);
  if (n <= 0 && pr <= k.fim) add("vermelho", "reajuste", `Reajuste pelo ${k.indice} já pode ser aplicado`, pr);
  else if (n <= 45 && pr <= k.fim) add("amarelo", "reajuste", `Reajuste pelo ${k.indice} em ${n} dias`, pr);

  const peso = { vermelho: 0, amarelo: 1, verde: 2 };
  return a.sort((x, y) => peso[x.cor] - peso[y.cor]);
}

export const corContrato = (a: Alerta[]): Cor => (a.some((x) => x.cor === "vermelho") ? "vermelho" : a.length ? "amarelo" : "verde");

export const ETAPAS_FUNIL: { id: string; nome: string; itens: { id: string; nome: string }[] }[] = [
  {
    id: "qualificacao",
    nome: "Qualificação",
    itens: [
      { id: "valor", nome: "Aluguel dentro do mínimo" },
      { id: "condicoes", nome: "Imóvel em boas condições" },
      { id: "visita", nome: "Visita ao imóvel feita" },
    ],
  },
  {
    id: "documentos",
    nome: "Documentos e adesão",
    itens: [
      { id: "doc_dono", nome: "Documentos do proprietário" },
      { id: "doc_imovel", nome: "Matrícula e IPTU do imóvel" },
      { id: "adesao", nome: "Contrato de adesão assinado" },
    ],
  },
  {
    id: "fotos",
    nome: "Fotos",
    itens: [
      { id: "fotos", nome: "Fotos completas" },
      { id: "fotos_ok", nome: "Fotos aprovadas" },
    ],
  },
  { id: "jetimob", nome: "No JetImob", itens: [{ id: "publicado", nome: "Imóvel publicado" }] },
  { id: "proposta", nome: "Proposta", itens: [{ id: "proposta", nome: "Proposta do interessado registrada" }] },
  {
    id: "analise",
    nome: "Pré-análise",
    itens: [
      { id: "doc_inquilino", nome: "Documentos do inquilino" },
      { id: "renda", nome: "Comprovação de renda conferida" },
      { id: "certidoes", nome: "Certidões e consultas feitas" },
      { id: "garantia", nome: "Garantia definida" },
    ],
  },
  {
    id: "contrato",
    nome: "Contrato",
    itens: [
      { id: "minuta", nome: "Contrato confeccionado" },
      { id: "revisao", nome: "Revisão jurídica" },
      { id: "assinado", nome: "Assinado por todos" },
      { id: "titularidade", nome: "Autorização para Equatorial e Saneago" },
    ],
  },
  {
    id: "vistoria",
    nome: "Vistoria",
    itens: [
      { id: "agendada", nome: "Vistoria agendada" },
      { id: "laudo", nome: "Laudo anexado" },
      { id: "seguro", nome: "Seguro incêndio contratado" },
    ],
  },
];

/** Texto de cobrança conforme a situação, para abrir direto no WhatsApp */
export function textoCobranca(c: Cobranca, k: Contrato, ref: Dia = hoje()) {
  const nome = k.inquilino.nome.split(" ")[0];
  const v = c.vencimento.split("-").reverse().join("/");
  const s = situacao(c, ref);
  const cab = `Olá, ${nome}. Aqui é da locação da Sarto Imóveis.`;
  if (s === "a_vencer")
    return `${cab}\n\nPassando para lembrar que o aluguel do imóvel ${k.imovel} vence em ${v}, no valor de ${brl(totalCobranca(c))}.\n\nSe já estiver pago, pode desconsiderar.`;
  if (s === "vence_hoje")
    return `${cab}\n\nO aluguel do imóvel ${k.imovel} vence hoje, no valor de ${brl(totalCobranca(c))}.\n\nAssim que pagar, pode enviar o comprovante por aqui.`;
  const a = acrescimos(c, k, ref);
  return `${cab}\n\nNão identificamos o pagamento do aluguel do imóvel ${k.imovel}, vencido em ${v} (${a.dias} ${a.dias === 1 ? "dia" : "dias"}).\n\nValor: ${brl(totalCobranca(c))}\nMulta: ${brl(a.multa)}\nJuros: ${brl(a.juros)}\nTotal hoje: ${brl(a.total)}\n\nSe já tiver pago, envie o comprovante por aqui. Se precisar conversar sobre o pagamento, estamos à disposição.`;
}
