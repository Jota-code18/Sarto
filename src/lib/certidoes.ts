import { type Dia, diasEntre, hoje, lerData, maisDias, MESES } from "./datas";
import { mascaraDoc, semAcento, soDigitos } from "./formato";
import type { Certidao, Parte, Regras, ResultadoCert } from "./tipos";

export interface TipoCert {
  id: string;
  nome: string;
  orgao: string;
  para: Parte["tipo"][];
  /** validade em dias usada quando o PDF não diz (editável em Configurações) */
  dias: number;
  custo: "gratuita" | "paga";
  como: string;
  url: string;
  /** dados que o portal pede, na ordem */
  pede: ("doc" | "nome" | "nascimento" | "mae" | "matricula" | "inscricao")[];
  /** formulário público sem captcha: o painel abre já preenchido */
  direto?: boolean;
}

export const TIPOS_CERT: TipoCert[] = [
  {
    id: "cnd_federal",
    nome: "Tributos federais e dívida ativa da União",
    orgao: "Receita Federal / PGFN",
    para: ["PF"],
    dias: 180,
    custo: "gratuita",
    como: "Informe o CPF e a data de nascimento. O portal pede uma verificação humana.",
    url: "https://servicos.receitafederal.gov.br/servico/certidoes/#/home/cpf",
    pede: ["doc", "nascimento"],
  },
  {
    id: "cnd_federal_pj",
    nome: "Tributos federais e dívida ativa da União",
    orgao: "Receita Federal / PGFN",
    para: ["PJ"],
    dias: 180,
    custo: "gratuita",
    como: "Informe o CNPJ. O portal pede uma verificação humana.",
    url: "https://servicos.receitafederal.gov.br/servico/certidoes/#/home/cnpj",
    pede: ["doc"],
  },
  {
    id: "cndt",
    nome: "Débitos trabalhistas (CNDT)",
    orgao: "TST",
    para: ["PF", "PJ"],
    dias: 180,
    custo: "gratuita",
    como: "Emitir certidão, informe o documento e digite os caracteres da imagem.",
    url: "https://cndt-certidao.tst.jus.br/inicio.faces",
    pede: ["doc"],
  },
  {
    id: "trt18",
    nome: "Ações trabalhistas em andamento",
    orgao: "TRT da 18ª Região",
    para: ["PF", "PJ"],
    dias: 30,
    custo: "gratuita",
    como: "Escolha Certidão de Ações em Andamento. A consulta é pelo CPF ou CNPJ.",
    url: "https://sistemas.trt18.jus.br/consultasPortal/pages/Processuais/Certidao.seam",
    pede: ["doc", "nome"],
  },
  {
    id: "tjgo_civel",
    nome: "Distribuição cível (Nada Consta)",
    orgao: "TJGO",
    para: ["PF"],
    dias: 30,
    custo: "gratuita",
    como: "Pede nome, CPF, nome da mãe e nascimento. Positiva não sai pela internet: o próprio portal orienta ir ao fórum.",
    url: "https://projudi.tjgo.jus.br/CertidaoNegativaPositivaPublica?PaginaAtual=1&TipoArea=1&InteressePessoal=S",
    pede: ["nome", "doc", "mae", "nascimento"],
  },
  {
    id: "tjgo_civel_pj",
    nome: "Distribuição cível (Nada Consta)",
    orgao: "TJGO",
    para: ["PJ"],
    dias: 30,
    custo: "gratuita",
    como: "Formulário de pessoa jurídica do Projudi.",
    url: "https://projudi.tjgo.jus.br/CertidaoNegativaPositivaPublicaPJ?PaginaAtual=1",
    pede: ["nome", "doc"],
  },
  {
    id: "jf_trf1",
    nome: "Distribuição cível da Justiça Federal",
    orgao: "TRF1 (Certidão Unificada do CJF)",
    para: ["PF", "PJ"],
    dias: 30,
    custo: "gratuita",
    como: "Escolha o tipo Cível. A certidão chega no e-mail informado no formulário.",
    url: "https://certidao-unificada.cjf.jus.br/",
    pede: ["doc"],
  },
  {
    id: "sefaz_go",
    nome: "Dívida ativa estadual",
    orgao: "Secretaria da Economia de Goiás",
    para: ["PF", "PJ"],
    dias: 60,
    custo: "gratuita",
    como: "O painel abre a certidão já preenchida em outra aba.",
    url: "https://www.sefaz.go.gov.br/certidao/emissao/",
    pede: ["doc"],
    direto: true,
  },
  {
    id: "municipal",
    nome: "Débitos municipais e IPTU",
    orgao: "Prefeitura de Anápolis",
    para: ["IMOVEL", "PF", "PJ"],
    dias: 30,
    custo: "gratuita",
    como: "Portal do Cidadão, menu Certidões. Tem imagem de verificação.",
    url: "https://portaldocidadao.anapolis.go.gov.br/",
    pede: ["inscricao", "doc"],
  },
  {
    id: "protestos",
    nome: "Consulta de protestos",
    orgao: "CENPROT",
    para: ["PF", "PJ"],
    dias: 30,
    custo: "gratuita",
    como: "A consulta nacional é gratuita com login gov.br. A certidão oficial do cartório é paga.",
    url: "https://www.pesquisaprotesto.com.br/",
    pede: ["doc"],
  },
  {
    id: "cnib",
    nome: "Indisponibilidade de bens",
    orgao: "CNIB",
    para: ["PF", "PJ"],
    dias: 30,
    custo: "gratuita",
    como: "Consulta com certificado ou conta gov.br. Costuma ser feita pela Gabi ou pelo cartório.",
    url: "https://www.indisponibilidade.org.br/",
    pede: ["doc"],
  },
  {
    id: "matricula",
    nome: "Matrícula com ônus e ações",
    orgao: "RI Digital (ONR)",
    para: ["IMOVEL"],
    dias: 30,
    custo: "paga",
    como: "Pedido pelo número da matrícula. É paga. A visualização de matrícula não vale como certidão.",
    url: "https://ridigital.org.br/",
    pede: ["matricula"],
  },
  {
    id: "condominio",
    nome: "Quitação de condomínio",
    orgao: "Administradora do condomínio",
    para: ["IMOVEL"],
    dias: 30,
    custo: "gratuita",
    como: "Peça à administradora ou ao síndico, com identificação da unidade.",
    url: "",
    pede: [],
  },
];

