import { br, diasEntre, hoje, porExtenso } from "./datas";
import { arred, brl, mascaraDoc, valorExtenso } from "./formato";
import type { Contrato, Dossie, Participante, Regras, Venda } from "./tipos";

export const ETAPAS_VENDA: {
  n: number;
  nome: string;
  quem: string;
  itens: { id: string; nome: string }[];
}[] = [
  {
    n: 1,
    nome: "Venda fechada",
    quem: "Corretor",
    itens: [
      { id: "dados", nome: "Dados da negociação preenchidos" },
      { id: "docs_vendedor", nome: "Documentos do vendedor" },
      { id: "docs_comprador", nome: "Documentos do comprador" },
    ],
  },
  { n: 2, nome: "Resumo", quem: "Igor", itens: [{ id: "resumo", nome: "Resumo da negociação enviado à Gabi" }] },
  {
    n: 3,
    nome: "Certidões",
    quem: "Jurídico",
    itens: [
      { id: "certidoes", nome: "Certidões emitidas" },
      { id: "parecer", nome: "Dossiê com parecer da Gabi" },
    ],
  },
  {
    n: 4,
    nome: "Minuta",
    quem: "Gabi",
    itens: [
      { id: "minuta", nome: "Minuta redigida" },
      { id: "revisada", nome: "Minuta revisada e liberada pela Gabi" },
    ],
  },
  {
    n: 5,
    nome: "Assinatura",
    quem: "Igor",
    itens: [
      { id: "clicksign", nome: "Contrato no ClickSign" },
      { id: "assinado", nome: "Assinado por todos" },
      { id: "pix", nome: "Pix na conta da Sarto" },
    ],
  },
  {
    n: 6,
    nome: "Comissão",
    quem: "Igor e Pedro",
    itens: [
      { id: "relatorio", nome: "Relatório de comissão" },
      { id: "ok", nome: "OK do Pedro" },
      { id: "lancada", nome: "Lançada pela Verônica" },
    ],
  },
  {
    n: 7,
    nome: "Banco e cartório",
    quem: "Operacional",
    itens: [
      { id: "credito", nome: "Crédito aprovado (se financiado)" },
      { id: "escritura", nome: "Escritura ou contrato do banco" },
      { id: "registro", nome: "Registro na matrícula" },
      { id: "chaves", nome: "Chaves entregues" },
    ],
  },
];

export const itensDaEtapa = (v: Venda) => {
  const e = ETAPAS_VENDA[v.etapa - 1];
  return e.itens.filter((i) => i.id !== "credito" || v.forma === "financiado");
};

/** Travas do processo. Sem isso a venda não muda de etapa. */
export function impedimentos(v: Venda, dossie: Dossie | undefined, minutaLiberada: boolean): string[] {
  const p: string[] = [];
  for (const i of itensDaEtapa(v)) if (!v.checklist[i.id]) p.push(i.nome);
  if (v.etapa === 3) {
    if (!dossie) p.push("Dossiê de certidões não foi aberto");
    else if (dossie.risco === "a_analisar") p.push("A Gabi ainda não deu parecer no dossiê");
    else if (dossie.risco === "travado") p.push("Dossiê travado pela Gabi");
  }
  if (v.etapa === 4 && !minutaLiberada) p.push("Nenhuma minuta liberada pela Gabi");
  if (v.etapa === 6 && v.comissaoStatus !== "lancada") p.push("Comissão ainda não foi aprovada e lançada");
  return p;
}

/** Percentuais são sobre a comissão total. O corretor fica com o que sobra. */
export function dividirComissao(v: Pick<Venda, "valor" | "comissaoPct" | "participantes">, r: Regras, corretor: string) {
  const total = arred((v.valor * v.comissaoPct) / 100);
  const linhas: (Participante & { valor: number; fixo: boolean })[] = [
    { nome: "Igor", papel: "Gestão comercial", pct: r.splitGestor, fixo: true, valor: 0 },
    { nome: "Sarto", papel: "Imobiliária", pct: r.splitImobiliaria, fixo: true, valor: 0 },
    ...v.participantes.map((p) => ({ ...p, fixo: false, valor: 0 })),
  ];
  const usado = linhas.reduce((a, l) => a + l.pct, 0);
  for (const l of linhas) l.valor = arred((total * l.pct) / 100);
  const resto = arred(total - linhas.reduce((a, l) => a + l.valor, 0));
  linhas.push({ nome: corretor || "Corretor", papel: "Corretor da venda", pct: arred(100 - usado), fixo: true, valor: resto });
  return { total, linhas, valido: usado <= 100 };
}

