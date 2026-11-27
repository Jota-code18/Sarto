import type { Dia } from "./datas";

export type Perfil = "socios" | "comercial" | "locacao" | "juridico" | "marketing" | "corretor";

/** Marca de quem fez e quando. Todo processo precisa disso visível. */
export interface Feito {
  em: string;
  por: string;
}
export type Checklist = Record<string, Feito | undefined>;

export interface Corretor {
  id: string;
  nome: string;
  tel: string;
  email: string;
  creci: string;
  entrada: Dia;
  status: "entrando" | "ativo" | "inativo";
  checklist: Checklist;
  obs: string;
}

export type LeadStatus = "novo" | "atendimento" | "visita" | "proposta" | "ganho" | "perdido";
export interface Lead {
  id: string;
  nome: string;
  tel: string;
  email: string;
  canal: string;
  interesse: "comprar" | "alugar" | "vender" | "investir";
  tipoImovel: string;
  bairros: string;
  min: number;
  max: number;
  imovelCod: string;
  corretorId: string;
  status: LeadStatus;
  obs: string;
  criadoEm: Dia;
  atualizadoEm: Dia;
  noJetimob: boolean;
}

export type TipoImovel = "casa_rua" | "condominio" | "apartamento" | "lote" | "comercial";
export interface Captacao {
  id: string;
  codigo: string;
  tipo: TipoImovel;
  finalidade: "venda" | "locacao";
  titulo: string;
  proprietario: Pessoa;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  condominioNome: string;
  valor: number;
  valorCondominio: number;
  iptu: number;
  area: number;
  terreno: number;
  quartos: number;
  suites: number;
  banheiros: number;
  vagas: number;
  matricula: string;
  descricao: string;
  diferenciais: string;
  exclusividade: "" | "sim" | "nao";
  etapa: string;
  checklist: Checklist;
  fotos: string[];
  fotosAprovadas?: Feito;
  corretorId: string;
  origem: string;
  /** anúncio da varredura de onde a captação saiu */
  anuncioUrl?: string;
  criadoEm: Dia;
}

export interface Anuncio {
  id: string;
  portal: string;
  url: string;
  titulo: string;
  tipo: string;
  bairro: string;
  cidade: string;
  preco: number;
  precoAnterior: number;
  area: number;
  quartos: number;
  anunciante: string;
  /** código do imóvel na imobiliária que anuncia */
  codAnunciante: string;
  particular: boolean;
  /** só quando o anúncio publica */
  telefone?: string;
  foto?: string;
  /** empreendimento que o anúncio cita, achado mesmo com erro de escrita */
  empreendimento?: string;
  /** quem anuncia, no portal: junta os anúncios da mesma pessoa */
  idAnunciante?: string;
  /** o número veio de outro anúncio da mesma pessoa */
  telefoneDeOutro?: boolean;
  negocio?: "venda" | "aluguel";
  publicadoEm?: Dia;
  primeiraVez: Dia;
  vistoEm: Dia;
  status: "abordar" | "contatado" | "captado" | "descartado";
  obs: string;
}

/** Nota ou alerta de um anúncio, sempre vindo do Canal Pro ou do Jetimob */
export interface NotaPortal {
  id: string;
  cod: string;
  portal: string;
  nota: number | null;
  anterior?: number;
  motivo: string;
  em: Dia;
}

export interface Pessoa {
  nome: string;
  doc: string;
  tel: string;
  email: string;
}
export interface Contrato {
  id: string;
  codigo: string;
  imovel: string;
  endereco: string;
  bairro: string;
  proprietario: Pessoa & { pix: string };
  inquilino: Pessoa;
  aluguel: number;
  condominio: number;
  iptuMensal: number;
  encargosNoBoleto: boolean;
  diaVencimento: number;
  diaRepasse: number;
  inicio: Dia;
  fim: Dia;
  indice: "IGP-M" | "IPCA" | "INPC";
  ultimoReajuste: Dia;
  garantia: string;
  garantiaVence: Dia;
  seguroVence: Dia;
  imoveisDoDono: number;
  multaPct: number;
  jurosMes: number;
  status: "ativo" | "encerrando" | "encerrado";
  checklist: Checklist;
  saida: Checklist;
  obs: string;
}

export interface Cobranca {
  id: string;
  contratoId: string;
  comp: string;
  vencimento: Dia;
  aluguel: number;
  encargos: number;
  extra: number;
  extraMotivo: string;
  pagoEm?: Dia;
  valorPago?: number;
  avisos: { em: string; tipo: string }[];
}

