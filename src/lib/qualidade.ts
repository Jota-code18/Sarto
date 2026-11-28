import { semAcento } from "./formato";
import type { Linha } from "./planilha";

/**
 * O que o Canal Pro olha para dar a nota, com o peso e a orientação que ele mesmo publica no
 * relatório "Qualidade dos Anúncios". O painel não recalcula a nota: o Canal Pro dá pontuação
 * parcial em cada item (uma descrição "incompleta" ainda pontua), então a conta não fecha por fora.
 */
export type Campo = "endereco" | "condominio" | "iptu" | "imagem" | "descricao" | "tour" | "video";

export const CAMPOS: Record<Campo, { nome: string; grupo: string; pontos: number; fazer: string }> = {
  endereco: { nome: "Endereço", grupo: "Endereço", pontos: 35, fazer: "Exibir o endereço completo. Segundo o Canal Pro, aumenta em até 40% os leads." },
  descricao: {
    nome: "Descrição",
    grupo: "Descrição",
    pontos: 25,
    fazer: "Detalhar todas as especificações do imóvel, com palavras-chave e sem dados pessoais.",
  },
  imagem: { nome: "Imagens", grupo: "Imagens", pontos: 20, fazer: "Incluir mais fotos." },
  condominio: { nome: "Condomínio", grupo: "Preço", pontos: 13, fazer: "Informar o valor do condomínio ou marcar como isento." },
  iptu: { nome: "IPTU", grupo: "Preço", pontos: 13, fazer: "Informar o valor do IPTU ou marcar como isento." },
  tour: { nome: "Tour virtual", grupo: "Tour virtual", pontos: 4, fazer: "Incluir um link de tour virtual válido." },
  video: { nome: "Vídeo", grupo: "Vídeo", pontos: 3, fazer: "Incluir link de vídeo do YouTube ou Vimeo. Shorts não valem." },
};
export const ORDEM_CAMPOS = Object.keys(CAMPOS) as Campo[];

const COLUNAS: Record<Campo, RegExp> = {
  endereco: /^endereco$/,
  condominio: /^condominio$/,
  iptu: /^iptu$/,
  imagem: /^image(m|ns)$/,
  descricao: /^descricao$/,
  tour: /^tour/,
  video: /^video$/,
};

/** Campos marcados como "NÃO" numa linha do relatório de qualidade */
export function faltandoNaLinha(l: Linha): Campo[] {
  const k = Object.keys(l);
  return ORDEM_CAMPOS.filter((c) => {
    const col = k.find((x) => COLUNAS[c].test(x));
    return col !== undefined && /^nao$/.test(semAcento(String(l[col] ?? "")).trim());
  });
}

/** O relatório tem uma coluna de SIM/NÃO para cada item? */
export const ehRelatorioDeQualidade = (l: Linha) => ["endereco", "imagem", "descricao"].every((c) => Object.keys(l).some((x) => COLUNAS[c as Campo].test(x)));

/** Onde há mais nota a ganhar na carteira: quantos anúncios estão sem cada item */
export function ondeGanhar(lista: { faltando?: Campo[] }[]) {
  return ORDEM_CAMPOS.map((c) => ({ campo: c, ...CAMPOS[c], anuncios: lista.filter((x) => x.faltando?.includes(c)).length }))
    .filter((x) => x.anuncios > 0)
    .sort((a, b) => b.anuncios * b.pontos - a.anuncios * a.pontos);
}
