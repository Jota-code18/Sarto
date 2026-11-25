"use client";
import { useState } from "react";
import { Abas, Barras, Botao, Cabecalho, Cartao, Escolha, Numero, Numeros, Vazio } from "@/componentes/ui";
import { hora, min } from "@/lib/agenda";
import { br, hoje, maisDias, segundaDe } from "@/lib/datas";
import { baixarArquivo, csv, novoId, num } from "@/lib/formato";
import { PERFIS } from "@/lib/regras";
import { acao, useSarto } from "@/lib/store";

const CATEGORIAS = ["Atendimento", "Comercial", "Reunião", "Operacional", "Documentos", "Retrabalho", "Deslocamento", "Gestão", "Pausa"];
const BLOCOS = Array.from({ length: 22 }, (_, i) => hora(min("08:00") + i * 30));

export default function Registro() {
  const { dados, perfil } = useSarto();
  const { salvar, remover } = acao();
  const pessoas = [...new Set([...Object.values(PERFIS).map((p) => p.nome), "Yan", ...dados.registros.map((r) => r.pessoa)])].filter((p) => p !== "Corretor");
  const [quem, setQuem] = useState(PERFIS[perfil].nome === "Corretor" ? pessoas[0] : PERFIS[perfil].nome);
  const [dia, setDia] = useState(hoje());
  const [aba, setAba] = useState<"dia" | "semana">("dia");
  const doDia = dados.registros.filter((r) => r.pessoa === quem && r.data === dia);
  const seg = segundaDe(dia);
  const semana = dados.registros.filter((r) => r.data >= seg && r.data <= maisDias(seg, 6) && (quem === "Todos" || r.pessoa === quem));

  const grupo = (f: (r: (typeof semana)[number]) => string) =>
    [...semana.reduce((m, r) => m.set(f(r), (m.get(f(r)) ?? 0) + 0.5), new Map<string, number>())]
      .map(([nome, valor]) => ({ nome, valor, rotulo: `${num(valor, 1)} h` }))
      .sort((a, b) => b.valor - a.valor);
  const cats = grupo((r) => r.categoria || "Sem categoria");
  const ativs = grupo((r) => r.atividade.trim() || "Sem descrição");
  const retrab = cats.find((c) => c.nome === "Retrabalho")?.valor ?? 0;

  const marcar = (bloco: string, p: { atividade?: string; categoria?: string }) => {
    const r = doDia.find((x) => x.bloco === bloco);
    const n = { id: r?.id ?? novoId(), data: dia, pessoa: quem, bloco, atividade: r?.atividade ?? "", categoria: r?.categoria ?? "", ...p };
    if (!n.atividade.trim() && !n.categoria) return r && remover("registros", r.id);
    salvar("registros", n);
  };
  const repetir = (bloco: string) => {
    const i = BLOCOS.indexOf(bloco);
    const ant = doDia.find((x) => x.bloco === BLOCOS[i - 1]);
    if (ant) marcar(bloco, { atividade: ant.atividade, categoria: ant.categoria });
  };

  return (
    <>
      <Cabecalho area="GESTÃO REGISTRO" titulo="Registro de atividades" texto="O que foi feito em cada bloco de 30 minutos, para achar o que toma tempo demais.">
        <Escolha
          rotulo="Pessoa"
          valor={quem}
          onMuda={setQuem}
          opcoes={[...(aba === "semana" ? [{ id: "Todos", nome: "Todos" }] : []), ...pessoas.map((p) => ({ id: p, nome: p }))]}
        />
        <input type="date" className="campo w-auto" aria-label="Dia" value={dia} onChange={(e) => e.target.value && setDia(e.target.value)} />
      </Cabecalho>
      <Abas
        atual={aba}
        onMuda={(a) => {
          setAba(a);
          if (a === "dia" && quem === "Todos") setQuem(pessoas[0]);
        }}
        itens={[
          { id: "dia", nome: "Dia" },
          { id: "semana", nome: "Relatório da semana" },
        ]}
      />
      {aba === "dia" && (
        <ul className="divide-y divide-linha border-y border-linha">
          {BLOCOS.map((b, i) => {
            const r = doDia.find((x) => x.bloco === b);
            return (
              <li key={b} className="grid grid-cols-[52px_1fr] items-center gap-x-3 gap-y-1.5 py-1.5 sm:grid-cols-[56px_1fr_170px_84px]">
                <span className="tabular-nums text-cinza">{b}</span>
                <input
                  key={`${dia}${quem}${b}${r?.atividade ?? ""}`}
                  className="campo"
                  defaultValue={r?.atividade ?? ""}
                  aria-label={`Atividade das ${b}`}
                  onBlur={(e) => e.target.value !== (r?.atividade ?? "") && marcar(b, { atividade: e.target.value })}
                />
                <select
                  className="campo col-start-2 sm:col-start-auto"
                  aria-label={`Categoria das ${b}`}
                  value={r?.categoria ?? ""}
                  onChange={(e) => marcar(b, { categoria: e.target.value })}
                >
                  <option value="">Categoria</option>
                  {CATEGORIAS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <span className="col-start-2 sm:col-start-auto">
                  {!r && i > 0 && doDia.some((x) => x.bloco === BLOCOS[i - 1]) && (
                    <Botao pequeno tom="texto" onClick={() => repetir(b)}>
                      Repetir
                    </Botao>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {aba === "semana" && (
        <>
          <Numeros>
            <Numero valor={`${num(semana.length / 2, 1)} h`} nome="Registradas" nota={`${br(seg).slice(0, 5)} a ${br(maisDias(seg, 6)).slice(0, 5)}`} />
            <Numero valor={`${num(retrab, 1)} h`} nome="Retrabalho" nota={semana.length ? `${num((retrab / (semana.length / 2)) * 100)}% do tempo` : undefined} />
            <Numero valor={ativs[0]?.rotulo ?? "—"} nome="Maior atividade" nota={ativs[0]?.nome} />
            <Numero valor={new Set(semana.map((r) => r.pessoa)).size} nome="Pessoas" />
          </Numeros>
          {semana.length === 0 ? (
            <Vazio>Nenhum registro nesta semana.</Vazio>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              <Cartao titulo="Por categoria">
                <Barras dados={cats} />
              </Cartao>
              <Cartao
                titulo="Por atividade"
                acao={
                  <Botao
                    pequeno
                    onClick={() =>
                      baixarArquivo(
                        `registro-${seg}.csv`,
                        csv([["Data", "Pessoa", "Bloco", "Atividade", "Categoria"], ...semana.map((r) => [br(r.data), r.pessoa, r.bloco, r.atividade, r.categoria])]),
                        "text/csv;charset=utf-8",
                      )
                    }
                  >
                    Exportar
                  </Botao>
                }
              >
                <Barras dados={ativs.slice(0, 8)} />
              </Cartao>
            </div>
          )}
        </>
      )}
    </>
  );
}