export const tipoCert = (id: string) => TIPOS_CERT.find((t) => t.id === id);

/** Certidões que entram por padrão em cada parte. A Gabi ajusta no dossiê. */
export function certidoesPadrao(tipo: Parte["tipo"], comCondominio = false) {
  return TIPOS_CERT.filter((t) => t.para.includes(tipo))
    .filter((t) => (tipo === "IMOVEL" ? true : t.id !== "municipal"))
    .filter((t) => t.id !== "condominio" || comCondominio)
    .map((t) => t.id);
}

export const diasValidade = (tipo: string, r: Regras) => r.validadeCert[tipo] ?? tipoCert(tipo)?.dias ?? 30;

export type SituacaoCert = "pendente" | "solicitada" | "valida" | "vencendo" | "vencida" | "dispensada";
export function situacaoCert(c: Certidao, ref: Dia = hoje()): SituacaoCert {
  if (c.status === "dispensada") return "dispensada";
  if (c.status !== "emitida") return c.status;
  if (!c.validade) return "valida";
  const n = diasEntre(ref, c.validade);
  return n < 0 ? "vencida" : n <= 7 ? "vencendo" : "valida";
}

export const NOME_RESULTADO: Record<ResultadoCert, string> = {
  negativa: "Negativa",
  positiva: "Positiva",
  positiva_efeito_negativa: "Positiva com efeito de negativa",
  informativa: "Informativa",
};

/* ------------------------------------------------------------------ *
 * Leitura do PDF: só texto e regra fixa, sem IA. O resultado é uma
 * sugestão. Alguém confere e assina embaixo antes de valer.
 * ------------------------------------------------------------------ */

export interface Leitura {
  tipo: string | null;
  resultado: ResultadoCert | null;
  docs: string[];
  emitidaEm: Dia | null;
  validade: Dia | null;
  numero: string | null;
  confianca: "alta" | "media" | "baixa";
  avisos: string[];
}

