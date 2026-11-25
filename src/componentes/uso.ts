"use client";
import { useEffect, useState } from "react";
import type { ImovelSite } from "@/lib/tipos";
import { pegar } from "@/lib/arquivos";

/** Parâmetro da URL. As telas só montam no navegador, então window já existe. */
export function useParam(nome: string) {
  const [v] = useState(() => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get(nome)));
  return v;
}

let cache: { atualizadoEm: string; imoveis: ImovelSite[] } | null = null;
export function useCarteira() {
  const [c, setC] = useState(cache);
  const [erro, setErro] = useState(false);
  useEffect(() => {
    if (cache) return;
    let vivo = true;
    fetch("/data/carteira.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => {
        cache = j;
        if (vivo) setC(j);
      })
      .catch(() => vivo && setErro(true));
    return () => {
      vivo = false;
    };
  }, []);
  return { carteira: c?.imoveis ?? [], atualizadoEm: c?.atualizadoEm, carregando: !c && !erro, erro };
}

export function useFotos(chaves: string[]) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const k = chaves.join("|");
  useEffect(() => {
    let vivo = true;
    const feitas: string[] = [];
    Promise.all(
      (k ? k.split("|") : []).map(async (c) => {
        const b = await pegar(c);
        if (!b) return null;
        const u = URL.createObjectURL(b);
        feitas.push(u);
        return [c, u] as const;
      }),
    ).then((p) => vivo && setUrls(Object.fromEntries(p.filter((x): x is readonly [string, string] => !!x))));
    return () => {
      vivo = false;
      for (const u of feitas) URL.revokeObjectURL(u);
    };
  }, [k]);
  return urls;
}
