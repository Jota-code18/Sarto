import { describe, expect, it } from "vitest";
import { recusa, tipoReal } from "./tipoArquivo";

const b = (s: string | number[]) => (typeof s === "string" ? new TextEncoder().encode(s) : new Uint8Array(s));

describe("tipo pelo conteúdo", () => {
  it("reconhece os formatos do painel", () => {
    expect(tipoReal(b("%PDF-1.7\n..."))).toBe("pdf");
    expect(tipoReal(b([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).toBe("jpeg");
    expect(tipoReal(b([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe("png");
    expect(tipoReal(b("RIFF\0\0\0\0WEBPVP8 "))).toBe("webp");
    expect(tipoReal(b("\0\0\0\x18ftypheic\0\0"))).toBe("heic");
    expect(tipoReal(b("PK\x03\x04\x14\0\0\0[Content_Types].xml word/document.xml"))).toBe("docx");
  });
  it("recusa página, script e imagem vetorial disfarçados", () => {
    for (const s of ["<html><script>alert(1)</script>", "<svg onload=alert(1)>", "<?xml version='1.0'?><svg/>", "MZ\x90\0", "PK\x03\x04 sem word", ""])
      expect(tipoReal(b(s)), s).toBeNull();
    expect(recusa(b("<html>"), 10, ["pdf"])).toMatch(/não é PDF/);
    expect(recusa(b("%PDF-1.4"), 10, ["pdf"])).toBeNull();
    expect(recusa(b("%PDF-1.4"), 10, ["jpeg", "png"])).toMatch(/JPEG nem PNG/);
    expect(recusa(b("%PDF-1.4"), 20 * 1024 * 1024, ["pdf"])).toMatch(/acima/);
  });
});