export type ContaTipo = "iptu" | "condominio" | "agua" | "energia";
export interface ContaInquilino {
  id: string;
  contratoId: string;
  comp: string;
  itens: Partial<Record<ContaTipo, "ok" | "pendente" | "atrasada">>;
  pedidoEm?: string;
}

export interface Repasse {
  id: string;
  contratoId: string;
  comp: string;
  bruto: number;
  taxaPct: number;
  taxa: number;
  descontos: number;
  descontoMotivo: string;
  liquido: number;
  previsto: Dia;
  status: "calculado" | "aprovado" | "pago";
  aprovado?: Feito;
  pagoEm?: Dia;
}

export interface FunilLocacao {
  id: string;
  imovel: string;
  bairro: string;
  proprietario: Pessoa;
  interessado: Pessoa;
  aluguel: number;
  etapa: string;
  checklist: Checklist;
  desde: Dia;
  obs: string;
  criadoEm: Dia;
}

export interface Chamado {
  id: string;
  contratoId: string;
  titulo: string;
  descricao: string;
  quemPaga: "proprietario" | "inquilino" | "a definir";
  custo: number;
  status: "aberto" | "orcamento" | "aprovado" | "concluido";
  abertoEm: Dia;
}

export interface MultaProposta {
  id: string;
  contratoId: string;
  motivo: string;
  clausula: string;
  valor: number;
  status: "proposta" | "aprovada" | "recusada";
  criadaEm: Dia;
  decisao?: Feito;
}

export interface Participante {
  nome: string;
  papel: string;
  pct: number;
}
export interface Venda {
  id: string;
  imovel: string;
  imovelCod: string;
  vendedor: Pessoa;
  comprador: Pessoa;
  valor: number;
  comissaoPct: number;
  forma: "avista" | "financiado" | "permuta";
  financiado: number;
  banco: string;
  sinal: number;
  condicoes: string;
  corretorId: string;
  etapa: number;
  desde: string;
  checklist: Checklist;
  assinadoEm?: string;
  pixEm?: string;
  participantes: Participante[];
  comissaoStatus: "calcular" | "enviada" | "aprovada" | "lancada";
  comissaoAprovada?: Feito;
  avisos: { em: string; para: string; texto: string }[];
  obs: string;
  criadaEm: Dia;
}

export interface Parte {
  id: string;
  papel: string;
  tipo: "PF" | "PJ" | "IMOVEL";
  nome: string;
  doc: string;
  nascimento: Dia;
  mae: string;
  matricula: string;
  inscricao: string;
}
export type ResultadoCert = "negativa" | "positiva" | "positiva_efeito_negativa" | "informativa";
export interface Certidao {
  id: string;
  parteId: string;
  tipo: string;
  status: "pendente" | "solicitada" | "emitida" | "dispensada";
  emitidaEm?: Dia;
  validade?: Dia;
  resultado?: ResultadoCert;
  numero?: string;
  arquivo?: string;
  arquivoNome?: string;
  alertas?: string[];
  conferida?: Feito;
  obs?: string;
}
export interface Dossie {
  id: string;
  titulo: string;
  origem: "venda" | "captacao" | "locacao" | "avulso";
  origemId?: string;
  partes: Parte[];
  certidoes: Certidao[];
  parecer: string;
  risco: "a_analisar" | "liberado" | "com_ressalva" | "travado";
  revisao?: Feito;
  criadoEm: Dia;
}

export interface Modelo {
  id: string;
  nome: string;
  grupo: string;
  corpo: string;
  /** chave no IndexedDB quando o modelo é um .docx da Gabi */
  docx?: string;
  docxNome?: string;
  validado?: Feito;
}
export interface Minuta {
  id: string;
  titulo: string;
  modeloId: string;
  vendaId?: string;
  contratoId?: string;
  campos: Record<string, string>;
  texto: string;
  status: "rascunho" | "em_revisao" | "ajustar" | "liberada";
  criadaEm: string;
  prazo: string;
  revisao?: Feito;
  notas: string;
}

export interface ContaPagar {
  id: string;
  fornecedor: string;
  categoria: string;
  valor: number;
  vencimento: Dia;
  recorrente: boolean;
  pagoEm?: Dia;
}
export interface Lancamento {
  id: string;
  data: Dia;
  descricao: string;
  valor: number;
  categoria: string;
  origem: "manual" | "extrato" | "comissao" | "locacao";
  fitid?: string;
}

