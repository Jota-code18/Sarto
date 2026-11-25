"use client";
import { ExternalLink, ImageOff, MessageCircle, Phone } from "lucide-react";
import { useState } from "react";
import { ehCelular } from "@/lib/contato";
import { linkWhats } from "@/lib/formato";
import { linkSeguro } from "@/lib/protecao";
import type { Anuncio } from "@/lib/tipos";
import { cx, estiloBotao } from "./ui";

export function FotoAnuncio({ foto, className }: { foto?: string; className?: string }) {
  const [falhou, setFalhou] = useState(false);
  const u = linkSeguro(foto);
  return (
    <span className={cx("grid shrink-0 place-items-center overflow-hidden bg-linho text-nevoa", className)}>
      {u && !falhou ? (
        <img src={u} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" className="size-full object-cover" onError={() => setFalhou(true)} />
      ) : (
        <ImageOff size={18} aria-hidden />
      )}
    </span>
  );
}

/** Abre o anúncio na plataforma */
export function LinkPortal({ a }: { a: Pick<Anuncio, "url" | "portal" | "titulo"> }) {
  const u = linkSeguro(a.url);
  if (!u) return null;
  return (
    <a
      href={u}
      target="_blank"
      rel="noreferrer"
      aria-label={`Abrir ${a.titulo} em ${a.portal}`}
      className="toque inline-flex shrink-0 items-center gap-1 whitespace-nowrap border border-linha px-2 text-[12px] font-medium hover:border-carvao"
    >
      {a.portal} <ExternalLink size={12} aria-hidden />
    </a>
  );
}

const mensagem = (a: Pick<Anuncio, "bairro" | "portal" | "url">) =>
  `Olá. Vi o seu anúncio do imóvel em ${a.bairro || "Anápolis"} (${a.portal}) e gostaria de conversar. Sou da Sarto Imóveis, trabalhamos com alto padrão em Anápolis.\n${a.url}`;

/** Fala com quem anuncia: WhatsApp, ligação ou, sem número publicado, o chat dentro do anúncio */
export function Contato({ a, cheio }: { a: Anuncio; cheio?: boolean }) {
  const estilo = cx(estiloBotao(cheio ? "cheio" : "linha", true), "toque whitespace-nowrap");
  if (a.telefone && ehCelular(a.telefone))
    return (
      <a className={estilo} href={linkWhats(a.telefone, mensagem(a))} target="_blank" rel="noreferrer" aria-label={`WhatsApp de ${a.anunciante || "quem anuncia"}`}>
        <MessageCircle size={14} aria-hidden /> WhatsApp
      </a>
    );
  if (a.telefone)
    return (
      <a className={estilo} href={`tel:+55${a.telefone}`} aria-label={`Ligar para ${a.anunciante || "quem anuncia"}`}>
        <Phone size={14} aria-hidden /> Ligar
      </a>
    );
  const u = linkSeguro(a.url);
  if (!u) return null;
  return (
    <a className={estilo} href={u} target="_blank" rel="noreferrer">
      <MessageCircle size={14} aria-hidden /> {a.portal === "OLX" ? "Chat da OLX" : "Contato no anúncio"}
    </a>
  );
}