const ASSINATURAS: [string, RegExp][] = [
  ["cndt", /debitos trabalhistas|banco nacional de devedores trabalhistas/],
  ["cnd_federal", /tributos federais e a divida ativa da uniao/],
  ["trt18", /tribunal regional do trabalho da 18|trt(?:\s|-)*(?:da\s*)?18|acoes trabalhistas/],
  ["jf_trf1", /tribunal regional federal da 1|justica federal|certidao unificada/],
  ["tjgo_civel", /tribunal de justica do estado de goias|tjgo|nada consta.*(?:civel|distribui)/],
  ["sefaz_go", /sefaz-go|secretaria (?:de estado )?da economia|fazenda publica estadual|debito inscrito em divida ativa/],
  ["municipal", /prefeitura (?:municipal )?de anapolis|municipio de anapolis|tributos municipais|iptu/],
  ["protestos", /cenprot|protesto(?:s)? de titulos|ieptb/],
  ["cnib", /indisponibilidade de bens|cnib/],
  ["matricula", /registro de imoveis|matricula n|onr|oficial de registro/],
  ["condominio", /quitacao (?:de )?(?:condominio|taxas condominiais)|declaracao de quitacao/],
];

function acharValidade(t: string, emitida: Dia | null): Dia | null {
  const direta = /(?:valida ate|validade\s*:?|valida[de]* ate o dia)\s*:?\s*(\d{2}\/\d{2}\/\d{4})/.exec(t);
  if (direta) return lerData(direta[1]);
  const dias = /(?:valid[ao]|validade)(?: \w+){0,4}? (?:de |por |e de )?(\d{2,3})\s*(?:\([^)]*\)\s*)?dias/.exec(t) ?? /prazo de (\d{2,3})\s*(?:\([^)]*\)\s*)?dias/.exec(t);
  return dias && emitida ? maisDias(emitida, Number(dias[1])) : null;
}

