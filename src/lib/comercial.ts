import { soDigitos } from "./formato";
import { novoId } from "./formato";
import type { Dia } from "./datas";
import type { Anuncio, Captacao, Lead, TipoImovel } from "./tipos";

export const TIPOS_IMOVEL: Record<TipoImovel, string> = {
  casa_rua: "Casa de rua",
  condominio: "Casa em condomínio",
  apartamento: "Apartamento",
  lote: "Lote",
  comercial: "Comercial",
};

export const CHECK_CORRETOR: { grupo: string; itens: { id: string; nome: string; quem: string }[] }[] = [
  {
    grupo: "Dados e contrato",
    itens: [
      { id: "dados", nome: "Dados pessoais e documentos", quem: "Igor" },
      { id: "banco", nome: "Dados bancários", quem: "Igor" },
      { id: "creci", nome: "CRECI (se houver)", quem: "Igor" },
      { id: "contrato", nome: "Contrato enviado ao jurídico", quem: "Gabi" },
      { id: "assinado", nome: "Contrato assinado", quem: "Igor" },
    ],
  },
  {
    grupo: "Acessos",
    itens: [
      { id: "jetimob", nome: "Usuário no JetImob", quem: "Igor" },
      { id: "email", nome: "E-mail Sarto", quem: "Verônica" },
    ],
  },
  {
    grupo: "Marketing",
    itens: [
      { id: "kit", nome: "Kit de boas-vindas", quem: "Yan" },
      { id: "perfis", nome: "Perfis ajustados ao padrão Sarto", quem: "Yan" },
    ],
  },
  {
    grupo: "Integração",
    itens: [
      { id: "integracao", nome: "Integração do mês", quem: "Igor" },
      { id: "cultura", nome: "Código cultural apresentado", quem: "Igor" },
      { id: "treino", nome: "Treinamento JetImob", quem: "Igor" },
      { id: "lista100", nome: "Lista 100 cadastrada", quem: "Corretor" },
    ],
  },
];
export const TOTAL_CHECK_CORRETOR = CHECK_CORRETOR.reduce((a, g) => a + g.itens.length, 0);

export const ETAPAS_CAPTACAO: { id: string; nome: string; itens: { id: string; nome: string }[] }[] = [
  { id: "visita", nome: "Visita", itens: [{ id: "visita", nome: "Visita ao imóvel feita" }] },
  {
    id: "autorizacao",
    nome: "Autorização",
    itens: [
      { id: "exclusividade", nome: "Com ou sem exclusividade definido" },
      { id: "autorizacao", nome: "Autorização assinada pelo proprietário" },
    ],
  },
  {
    id: "dados",
    nome: "Dados e PDF",
    itens: [
      { id: "dados", nome: "Dados do imóvel completos" },
      { id: "pdf", nome: "PDF padrão Sarto gerado" },
    ],
  },
  {
    id: "fotos",
    nome: "Fotos",
    itens: [
      { id: "fotos", nome: "Fotos no mínimo do tipo" },
      { id: "fotos_ok", nome: "Fotos aprovadas pelo Igor" },
    ],
  },
  {
    id: "juridico",
    nome: "Due diligence",
    itens: [{ id: "certidoes", nome: "Certidões do proprietário pedidas" }],
  },
  {
    id: "publicado",
    nome: "Publicado",
    itens: [
      { id: "jetimob", nome: "Cadastrado no JetImob" },
      { id: "portais", nome: "Conferido nos portais" },
    ],
  },
];

/** Campos que o PDF padrão exige, por tipo de imóvel */
export function faltando(c: Captacao): string[] {
  const f: string[] = [];
  const p = (ok: unknown, nome: string) => !ok && f.push(nome);
  p(c.proprietario.nome, "nome do proprietário");
  p(c.proprietario.tel, "telefone do proprietário");
  p(c.endereco, "endereço");
  p(c.bairro, "bairro");
  p(c.valor, c.finalidade === "venda" ? "valor de venda" : "valor do aluguel");
  p(c.exclusividade, "exclusividade");
  if (c.tipo === "lote") p(c.terreno, "área do terreno");
  else p(c.area, "área construída");
  if (c.tipo === "casa_rua" || c.tipo === "condominio") p(c.terreno, "área do terreno");
  if (c.tipo === "condominio" || c.tipo === "apartamento") p(c.condominioNome, "nome do condomínio");
  if (c.tipo !== "lote" && c.tipo !== "comercial") {
    p(c.quartos, "quartos");
    p(c.banheiros, "banheiros");
  }
  p(c.descricao.trim().length >= 80, "descrição (mínimo de 80 letras)");
  return f;
}

/** Mesmo telefone ou mesmo e-mail: o lead já existe */
export function leadRepetido(novo: Pick<Lead, "tel" | "email" | "id">, todos: Lead[]) {
  const tel = soDigitos(novo.tel).slice(-8);
  const mail = novo.email.trim().toLowerCase();
  return todos.find((l) => l.id !== novo.id && ((tel.length === 8 && soDigitos(l.tel).slice(-8) === tel) || (mail && l.email.trim().toLowerCase() === mail)));
}

/** Tipo da captação a partir do tipo escrito no anúncio */
export function tipoDaCaptacao(tipo: string): TipoImovel {
  if (/condom/i.test(tipo)) return "condominio";
  if (/apart|cobert|kitnet|studio|flat|loft/i.test(tipo)) return "apartamento";
  if (/lote|terreno/i.test(tipo)) return "lote";
  if (/comerc|sala|galp|loja|pr[eé]dio/i.test(tipo)) return "comercial";
  return "casa_rua";
}

/**
 * Leva um anúncio da varredura para o checklist da captação, de venda ou de locação.
 * O que o anúncio diz entra preenchido; o resto o corretor completa na visita.
 */
export function captacaoDoAnuncio(a: Anuncio, finalidade: Captacao["finalidade"], dia: Dia): Captacao {
  return {
    id: novoId(),
    codigo: "",
    tipo: tipoDaCaptacao(a.tipo),
    finalidade,
    titulo: a.titulo,
    proprietario: { nome: a.particular && a.anunciante !== "Proprietário" ? a.anunciante : "", doc: "", tel: a.particular ? (a.telefone ?? "") : "", email: "" },
    cep: "",
    endereco: "",
    numero: "",
    complemento: "",
    bairro: a.bairro,
    cidade: a.cidade || "Anápolis",
    condominioNome: a.empreendimento ?? "",
    valor: a.preco,
    valorCondominio: 0,
    iptu: 0,
    area: a.area,
    terreno: 0,
    quartos: a.quartos,
    suites: 0,
    banheiros: 0,
    vagas: 0,
    matricula: "",
    descricao: "",
    diferenciais: "",
    exclusividade: "",
    etapa: "visita",
    checklist: {},
    fotos: [],
    corretorId: "",
    origem: "Varredura",
    anuncioUrl: a.url || undefined,
    criadoEm: dia,
  };
}
