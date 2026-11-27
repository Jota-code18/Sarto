import { semAcento } from "./formato";

/**
 * Empreendimentos que a Sarto acompanha. `nomes` são as formas de escrever que contam
 * como o mesmo lugar; erros pequenos de digitação já são aceitos pela comparação.
 * O primeiro nome é o que aparece na tela. Os mais específicos vêm antes.
 */
export const EMPREENDIMENTOS: { nome: string; nomes: string[]; busca: string }[] = [
  { nome: "Terras Alphaville", nomes: ["terras alphaville", "terras alpha"], busca: "terras alphaville" },
  { nome: "Alphaville", nomes: ["alphaville", "alfaville", "alpha ville"], busca: "alphaville" },
  { nome: "Anaville", nomes: ["anaville"], busca: "anaville" },
  { nome: "Belas Artes", nomes: ["belas artes"], busca: "belas artes" },
  { nome: "Grand Trianon", nomes: ["grand trianon", "trianon"], busca: "trianon" },
  { nome: "Vinhas", nomes: ["vinhas"], busca: "vinhas" },
  { nome: "Sunflower", nomes: ["sunflower", "sun flower"], busca: "sunflower" },
  { nome: "Vale dos Pássaros", nomes: ["vale dos passaros"], busca: "vale dos passaros" },
  { nome: "Casa Opus", nomes: ["casa opus"], busca: "casa opus" },
  { nome: "Forma Opus", nomes: ["forma opus"], busca: "forma opus" },
  { nome: "Montpellier", nomes: ["montpellier"], busca: "montpellier" },
  { nome: "Belvedere du Parque", nomes: ["belvedere"], busca: "belvedere" },
  { nome: "Rio Pison", nomes: ["rio pison"], busca: "rio pison" },
  { nome: "Rio Gion", nomes: ["rio gion"], busca: "rio gion" },
  { nome: "Rio Eufrates", nomes: ["rio eufrates", "rio elfrates"], busca: "eufrates" },
  { nome: "Viena", nomes: ["viena"], busca: "viena" },
  { nome: "Genebra", nomes: ["genebra"], busca: "genebra" },
  { nome: "Algarve", nomes: ["algarve"], busca: "algarve" },
  { nome: "Capri", nomes: ["residencial capri", "edificio capri", "condominio capri", "capri residence"], busca: "residencial capri" },
  { nome: "Carmel", nomes: ["carmel"], busca: "carmel" },
  { nome: "Arpoador", nomes: ["arpoador"], busca: "arpoador" },
  { nome: "Alameda Jundiaí", nomes: ["alameda jundiai"], busca: "alameda jundiai" },
  { nome: "Mirantes do Vale", nomes: ["mirantes do vale", "mirante do vale"], busca: "mirantes do vale" },
  { nome: "Riviera de Itália", nomes: ["riviera de italia", "riviera d italia", "riviera di italia", "riviera ditalia"], busca: "riviera de italia" },
  { nome: "Terra Mundi", nomes: ["terra mundi"], busca: "terra mundi" },
  { nome: "Avenida Parque", nomes: ["avenida parque"], busca: "avenida parque" },
  { nome: "Monte Hermon", nomes: ["monte hermon", "monte hermom"], busca: "monte hermon" },
  { nome: "Ipiranga Parque", nomes: ["ipiranga parque", "ipiranga park"], busca: "ipiranga park" },
  { nome: "Contemplare", nomes: ["contemplare"], busca: "contemplare" },
  { nome: "Firenze", nomes: ["firenze", "firense"], busca: "firenze" },
  { nome: "Palma di Maiorca", nomes: ["palma di maiorca", "palma de maiorca", "palma de mallorca", "maiorca"], busca: "palma di maiorca" },
  { nome: "London Eye", nomes: ["london eye"], busca: "london eye" },
  { nome: "London Office", nomes: ["london office"], busca: "london office" },
  { nome: "Genesis", nomes: ["genesis office", "geneses office", "edificio genesis", "genesis"], busca: "genesis office" },
  { nome: "São Francisco Business Tower", nomes: ["sao francisco business", "francisco business tower", "sfbt"], busca: "business tower" },
  // sugeridos pelos dados da varredura: muitos anúncios de alto valor
  { nome: "Gaudí", nomes: ["gaudi"], busca: "residencial gaudi" },
  { nome: "Jardins do Lago", nomes: ["jardins do lago", "jardim do lago"], busca: "jardins do lago" },
  { nome: "Villa Bella", nomes: ["villa bella", "vila bella", "villa bela"], busca: "villa bella" },
  { nome: "Setor Bougainville", nomes: ["bougainville", "bouganville", "bougainvile"], busca: "bougainville" },
];

