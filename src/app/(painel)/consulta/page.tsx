"use client";
import { useState } from "react";
import { Botao, Cabecalho, Cartao, Nota, Selo, Vazio } from "@/componentes/ui";
import { br } from "@/lib/datas";
import { soDigitos } from "@/lib/formato";

interface Item {
  id: number;
  data_disponibilizacao: string;
  siglaTribunal: string;
  nomeOrgao: string;
  tipoComunicacao: string;
  nomeClasse?: string;
  numeroprocessocommascara?: string;
  numero_processo?: string;
  link?: string;
  destinatarios?: { nome: string; polo?: string }[];
}
const TRIBUNAIS = [
  { id: "", nome: "Todos os tribunais" },
  { id: "TJGO", nome: "TJGO" },
  { id: "TRT18", nome: "TRT18" },
  { id: "TRF1", nome: "TRF1" },
  { id: "TST", nome: "TST" },
  { id: "STJ", nome: "STJ" },
];
interface Empresa {
  razao: string;
  fantasia: string;
  situacao: string;
  abertura: string;
  atividade: string;
  cidade: string;
  socios: string[];
}

export default function Consulta() {
  const [nome, setNome] = useState("");
  const [trib, setTrib] = useState("TJGO");
  const [st, setSt] = useState<"" | "buscando" | "erro" | "limite">("");
  const [r, setR] = useState<{ total: number; itens: Item[]; nome: string } | null>(null);
  const [cnpj, setCnpj] = useState("");
  const [emp, setEmp] = useState<Empresa | null>(null);
  const [stE, setStE] = useState<"" | "buscando" | "erro">("");

  const buscar = async () => {
    if (nome.trim().split(/\s+/).length < 2) return;
    setSt("buscando");
    setR(null);
    try {
      const p = new URLSearchParams({ nomeParte: nome.trim().toUpperCase(), itensPorPagina: "50", pagina: "1" });
      if (trib) p.set("siglaTribunal", trib);
      const x = await fetch(`https://comunicaapi.pje.jus.br/api/v1/comunicacao?${p}`);
      if (x.status === 429) return setSt("limite");
      if (!x.ok) throw new Error();
      const j = await x.json();
      setR({ total: j.count ?? 0, itens: j.items ?? [], nome: nome.trim() });
      setSt("");
    } catch {
      setSt("erro");
    }
  };
  // um processo costuma ter várias publicações: agrupa
  const processos = r
    ? [
        ...r.itens
          .reduce((m, i) => {
            const n = i.numeroprocessocommascara ?? i.numero_processo ?? String(i.id);
            const g = m.get(n) ?? { numero: n, itens: [] as Item[] };
            g.itens.push(i);
            return m.set(n, g);
          }, new Map<string, { numero: string; itens: Item[] }>())
          .values(),
      ]
    : [];

  const consultarCnpj = async () => {
    const d = soDigitos(cnpj);
    if (d.length !== 14) return;
    setStE("buscando");
    setEmp(null);
    const fontes = [
      async () => {
        const x = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${d}`);
        if (!x.ok) throw new Error();
        const j = await x.json();
        return { razao: j.razao_social, fantasia: j.nome_fantasia, situacao: j.descricao_situacao_cadastral, abertura: j.data_inicio_atividade, atividade: j.cnae_fiscal_descricao, cidade: `${j.municipio}/${j.uf}`, socios: (j.qsa ?? []).map((s: { nome_socio: string }) => s.nome_socio) };
      },
      async () => {
        const x = await fetch(`https://publica.cnpj.ws/cnpj/${d}`);
        if (!x.ok) throw new Error();
        const j = await x.json();
        const e = j.estabelecimento ?? {};
        return { razao: j.razao_social, fantasia: e.nome_fantasia ?? "", situacao: e.situacao_cadastral, abertura: e.data_inicio_atividade, atividade: e.atividade_principal?.descricao, cidade: `${e.cidade?.nome}/${e.estado?.sigla}`, socios: (j.socios ?? []).map((s: { nome: string }) => s.nome) };
      },
    ];
    for (const f of fontes) {
      try {
        setEmp(await f());
        return setStE("");
      } catch {}
    }
    setStE("erro");
  };

  return (
    <>
      <Cabecalho area="JURÍDICO CONSULTA" titulo="Consulta de publicações e empresas" texto="Bases públicas e gratuitas, para olhar a parte antes de pedir certidão." />
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="min-w-0">
          <Cartao titulo="Publicações judiciais por nome (DJEN)">
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                buscar();
              }}
            >
              <label className="min-w-60 flex-1 text-[12px] font-medium">
                Nome completo ou razão social
                <input className="campo mt-1" value={nome} onChange={(e) => setNome(e.target.value)} />
              </label>
              <label className="text-[12px] font-medium">
                Tribunal
                <select className="campo mt-1" value={trib} onChange={(e) => setTrib(e.target.value)}>
                  {TRIBUNAIS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome}
                    </option>
                  ))}
                </select>
              </label>
              <Botao type="submit" tom="cheio" disabled={st === "buscando" || nome.trim().split(/\s+/).length < 2}>
                {st === "buscando" ? "Buscando…" : "Buscar"}
              </Botao>
            </form>
          </Cartao>
          <div className="mt-4 space-y-4">
            <Nota>A busca é por nome, então pode trazer homônimo, e só vê o que foi publicado no Diário de Justiça Eletrônico Nacional. Não achar nada não substitui certidão.</Nota>
            {st === "erro" && <Nota tom="erro">O diário não respondeu. Tente de novo em instantes.</Nota>}
            {st === "limite" && <Nota tom="alerta">Muitas consultas seguidas. Espere um minuto.</Nota>}
            {r && (
              <>
                <p>
                  <strong className="font-semibold">{processos.length}</strong> {processos.length === 1 ? "processo" : "processos"} nas {r.itens.length} publicações mais recentes de {r.nome}
                  {r.total > r.itens.length && ` (há ${r.total >= 10000 ? "mais de 10 mil" : r.total} no total)`}
                </p>
                {processos.length === 0 ? (
                  <Vazio>Nenhuma publicação com esse nome.</Vazio>
                ) : (
                  <ul className="divide-y divide-linha border-y border-linha">
                    {processos.map((p) => {
                      const u = p.itens[0];
                      const polos = [...new Set(p.itens.flatMap((i) => i.destinatarios ?? []).map((d) => `${d.nome}${d.polo ? ` (polo ${d.polo === "A" ? "ativo" : d.polo === "P" ? "passivo" : d.polo})` : ""}`))];
                      return (
                        <li key={p.numero} className="py-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium tabular-nums">{p.numero}</span>
                            <span className="flex gap-1.5">
                              <Selo>{u.siglaTribunal}</Selo>
                              {u.link && (
                                <a href={u.link} target="_blank" rel="noreferrer" className="text-[13px] underline underline-offset-4">
                                  Ver publicação
                                </a>
                              )}
                            </span>
                          </div>
                          <p className="text-[13px] text-cinza">
                            {[u.nomeClasse, u.nomeOrgao].filter(Boolean).join(", ")}. {p.itens.length} {p.itens.length === 1 ? "publicação" : "publicações"}, última em {br(u.data_disponibilizacao)}
                          </p>
                          {polos.length > 0 && <p className="text-[13px]">{polos.slice(0, 4).join("; ")}</p>}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
        <Cartao titulo="Empresa pelo CNPJ" className="self-start">
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              consultarCnpj();
            }}
          >
            <label className="flex-1 text-[12px] font-medium">
              CNPJ
              <input className="campo mt-1" inputMode="numeric" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
            </label>
            <Botao type="submit" disabled={soDigitos(cnpj).length !== 14 || stE === "buscando"}>
              {stE === "buscando" ? "Buscando…" : "Consultar"}
            </Botao>
          </form>
          {stE === "erro" && <p className="mt-3 text-[13px] text-erro">Não encontrei ou o serviço está ocupado. Confira o número e tente de novo.</p>}
          {emp && (
            <dl className="mt-4 space-y-2 text-[13px]">
              {[
                ["Razão social", emp.razao],
                ["Nome fantasia", emp.fantasia],
                ["Situação", emp.situacao],
                ["Abertura", br(emp.abertura)],
                ["Atividade", emp.atividade],
                ["Cidade", emp.cidade],
                ["Sócios", emp.socios.join("; ")],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-cinza">{k}</dt>
                  <dd className="font-medium">{v || "—"}</dd>
                </div>
              ))}
              {!/^ativa$/i.test(emp.situacao ?? "") && <Nota tom="erro">Empresa não está ativa na Receita.</Nota>}
              <p className="pt-1 text-cinza">Sócio que vende por empresa também pede certidão pessoal, se a Gabi exigir.</p>
            </dl>
          )}
        </Cartao>
      </div>
    </>
  );
}