export function prazoPix(v: Venda, r: Regras, agora = Date.now()) {
  if (!v.assinadoEm || v.pixEm) return null;
  const fim = new Date(v.assinadoEm).getTime() + r.prazoPixHoras * 36e5;
  const h = Math.round((fim - agora) / 36e5);
  return { vencido: h < 0, horas: h };
}

/** Horas corridas até o prazo; negativo é atraso */
export const horasAte = (iso: string, agora = Date.now()) => Math.round((new Date(iso).getTime() - agora) / 36e5);

export function resumoNegociacao(v: Venda, corretor: string) {
  const L: string[] = [];
  L.push("RESUMO DA NEGOCIAÇÃO", "");
  L.push(`Imóvel: ${v.imovel}${v.imovelCod ? ` (cód. ${v.imovelCod})` : ""}`);
  L.push(`Valor: ${brl(v.valor)} (${valorExtenso(v.valor)})`);
  L.push(`Forma: ${v.forma === "avista" ? "à vista" : v.forma === "financiado" ? `financiado em ${brl(v.financiado)}${v.banco ? ` pelo ${v.banco}` : ""}` : "com permuta"}`);
  if (v.sinal) L.push(`Sinal: ${brl(v.sinal)}`);
  L.push("", "VENDEDOR", v.vendedor.nome || "(não informado)", `CPF/CNPJ: ${mascaraDoc(v.vendedor.doc) || "—"}`, `Contato: ${v.vendedor.tel || "—"} ${v.vendedor.email}`);
  L.push("", "COMPRADOR", v.comprador.nome || "(não informado)", `CPF/CNPJ: ${mascaraDoc(v.comprador.doc) || "—"}`, `Contato: ${v.comprador.tel || "—"} ${v.comprador.email}`);
  L.push("", "CONDIÇÕES", v.condicoes || "(nenhuma condição especial)");
  L.push("", `Comissão: ${num(v.comissaoPct)}% = ${brl((v.valor * v.comissaoPct) / 100)}`);
  L.push(`Corretor: ${corretor || "—"}`, `Fechada em: ${br(v.criadaEm)}`);
  const falta: string[] = [];
  if (!v.vendedor.doc) falta.push("documento do vendedor");
  if (!v.comprador.doc) falta.push("documento do comprador");
  if (!v.imovelCod) falta.push("código do imóvel");
  if (v.forma === "financiado" && !v.banco) falta.push("banco do financiamento");
  if (falta.length) L.push("", `FALTA INFORMAR: ${falta.join(", ")}`);
  return L.join("\n");
}
const num = (v: number) => v.toLocaleString("pt-BR");

/* ---------- Minutas ---------- */

export const MARCA = "RASCUNHO, NÃO ENVIAR. SEM REVISÃO JURÍDICA.";

/** Campos {{assim}} que existem no texto, sem repetir */
export const camposDe = (corpo: string) => [...new Set([...corpo.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]))];

export function preencher(corpo: string, campos: Record<string, string>) {
  return corpo.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (tudo, k: string) => campos[k]?.trim() || tudo);
}

export const camposVazios = (corpo: string, campos: Record<string, string>) => camposDe(corpo).filter((k) => !campos[k]?.trim());

