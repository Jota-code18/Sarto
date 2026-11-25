import type { Perfil, Regras } from "./tipos";

/**
 * Valores iniciais. Os que estão em A_CONFIRMAR ainda não foram passados pela
 * Sarto: são um ponto de partida editável em Configurações.
 */
export const REGRAS: Regras = {
  locacaoMinimo: 2500,
  taxaPadrao: 10,
  taxaReduzida: 8,
  taxaReduzidaAcima: 7000,
  taxaReduzidaImoveis: 3,
  multaPadrao: 10,
  jurosPadrao: 1,
  comissaoVenda: 5,
  splitGestor: 10,
  splitImobiliaria: 10,
  prazoMinutaHoras: 48,
  prazoPixHoras: 24,
  prazoAnaliseHoras: 24,
  prazoTitularidadeDias: 30,
  videoPorDia: 3,
  videoDeslocamentoMin: 30,
  videoEntregaDias: 3,
  videoInicio: "08:30",
  videoFim: "18:00",
  fotosMin: { casa_rua: 20, condominio: 25, apartamento: 18, lote: 6, comercial: 12 },
  padraoPrecoMin: 1000000,
  padraoPrecoMax: 0,
  padraoBairros: "",
  padraoCidade: "Anápolis",
  diaFornecedores: 10,
  validadeCert: {},
  limiteCustos: 0,
  metaVgv: 0,
  metaCaptacoes: 0,
  metaLeads: 250,
  metaVisitas: 0,
};

export const A_CONFIRMAR = new Set<keyof Regras>([
  "multaPadrao",
  "jurosPadrao",
  "comissaoVenda",
  "videoPorDia",
  "videoDeslocamentoMin",
  "videoEntregaDias",
  "videoInicio",
  "videoFim",
  "fotosMin",
  "padraoPrecoMin",
  "padraoPrecoMax",
  "padraoBairros",
  "limiteCustos",
  "metaVgv",
  "metaCaptacoes",
  "metaVisitas",
]);

export const PERFIS: Record<Perfil, { nome: string; area: string }> = {
  socios: { nome: "Pedro", area: "Sócios" },
  comercial: { nome: "Igor", area: "Comercial" },
  locacao: { nome: "Verônica", area: "Locação e ADM" },
  juridico: { nome: "Gabi", area: "Jurídico" },
  marketing: { nome: "Jales", area: "Marketing" },
  corretor: { nome: "Corretor", area: "Corretores" },
};

export type Acao = "repasse" | "multa" | "comissao" | "minuta" | "parecer" | "fotos" | "post" | "reajuste" | "regras";
const QUEM: Record<Acao, Perfil[]> = {
  repasse: ["locacao", "socios"],
  multa: ["locacao", "socios"],
  reajuste: ["locacao", "socios"],
  comissao: ["socios"],
  minuta: ["juridico"],
  parecer: ["juridico"],
  fotos: ["comercial", "socios"],
  post: ["marketing", "socios"],
  regras: ["socios", "locacao", "comercial"],
};
export const pode = (p: Perfil, a: Acao) => QUEM[a].includes(p);
export const quemPode = (a: Acao) => QUEM[a].map((p) => PERFIS[p].nome).join(" ou ");
