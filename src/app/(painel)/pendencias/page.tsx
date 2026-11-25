"use client";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Formulario } from "@/componentes/formulario";
import { Botao, Cabecalho, Copiar, Escolha, Fita, Gaveta, Vazio } from "@/componentes/ui";
import { novoId } from "@/lib/formato";
import { acao, useSarto } from "@/lib/store";
import type { Pendencia } from "@/lib/tipos";

const ST: Record<Pendencia["status"], string> = { pedir: "A pedir", pedido: "Pedido", recebido: "Recebido" };

export default function Pendencias() {
  const { dados } = useSarto();
  const { salvar, mudar, remover } = acao();
  const [quem, setQuem] = useState("");
  const [st, setSt] = useState<"" | "abertos" | "recebido">("abertos");
  const [ed, setEd] = useState<Pendencia | null>(null);
  const todos = dados.pendencias;
  const pessoas = [...new Set(todos.map((p) => p.quem))];
  const lista = todos.filter((p) => (!quem || p.quem === quem) && (!st || (st === "recebido" ? p.status === "recebido" : p.status !== "recebido")));
  const grupos = [...new Set(lista.map((p) => p.quem))];
  const msg = (q: string) =>
    `Olá, ${q.split(" ")[0]}. Para o painel da Sarto andar, preciso de:\n\n${todos
      .filter((p) => p.quem === q && p.status !== "recebido")
      .map((p, i) => `${i + 1}. ${p.item}`)
      .join("\n")}\n\nPode mandar aos poucos, do jeito que já usam hoje.`;

  return (
    <>
      <Cabecalho area="GESTÃO PENDÊNCIAS" titulo="O que falta da Sarto" texto="Arquivos, acessos e decisões, com quem envia e o que cada item destrava.">
        <Botao tom="cheio" onClick={() => setEd({ id: novoId(), area: "", quem: "", item: "", bloqueia: "", status: "pedir", nota: "" })}>
          <Plus size={16} /> Item
        </Botao>
      </Cabecalho>
      <div className="mb-6 max-w-xl">
        <Fita parte={todos.filter((p) => p.status === "recebido").length} total={todos.length} rotulo="Recebidos" />
      </div>
      <div className="mb-5 flex flex-wrap gap-3">
        <Escolha rotulo="Quem" valor={quem} onMuda={setQuem} opcoes={[{ id: "", nome: "Todos" }, ...pessoas.map((p) => ({ id: p, nome: p }))]} />
        <Escolha rotulo="Situação" valor={st} onMuda={setSt} opcoes={[{ id: "abertos", nome: "Em aberto" }, { id: "recebido", nome: "Recebidos" }, { id: "", nome: "Tudo" }]} />
      </div>
      {grupos.length === 0 && <Vazio>Nada aqui.</Vazio>}
      <div className="space-y-8">
        {grupos.map((g) => (
          <section key={g}>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2 border-b border-carvao pb-2">
              <h2 className="text-[17px] font-semibold">
                {g} <span className="font-normal text-cinza">{lista.filter((p) => p.quem === g).length}</span>
              </h2>
              <Copiar texto={msg(g)}>Copiar mensagem</Copiar>
            </div>
            <ul className="divide-y divide-linha">
              {lista
                .filter((p) => p.quem === g)
                .map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2.5">
                    <button type="button" className="min-w-0 flex-1 basis-72 text-left" onClick={() => setEd(p)}>
                      <span className="block hover:underline">{p.item}</span>
                      <span className="block text-[13px] text-cinza">
                        {p.area}. Destrava: {p.bloqueia}
                        {p.nota && `. ${p.nota}`}
                      </span>
                    </button>
                    <select className="campo min-h-9 w-32 py-1" aria-label="Situação" value={p.status} onChange={(e) => mudar("pendencias", p.id, { status: e.target.value as Pendencia["status"] })}>
                      {Object.entries(ST).map(([id, nome]) => (
                        <option key={id} value={id}>
                          {nome}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
      <Gaveta
        aberta={!!ed}
        titulo="Item"
        onFecha={() => setEd(null)}
        rodape={
          ed && (
            <>
              <Botao
                tom="texto"
                onClick={() => {
                  remover("pendencias", ed.id);
                  setEd(null);
                }}
              >
                Excluir
              </Botao>
              <Botao
                tom="cheio"
                disabled={!ed.item || !ed.quem}
                onClick={() => {
                  salvar("pendencias", ed);
                  setEd(null);
                }}
              >
                Salvar
              </Botao>
            </>
          )
        }
      >
        {ed && (
          <Formulario
            grupos={[
              {
                grupo: "",
                campos: [
                  { k: "item", nome: "Item", tipo: "area", col: 6, linhas: 2 },
                  { k: "quem", nome: "Quem envia", col: 3 },
                  { k: "area", nome: "Área", col: 3 },
                  { k: "bloqueia", nome: "O que destrava", col: 6 },
                  { k: "nota", nome: "Nota", tipo: "area", col: 6, linhas: 3 },
                ],
              },
            ]}
            valor={ed}
            onMuda={setEd}
          />
        )}
      </Gaveta>
    </>
  );
}