const NOME_CAMPO: Record<string, string> = {
  vendedor_nome: "Nome do vendedor",
  vendedor_doc: "CPF/CNPJ do vendedor",
  vendedor_qualificacao: "Qualificação do vendedor",
  comprador_nome: "Nome do comprador",
  comprador_doc: "CPF/CNPJ do comprador",
  comprador_qualificacao: "Qualificação do comprador",
  imovel_descricao: "Descrição do imóvel",
  imovel_matricula: "Matrícula",
  imovel_cartorio: "Cartório de registro",
  preco: "Preço",
  preco_extenso: "Preço por extenso",
  sinal: "Sinal",
  sinal_extenso: "Sinal por extenso",
  saldo: "Saldo",
  saldo_extenso: "Saldo por extenso",
  forma_pagamento: "Forma de pagamento",
  financiado: "Valor financiado",
  banco: "Banco",
  comissao: "Comissão",
  comissao_pct: "Percentual de comissão",
  condicoes: "Condições especiais",
  data_extenso: "Data por extenso",
  locador_nome: "Nome do locador",
  locador_doc: "CPF/CNPJ do locador",
  locador_qualificacao: "Qualificação do locador",
  locatario_nome: "Nome do locatário",
  locatario_doc: "CPF/CNPJ do locatário",
  locatario_qualificacao: "Qualificação do locatário",
  aluguel: "Aluguel",
  aluguel_extenso: "Aluguel por extenso",
  inicio: "Início",
  fim: "Fim",
  prazo_meses: "Prazo em meses",
  dia_vencimento: "Dia do vencimento",
  indice: "Índice de reajuste",
  garantia: "Garantia",
  multa_pct: "Multa por atraso (%)",
  juros_mes: "Juros ao mês (%)",
  taxa_adm: "Taxa de administração (%)",
  corretor_nome: "Nome do corretor",
  corretor_doc: "CPF do corretor",
  corretor_creci: "CRECI",
  prazo_autorizacao: "Prazo da autorização (dias)",
  exclusividade: "Exclusividade",
  imovel_endereco: "Endereço do imóvel",
  aviso_dias: "Dias de aviso prévio",
};
export const nomeCampo = (k: string) => NOME_CAMPO[k] ?? k.replace(/_/g, " ");

export function camposDaVenda(v: Venda): Record<string, string> {
  const saldo = Math.max(0, v.valor - v.sinal - (v.forma === "financiado" ? v.financiado : 0));
  return {
    vendedor_nome: v.vendedor.nome,
    vendedor_doc: mascaraDoc(v.vendedor.doc),
    comprador_nome: v.comprador.nome,
    comprador_doc: mascaraDoc(v.comprador.doc),
    imovel_descricao: v.imovel,
    preco: brl(v.valor),
    preco_extenso: valorExtenso(v.valor),
    sinal: v.sinal ? brl(v.sinal) : "",
    sinal_extenso: v.sinal ? valorExtenso(v.sinal) : "",
    saldo: brl(saldo),
    saldo_extenso: valorExtenso(saldo),
    financiado: v.financiado ? brl(v.financiado) : "",
    banco: v.banco,
    comissao: brl((v.valor * v.comissaoPct) / 100),
    comissao_pct: num(v.comissaoPct),
    condicoes: v.condicoes,
    data_extenso: porExtenso(hoje()),
  };
}

export function camposDoContrato(c: Contrato, taxa: number): Record<string, string> {
  return {
    locador_nome: c.proprietario.nome,
    locador_doc: mascaraDoc(c.proprietario.doc),
    locatario_nome: c.inquilino.nome,
    locatario_doc: mascaraDoc(c.inquilino.doc),
    imovel_endereco: c.endereco,
    imovel_descricao: c.imovel,
    aluguel: brl(c.aluguel),
    aluguel_extenso: valorExtenso(c.aluguel),
    inicio: br(c.inicio),
    fim: br(c.fim),
    prazo_meses: String(Math.round(diasEntre(c.inicio, c.fim) / 30.44)),
    dia_vencimento: String(c.diaVencimento),
    indice: c.indice,
    garantia: c.garantia,
    multa_pct: num(c.multaPct),
    juros_mes: num(c.jurosMes),
    taxa_adm: num(taxa),
    data_extenso: porExtenso(hoje()),
  };
}
