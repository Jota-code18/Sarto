/**
 * O tipo de um arquivo vem do conteúdo, não do nome: um "contrato.pdf" pode ser uma página
 * com script. Só os formatos que o painel usa passam.
 */
export type Tipo = "pdf" | "jpeg" | "png" | "webp" | "gif" | "heic" | "docx";

const comeca = (b: Uint8Array, sinal: number[], de = 0) => sinal.every((x, i) => b[de + i] === x);
const texto = (b: Uint8Array, de: number, n: number) => String.fromCharCode(...b.slice(de, de + n));

export function tipoReal(b: Uint8Array): Tipo | null {
  if (texto(b, 0, 5) === "%PDF-") return "pdf";
  if (comeca(b, [0xff, 0xd8, 0xff])) return "jpeg";
  if (comeca(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (texto(b, 0, 4) === "RIFF" && texto(b, 8, 4) === "WEBP") return "webp";
  if (texto(b, 0, 4) === "GIF8") return "gif";
  if (texto(b, 4, 4) === "ftyp" && /^(heic|heix|mif1|msf1|hevc)$/.test(texto(b, 8, 4))) return "heic";
  // .docx é um zip com a pasta word/ dentro
  if (comeca(b, [0x50, 0x4b, 0x03, 0x04]) && texto(b, 0, Math.min(b.length, 4096)).includes("word/")) return "docx";
  return null;
}

export const MIME: Record<Tipo, string> = {
  pdf: "application/pdf",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const LIMITE_MB = 15;

/** Confere tamanho e conteúdo. Devolve o motivo da recusa, ou null se o arquivo serve. */
export function recusa(b: Uint8Array, tamanho: number, aceitos: Tipo[]): string | null {
  if (tamanho > LIMITE_MB * 1024 * 1024) return `Arquivo acima de ${LIMITE_MB} MB`;
  const t = tipoReal(b);
  if (!t || !aceitos.includes(t)) return `O conteúdo não é ${aceitos.map((x) => x.toUpperCase()).join(" nem ")}, mesmo que o nome diga`;
  return null;
}