/** Minúsculas, sem acento, sem letra dobrada e com as trocas comuns de grafia */
function simplificar(t: string): string[] {
  return semAcento(t)
    .replace(/ph/g, "f")
    .replace(/y/g, "i")
    .replace(/w/g, "v")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/([a-z])\1+/g, "$1")
    .split(" ")
    .filter(Boolean);
}

/** Distância de edição com troca de letras vizinhas, parando cedo acima do limite */
function distancia(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let antes: number[] = [];
  let linha = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const nova = [i];
    let menor = i;
    for (let j = 1; j <= b.length; j++) {
      let d = Math.min(linha[j] + 1, nova[j - 1] + 1, linha[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, antes[j - 2] + 1);
      nova.push(d);
      menor = Math.min(menor, d);
    }
    if (menor > max) return max + 1;
    antes = linha;
    linha = nova;
  }
  return linha[b.length];
}

/** Erro tolerado cresce com o tamanho do nome: curto precisa ser exato */
const tolerancia = (n: number) => (n < 6 ? 0 : n < 10 ? 1 : 2);

interface Alvo {
  nome: string;
  juntos: string;
  palavras: number;
}
function alvos(extras: string[]): Alvo[] {
  const lista = [...EMPREENDIMENTOS, ...extras.filter((e) => e.trim()).map((e) => ({ nome: e.trim(), nomes: [e] }))];
  return lista.flatMap((e) => e.nomes.map((n) => ({ nome: e.nome, juntos: simplificar(n).join(""), palavras: simplificar(n).length }))).filter((a) => a.juntos.length >= 4);
}
const PADRAO = alvos([]);

/**
 * Qual empreendimento o texto cita. Compara palavra por palavra, juntando até uma palavra a mais
 * ou a menos, para aceitar "Ana Ville", "Anavile" e "Alfaville". Devolve o primeiro da lista.
 */
export function acharEmpreendimento(texto: string, extras: string[] = []): string {
  const p = simplificar(texto);
  if (!p.length) return "";
  for (const a of extras.length ? alvos(extras) : PADRAO) {
    const tol = tolerancia(a.juntos.length);
    for (let i = 0; i < p.length; i++) {
      let junto = "";
      for (let j = i; j < Math.min(p.length, i + a.palavras + 1); j++) {
        junto += p[j];
        if (junto.length > a.juntos.length + tol) break;
        if (distancia(junto, a.juntos, tol) <= tol) return a.nome;
      }
    }
  }
  return "";
}

/** Preço que não combina com o resto do mesmo empreendimento: erro de digitação ou só o ágio */
export function precoEstranho(preco: number, mediana: number, negocio: "venda" | "aluguel" = "venda"): boolean {
  if (preco <= 0) return false;
  // aluguel abaixo de R$ 300 ou acima de R$ 100 mil é quase sempre erro ou preço de venda
  if (negocio === "aluguel") return preco < 300 || preco > 100_000 || (mediana > 0 && (preco < mediana * 0.25 || preco > mediana * 6));
  if (preco < 50_000) return true;
  return mediana > 0 && (preco < mediana * 0.25 || preco > mediana * 6);
}

export function mediana(v: number[]): number {
  const s = v.filter((x) => x > 0).sort((a, b) => a - b);
  if (s.length < 5) return 0;
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
