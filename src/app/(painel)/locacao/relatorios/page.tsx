"use client";
import { ChevronLeft, ChevronRight, Printer } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Botao, Cabecalho, Cartao, Copiar, Nota, Selo, type Tom, Vazio } from "@/componentes/ui";
import { brCompLongo, competencia, hoje, maisComp } from "@/lib/datas";
import { type Estado, geral, type Indicador, relatorioLocacao } from "@/lib/relatorioLocacao";
import { useSarto } from "@/lib/store";

const TOM: Record<Estado, Tom> = { ok: "ok", atencao: "alerta", fora: "erro", sem_dado: "neutro" };
const ROTULO: Record<Estado, string> = { ok: "No lugar", atencao: "Atenção", fora: "Fora do lugar", sem_dado: "Sem dado" };
const GRUPOS: Indicador["grupo"][] = ["Dinheiro", "Repasse", "Carteira", "Proteção", "Atendimento"];

export default function Relatorios() {
  const { dados, regras } = useSarto();
  const [comp, setComp] = useState(competencia(hoje()));
  const r = useMemo(() => relatorioLocacao(dados, regras, comp), [dados, regras, comp]);
  const g = geral(r);
  const foraN = r.fora.filter((f) => f.gravidade === "fora").length;
  const resumo = [
    `Locação, ${brCompLongo(comp)}: ${r.ativos} contratos.`,
    ...r.indicadores.filter((i) => i.estado !== "sem_dado").map((i) => `${i.estado === "ok" ? "✓" : i.estado === "fora" ? "✗" : "!"} ${i.nome}: ${i.valor}`),
    "",
    r.fora.length ? `Fora do lugar (${r.fora.length}):` : "Nada fora do lugar.",
    ...r.fora.slice(0, 20).map((f) => `- ${f.imovel}: ${f.texto}`),
  ].join("\n");

  return (
    <>
      <Cabecalho area="LOCAÇÃO RELATÓRIOS" titulo="Relatório da locação" texto="O que está certo, o que está fora do lugar e os indicadores do mês, com a meta de cada um.">
        <Copiar texto={resumo} pequeno={false}>
          Copiar resumo
        </Copiar>
        <Botao className="nao-imprime" onClick={() => window.print()}>
          <Printer size={16} aria-hidden /> Imprimir
        </Botao>
      </Cabecalho>

      <div className="nao-imprime mb-6 flex items-center gap-2">
        <Botao pequeno aria-label="Mês anterior" onClick={() => setComp(maisComp(comp, -1))}>
          <ChevronLeft size={16} />
        </Botao>
        <span className="min-w-44 text-center text-[16px] font-medium">{brCompLongo(comp)}</span>
        <Botao pequeno aria-label="Próximo mês" onClick={() => setComp(maisComp(comp, 1))}>
          <ChevronRight size={16} />
        </Botao>
      </div>

      {r.ativos === 0 ? (
        <Vazio
          acao={
            <Link href="/locacao" className="underline underline-offset-4">
              Cadastrar ou importar contratos
            </Link>
          }
        >
          O relatório nasce dos contratos, cobranças e repasses do painel. Ainda não há contrato ativo.
        </Vazio>
      ) : (
        <>
          <section className={`mb-8 rounded-2xl p-5 sm:p-6 ${g === "fora" ? "bg-errof" : g === "atencao" ? "bg-alertaf" : "bg-okf"}`} aria-live="polite">
            <p className="text-[13px] font-semibold uppercase tracking-wide">Situação geral</p>
            <p className="mt-1 text-[22px] font-semibold leading-tight">
              {g === "ok" ? "Tudo no lugar" : g === "atencao" ? "No caminho, com pontos de atenção" : `${foraN} ${foraN === 1 ? "ponto fora" : "pontos fora"} do lugar`}
            </p>
            <p className="mt-1 text-[14px]">
              {r.ativos} contratos ativos · {r.indicadores.filter((i) => i.estado === "ok").length} de {r.indicadores.filter((i) => i.estado !== "sem_dado").length} indicadores na
              meta
            </p>
          </section>

          <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
            <Cartao titulo={`Fora do lugar ${r.fora.length ? `(${r.fora.length})` : ""}`}>
              {r.fora.length === 0 ? (
                <p className="text-cinza">Nada fora do lugar neste mês.</p>
              ) : (
                <ul className="divide-y divide-linha">
                  {r.fora.map((f) => (
                    <li key={`${f.imovel}${f.texto}`} className="flex items-start gap-3 py-2.5">
                      <Selo tom={f.gravidade === "fora" ? "erro" : "alerta"}>{f.gravidade === "fora" ? "Agir" : "Olhar"}</Selo>
                      <span className="min-w-0">
                        <span className="block font-medium">{f.imovel}</span>
                        <span className="block text-[13px] text-cinza">{f.texto}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Cartao>
            <Cartao titulo="O que está certo">
              {r.certo.length === 0 ? (
                <p className="text-cinza">Nada para confirmar ainda.</p>
              ) : (
                <ul className="space-y-2">
                  {r.certo.map((c) => (
                    <li key={c} className="flex items-start gap-2">
                      <Selo tom="ok">Certo</Selo>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Cartao>
          </div>

          {GRUPOS.map((gr) => {
            const lista = r.indicadores.filter((i) => i.grupo === gr);
            return (
              <section key={gr} className="mt-9">
                <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide">{gr}</h2>
                <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {lista.map((i) => (
                    <li key={i.id} className="flex flex-col rounded-2xl border border-linha bg-giz p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium leading-snug">{i.nome}</p>
                        <Selo tom={TOM[i.estado]}>{ROTULO[i.estado]}</Selo>
                      </div>
                      <p className="mt-2 text-[17px] font-semibold tabular-nums leading-snug">{i.valor}</p>
                      <p className="mt-auto pt-3 text-[12px] text-cinza">
                        Meta: {i.meta}
                        <span className="block">{i.conta}</span>
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          <div className="mt-8">
            <Nota>
              Os números vêm dos contratos, cobranças e repasses deste painel. Enquanto a cobrança e o repasse ficam no Jetimob, mantenha aqui a baixa e o repasse de cada mês para
              o relatório valer.
            </Nota>
          </div>
        </>
      )}
    </>
  );
}
