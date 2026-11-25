"use client";
import { createStore, del, get, set } from "idb-keyval";
import { novoId } from "./formato";

/** Arquivos (PDF, fotos, .docx) ficam no IndexedDB deste navegador. */
const loja = () => createStore("sarto-arquivos", "arquivos");

export async function guardar(b: Blob, prefixo = "arq") {
  const k = `${prefixo}_${novoId()}`;
  await set(k, b, loja());
  return k;
}
export const pegar = (k: string) => get<Blob>(k, loja());
export const apagar = (k: string) => del(k, loja());

export async function abrir(k: string) {
  const b = await pegar(k);
  if (!b) return false;
  const u = URL.createObjectURL(b);
  window.open(u, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(u), 60000);
  return true;
}

/** Reduz a foto antes de guardar: o navegador não é lugar para arquivo original. */
export async function reduzirFoto(f: File, lado = 1600) {
  const img = await createImageBitmap(f);
  const e = Math.min(1, lado / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * e);
  c.height = Math.round(img.height * e);
  c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
  return new Promise<Blob>((ok, erro) => c.toBlob((b) => (b ? ok(b) : erro(new Error("foto inválida"))), "image/jpeg", 0.82));
}

/** Texto do PDF, no próprio navegador: nada é enviado para fora. */
export async function textoDoPdf(b: Blob) {
  const pdf = await import("pdfjs-dist");
  pdf.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const doc = await pdf.getDocument({ data: await b.arrayBuffer() }).promise;
  const partes: string[] = [];
  for (let i = 1; i <= Math.min(doc.numPages, 6); i++) {
    const t = await (await doc.getPage(i)).getTextContent();
    partes.push(t.items.map((x) => ("str" in x ? x.str : "")).join(" "));
  }
  return partes.join("\n");
}

/** Preenche um .docx da Gabi com {{campos}}, preservando a formatação dela. */
export async function preencherDocx(b: Blob, campos: Record<string, string>, aviso?: string) {
  const [{ default: PizZip }, { default: Docx }] = await Promise.all([import("pizzip"), import("docxtemplater")]);
  const doc = new Docx(new PizZip(await b.arrayBuffer()), {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{{", end: "}}" },
    nullGetter: (p: { value?: string }) => `{{${p.value ?? ""}}}`,
  });
  doc.render(campos);
  const z = doc.getZip();
  if (aviso) {
    const xml = z.file("word/document.xml")?.asText() ?? "";
    const par = `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="A5332B"/><w:sz w:val="24"/></w:rPr><w:t>${aviso}</w:t></w:r></w:p>`;
    z.file("word/document.xml", xml.replace(/<w:body>/, `<w:body>${par}`));
  }
  return z.generate({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  }) as Blob;
}

export async function textoDoDocx(b: Blob) {
  const [{ default: PizZip }, { default: Docx }] = await Promise.all([import("pizzip"), import("docxtemplater")]);
  return new Docx(new PizZip(await b.arrayBuffer()), { delimiters: { start: "{{", end: "}}" } }).getFullText() as string;
}

/** Texto simples em .docx, sem biblioteca extra: o mínimo que o Word abre. */
export async function docxDeTexto(texto: string, aviso?: string) {
  const { default: PizZip } = await import("pizzip");
  const z = new PizZip();
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const par = (t: string, o = "") => `<w:p><w:pPr><w:spacing w:after="120" w:line="300" w:lineRule="auto"/>${o}</w:pPr>`;
  const corpo = texto
    .split("\n")
    .map((l, i) => {
      const titulo = i === 0 || /^(CLÁUSULA|PARTES|CONDIÇÕES|LOCADOR|LOCATÁRIO|PROMITENTE|INTERMEDIADORA|PROPRIETÁRIO|ADMINISTRADORA|CONTRATANTE|CORRETOR)/.test(l);
      return `${par(l, i === 0 ? '<w:jc w:val="center"/>' : '<w:jc w:val="both"/>')}<w:r><w:rPr>${titulo ? "<w:b/>" : ""}<w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">${esc(l)}</w:t></w:r></w:p>`;
    })
    .join("");
  const topo = aviso
    ? `${par("", '<w:jc w:val="center"/>')}<w:r><w:rPr><w:b/><w:color w:val="A5332B"/><w:sz w:val="24"/></w:rPr><w:t>${esc(aviso)}</w:t></w:r></w:p>`
    : "";
  z.file(
    "[Content_Types].xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
  );
  z.file(
    "_rels/.rels",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  );
  z.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${topo}${corpo}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1418" w:bottom="1418" w:left="1418" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr></w:body></w:document>`,
  );
  return z.generate({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  }) as Blob;
}