function acharEmissao(t: string): Dia | null {
  const m =
    /(?:expedicao|expedida em|emitida em|emissao|data da emissao|emitido em)\s*:?\s*(?:as [\d:h]+\s*(?:do dia|de)?\s*)?(\d{2}\/\d{2}\/\d{4})/.exec(t) ??
    /emitida as [\d:]+ do dia (\d{2}\/\d{2}\/\d{4})/.exec(t);
  if (m) return lerData(m[1]);
  const ext = /(\d{1,2})\s+(?:de\s+)?(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+(?:de\s+)?(\d{4})/.exec(t);
  if (ext) {
    const mes = MESES.map(semAcento).indexOf(ext[2]) + 1;
    return `${ext[3]}-${String(mes).padStart(2, "0")}-${ext[1].padStart(2, "0")}`;
  }
  const q = /(\d{2}\/\d{2}\/\d{4})/.exec(t);
  return q ? lerData(q[1]) : null;
}

function acharResultado(t: string): ResultadoCert | null {
  if (/positiva com efeitos? de negativa|positiva,? com efeito/.test(t)) return "positiva_efeito_negativa";
  // negação antes da afirmação: "não consta" contém "consta"
  const negativa = /certidao (?:\w+ ){0,4}negativa|\bnegativa\b|nada consta|nao consta|nao constam|nao foram encontrad|nao existem? (?:debitos|protestos|acoes)|inexist/.test(t);
  const positiva =
    /certidao (?:\w+ ){0,4}positiva|\bpositiva\b|(?<!nao )(?<!nada )\bconstam? (?:contra|os? seguintes?|debitos?|acoes|processos?|pendencias)|foram encontrad[oa]s(?! nenhum)/.test(
      t,
    );
  if (positiva && !/\bnegativa\b|nada consta|nao consta|nao constam/.test(t)) return "positiva";
  if (positiva && negativa) return null;
  if (negativa) return "negativa";
  return null;
}

function acharNumero(bruto: string): string | null {
  const m =
    /c[óo]digo de controle(?: da certid[ãa]o)?\s*:?\s*([A-Z0-9][A-Z0-9.\-/]{5,})/i.exec(bruto) ??
    /certid[ãa]o\s*(?:n[ºo°.]*|n[úu]mero)\s*:?\s*(?:n[ºo°.]*\s*)?([\d][\d./-]{4,})/i.exec(bruto) ??
    /(?:c[óo]digo (?:de )?(?:valida[çc][ãa]o|autenticidade|verificador)|autentica[çc][ãa]o)\s*:?\s*([A-Z0-9][A-Z0-9.\-/]{5,})/i.exec(bruto);
  return m ? m[1].replace(/[.\-/]+$/, "") : null;
}

export function lerCertidao(texto: string): Leitura {
  const bruto = texto.replace(/\s+/g, " ").trim();
  const t = semAcento(bruto);
  const avisos: string[] = [];
  if (t.length < 60) {
    return {
      tipo: null,
      resultado: null,
      docs: [],
      emitidaEm: null,
      validade: null,
      numero: null,
      confianca: "baixa",
      avisos: ["O PDF não tem texto selecionável (parece escaneado). Preencha os dados na mão."],
    };
  }
  const tipo = ASSINATURAS.find(([, re]) => re.test(t))?.[0] ?? null;
  const docs = [...new Set([...bruto.matchAll(/\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g)].map((m) => soDigitos(m[0])))];
  const emitidaEm = acharEmissao(t);
  const validade = acharValidade(t, emitidaEm);
  const resultado = tipo === "matricula" ? "informativa" : acharResultado(t);
  if (!tipo) avisos.push("Não reconheci o órgão emissor.");
  if (!resultado) avisos.push("Não ficou claro se é negativa ou positiva. Leia o documento.");
  if (!emitidaEm) avisos.push("Não achei a data de emissão.");
  const achados = [tipo, resultado, emitidaEm].filter(Boolean).length;
  return {
    tipo,
    resultado,
    docs,
    emitidaEm,
    validade,
    numero: acharNumero(bruto),
    confianca: achados === 3 ? "alta" : achados === 2 ? "media" : "baixa",
    avisos,
  };
}

/** Compara o que foi lido com a parte do dossiê. Documento de outra pessoa é o erro mais caro. */
export function conferirLeitura(l: Leitura, c: Certidao, p: Parte, ref: Dia = hoje()): string[] {
  const a = [...l.avisos];
  const base = (x: string) => x.replace(/_pj$/, "");
  if (l.tipo && base(l.tipo) !== base(c.tipo)) a.push(`O PDF parece ser de "${tipoCert(l.tipo)?.nome ?? l.tipo}", não de "${tipoCert(c.tipo)?.nome}".`);
  const doc = soDigitos(p.doc);
  if (p.tipo !== "IMOVEL" && doc && l.docs.length) {
    const raiz = p.tipo === "PJ" ? doc.slice(0, 8) : doc;
    if (!l.docs.some((d) => d.startsWith(raiz))) a.push(`O documento no PDF (${l.docs.map(mascaraDoc).join(", ")}) não é o de ${p.nome}.`);
  }
  if (l.resultado === "positiva") a.push("Certidão POSITIVA: precisa de análise da Gabi.");
  if (l.resultado === "positiva_efeito_negativa") a.push("Positiva com efeito de negativa: confirmar a origem do débito.");
  if (l.validade && diasEntre(ref, l.validade) < 0) a.push("Certidão já vencida.");
  if (l.emitidaEm && diasEntre(l.emitidaEm, ref) < 0) a.push("Data de emissão no futuro: confira.");
  return a;
}

/** Situação geral do dossiê, para o cartão e para o parecer */
export function resumoDossie(certs: Certidao[], ref: Dia = hoje()) {
  const vivas = certs.filter((c) => c.status !== "dispensada");
  const sit = vivas.map((c) => situacaoCert(c, ref));
  const n = (s: SituacaoCert) => sit.filter((x) => x === s).length;
  return {
    total: vivas.length,
    prontas: n("valida") + n("vencendo"),
    pendentes: n("pendente") + n("solicitada"),
    vencidas: n("vencida"),
    vencendo: n("vencendo"),
    positivas: vivas.filter((c) => c.resultado === "positiva").length,
    semConferencia: vivas.filter((c) => c.status === "emitida" && !c.conferida).length,
  };
}