export interface Post {
  id: string;
  data: Dia;
  tipo: "imovel" | "vendido" | "institucional" | "curiosidade" | "video";
  titulo: string;
  status: "ideia" | "producao" | "aprovacao" | "agendado" | "publicado";
  refId?: string;
  legenda: string;
  aprovado?: Feito;
}
export interface MetricaMkt {
  id: string;
  comp: string;
  seguidores: number;
  alcance: number;
  interacoes: number;
  investido: number;
  leadsPagos: number;
}

export interface Evento {
  id: string;
  agenda: string;
  titulo: string;
  data: Dia;
  inicio: string;
  fim: string;
  local: string;
  quem: string;
  semanal?: boolean;
  entrega?: Dia;
  entregue?: boolean;
  obs: string;
}

export interface RotinaDia {
  id: string;
  data: Dia;
  turno: "abertura" | "fechamento";
  itens: Checklist;
}
export interface Estoque {
  id: string;
  item: string;
  qtd: number;
  minimo: number;
  unidade: string;
}
export interface Aniversario {
  id: string;
  nome: string;
  /** mm-dd */
  dia: string;
  tipo: "cliente" | "equipe";
  tel: string;
  contexto: string;
  enviadoAno?: number;
}
interface Registro {
  id: string;
  data: Dia;
  pessoa: string;
  bloco: string;
  atividade: string;
  categoria: string;
}
export interface Custo {
  id: string;
  comp: string;
  modulo: string;
  descricao: string;
  valor: number;
}
export interface Pendencia {
  id: string;
  area: string;
  quem: string;
  item: string;
  bloqueia: string;
  status: "pedir" | "pedido" | "recebido";
  nota: string;
}
interface Log {
  id: string;
  em: string;
  quem: string;
  area: string;
  texto: string;
}

export interface Regras {
  locacaoMinimo: number;
  taxaPadrao: number;
  taxaReduzida: number;
  taxaReduzidaAcima: number;
  taxaReduzidaImoveis: number;
  multaPadrao: number;
  jurosPadrao: number;
  comissaoVenda: number;
  splitGestor: number;
  splitImobiliaria: number;
  prazoMinutaHoras: number;
  prazoPixHoras: number;
  prazoAnaliseHoras: number;
  prazoTitularidadeDias: number;
  videoPorDia: number;
  videoDeslocamentoMin: number;
  videoEntregaDias: number;
  videoInicio: string;
  videoFim: string;
  fotosMin: Record<TipoImovel, number>;
  padraoPrecoMin: number;
  padraoPrecoMax: number;
  padraoBairros: string;
  padraoCidade: string;
  diaFornecedores: number;
  validadeCert: Record<string, number>;
  limiteCustos: number;
  metaVgv: number;
  metaCaptacoes: number;
  metaLeads: number;
  metaVisitas: number;
}

/** Pessoa da equipe. O login por convite, no Supabase, parte desta lista. */
export interface Usuario {
  id: string;
  nome: string;
  email: string;
  tel: string;
  perfil: Perfil;
  ativo: boolean;
  criadoEm: Dia;
}

export interface Dados {
  usuarios: Usuario[];
  corretores: Corretor[];
  leads: Lead[];
  captacoes: Captacao[];
  anuncios: Anuncio[];
  notas: NotaPortal[];
  contratos: Contrato[];
  cobrancas: Cobranca[];
  contasInquilino: ContaInquilino[];
  repasses: Repasse[];
  funil: FunilLocacao[];
  chamados: Chamado[];
  multas: MultaProposta[];
  vendas: Venda[];
  dossies: Dossie[];
  modelos: Modelo[];
  minutas: Minuta[];
  contasPagar: ContaPagar[];
  lancamentos: Lancamento[];
  posts: Post[];
  metricas: MetricaMkt[];
  eventos: Evento[];
  rotinas: RotinaDia[];
  estoque: Estoque[];
  aniversarios: Aniversario[];
  registros: Registro[];
  custos: Custo[];
  pendencias: Pendencia[];
  logs: Log[];
}
export type Colecao = keyof Dados;

/** Imóvel lido do site público */
export interface ImovelSite {
  cod: string;
  titulo: string;
  tipo: string;
  bairro: string | null;
  cidade: string | null;
  cond: string | null;
  venda: number | null;
  aluguel: number | null;
  quartos: number | null;
  suites: number | null;
  banheiros: number | null;
  vagas: number | null;
  area: number | null;
  terreno: number | null;
  condominio: number | null;
  excl: boolean;
  fotos: number;
  precoNoTexto: number | null;
  capa: string | null;
  url: string;
}
