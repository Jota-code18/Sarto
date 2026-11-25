import { type Dia, diasEntre, hoje } from "./datas";
import { brl, semAcento, soDigitos } from "./formato";
import type { Anuncio, Captacao, ImovelSite, Lead, Regras, TipoImovel } from "./tipos";

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

export interface ItemNota {
  nome: string;
  pontos: number;
  max: number;
  corrigir?: string;
}
export interface Nota {
  total: number;
  itens: ItemNota[];
  graves: string[];
}

const DIVISORES: [RegExp, TipoImovel][] = [
  [/condom/i, "condominio"],
  [/apart|studio|loft|kitnet|cobertura|duplex|garden/i, "apartamento"],
  [/terreno|lote|rural|ch[áa]cara/i, "lote"],
  [/comercial|galp|sala|pr[ée]dio|ponto/i, "comercial"],
];
export const tipoDoSite = (t: string): TipoImovel => DIVISORES.find(([re]) => re.test(t))?.[1] ?? "casa_rua";

/**
 * Nota própria de qualidade do anúncio, de 0 a 100. Não é a nota do Canal Pro:
 * usa os mesmos tipos de critério (fotos, texto, dados e mídia) com o que está público.
 */
export function notaAnuncio(i: ImovelSite, r: Regras): Nota {
  const itens: ItemNota[] = [];
  const graves: string[] = [];
  const tipo = tipoDoSite(i.tipo);
  const min = r.fotosMin[tipo];
  const f = (nome: string, max: number, fracao: number, corrigir: string) => {
    const pontos = Math.round(max * Math.max(0, Math.min(1, fracao)));
    itens.push({ nome, pontos, max, corrigir: pontos < max ? corrigir : undefined });
  };

  f("Quantidade de fotos", 30, i.fotos / min, `Tem ${i.fotos} de ${min} fotos para ${TIPOS_IMOVEL[tipo].toLowerCase()}`);
  const prop = i.fotos ? i.fotosZap / i.fotos : 0;
  f("Origem das fotos", 15, 1 - prop, `${i.fotosZap} de ${i.fotos} fotos vieram do WhatsApp, que comprime a imagem`);
  f("Descrição", 20, i.descTam / 600, `Descrição com ${i.descTam} letras; o ideal é passar de 600`);
  const t = i.titulo.length;
  f("Título", 10, t >= 30 && t <= 90 ? 1 : 0.4, t < 30 ? "Título curto: diga tipo, diferencial e bairro" : "Título longo: passa de 90 letras e corta no portal");

  const campos: [unknown, string][] =
    tipo === "lote"
      ? [[i.terreno, "área do terreno"], [i.bairro, "bairro"]]
      : tipo === "comercial"
        ? [[i.area, "área"], [i.bairro, "bairro"], [i.banheiros, "banheiros"]]
        : [[i.area, "área"], [i.bairro, "bairro"], [i.quartos ?? i.suites, "quartos"], [i.banheiros, "banheiros"], [i.vagas, "vagas"]];
  const faltam = campos.filter(([v]) => !v).map(([, n]) => n);
  f("Dados do imóvel", 15, 1 - faltam.length / campos.length, `Falta preencher: ${faltam.join(", ")}`);
  f("Vídeo ou tour", 10, i.video ? 1 : 0, "Sem vídeo e sem tour virtual");

  if (i.precoNoTexto)
    graves.push(`Preço do anúncio (${brl(i.venda ?? i.aluguel, false)}) diferente do que está no texto (${brl(i.precoNoTexto, false)})`);
  if (i.fotos < 5) graves.push(`Só ${i.fotos} ${i.fotos === 1 ? "foto" : "fotos"}`);
  if (i.descTam < 200) graves.push("Descrição muito curta");
  if (!i.area && !i.terreno) graves.push("Sem metragem");

  const soma = itens.reduce((a, x) => a + x.pontos, 0);
  return { total: Math.max(0, soma - graves.length * 5), itens, graves };
}

/** Mesmo telefone ou mesmo e-mail: o lead já existe */
export function leadRepetido(novo: Pick<Lead, "tel" | "email" | "id">, todos: Lead[]) {
  const tel = soDigitos(novo.tel).slice(-8);
  const mail = novo.email.trim().toLowerCase();
  return todos.find(
    (l) =>
      l.id !== novo.id &&
      ((tel.length === 8 && soDigitos(l.tel).slice(-8) === tel) || (mail && l.email.trim().toLowerCase() === mail)),
  );
}

const norm = (t: string) =>
  semAcento(t)
    .replace(/\b(residencial|condominio|setor|bairro|jardim|parque|vila|loteamento)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Dois anúncios do mesmo imóvel em imobiliárias ou portais diferentes */
export function mesmoImovel(a: Pick<Anuncio, "bairro" | "area" | "quartos" | "preco">, b: typeof a) {
  if (!a.area || !b.area || norm(a.bairro) !== norm(b.bairro)) return false;
  const perto = (x: number, y: number, tol: number) => x > 0 && y > 0 && Math.abs(x - y) / Math.max(x, y) <= tol;
  return perto(a.area, b.area, 0.03) && (a.quartos || 0) === (b.quartos || 0) && perto(a.preco, b.preco, 0.08);
}

export interface AnuncioAvaliado extends Anuncio {
  repetidos: number;
  naCarteira: ImovelSite | null;
  noPadrao: boolean;
  prioridade: number;
  motivos: string[];
}

export function dentroPadrao(a: Pick<Anuncio, "preco" | "bairro">, r: Regras) {
  const bairros = r.padraoBairros.split(/[,;\n]/).map(norm).filter(Boolean);
  const b = norm(a.bairro);
  return a.preco >= r.padraoPrecoMin && (!r.padraoPrecoMax || a.preco <= r.padraoPrecoMax) && (!bairros.length || bairros.some((x) => b.includes(x)));
}

export function avaliarVarredura(anuncios: Anuncio[], carteira: ImovelSite[], r: Regras, ref: Dia = hoje()): AnuncioAvaliado[] {
  return anuncios
    .map((a) => {
      const repetidos = anuncios.filter((b) => b.id !== a.id && mesmoImovel(a, b)).length;
      const naCarteira =
        carteira.find((i) =>
          mesmoImovel(a, { bairro: i.bairro ?? "", area: i.area ?? i.terreno ?? 0, quartos: i.quartos ?? i.suites ?? 0, preco: i.venda ?? 0 }),
        ) ?? null;
      const motivos: string[] = [];
      let prioridade = 0;
      if (a.particular) {
        prioridade += 3;
        motivos.push("anúncio do próprio dono");
      }
      const parado = a.publicadoEm ? diasEntre(a.publicadoEm, ref) : 0;
      if (parado >= 90) {
        prioridade += 2;
        motivos.push(`parado há ${parado} dias`);
      }
      if (a.precoAnterior > a.preco) {
        prioridade += 2;
        motivos.push(`baixou ${brl(a.precoAnterior - a.preco, false)}`);
      }
      if (repetidos) {
        prioridade += 1;
        motivos.push(`em mais ${repetidos} ${repetidos === 1 ? "anúncio" : "anúncios"}`);
      }
      return { ...a, repetidos, naCarteira, noPadrao: dentroPadrao(a, r), prioridade, motivos };
    })
    .sort((x, y) => y.prioridade - x.prioridade || y.preco - x.preco);
}
