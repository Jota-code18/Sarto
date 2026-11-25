"use client";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Formulario, type GrupoDef } from "@/componentes/formulario";
import { Abas, Botao, Cabecalho, Confirmar, Copiar, Fita, Gaveta, Itens, Numero, Numeros, Selo, Vazio } from "@/componentes/ui";
import { CHECK_CORRETOR, TOTAL_CHECK_CORRETOR } from "@/lib/comercial";
import { br, diasEntre, hoje } from "@/lib/datas";
import { mascaraTel, novoId } from "@/lib/formato";
import { acao, useSarto } from "@/lib/store";
import type { Corretor } from "@/lib/tipos";

const GRUPOS: GrupoDef[] = [
  {
    grupo: "Cadastro",
    campos: [
      { k: "nome", nome: "Nome", col: 6, obrigatorio: true },
      { k: "tel", nome: "WhatsApp", tipo: "tel", col: 3 },
      { k: "email", nome: "E-mail", tipo: "email", col: 3 },
      { k: "creci", nome: "CRECI", col: 2 },
      { k: "entrada", nome: "Entrada", tipo: "data", col: 2 },
      {
        k: "status",
        nome: "Situação",
        tipo: "opcoes",
        col: 2,
        opcoes: [
          { id: "entrando", nome: "Entrando" },
          { id: "ativo", nome: "Ativo" },
          { id: "inativo", nome: "Inativo" },
        ],
      },
      { k: "obs", nome: "Observações", tipo: "area", col: 6, linhas: 3, dica: "Documentos e dados bancários ficam fora daqui até o banco com login. Marque só se já recebeu." },
    ],
  },
];
const novo = (): Corretor => ({ id: novoId(), nome: "", tel: "", email: "", creci: "", entrada: hoje(), status: "entrando", checklist: {}, obs: "" });

export default function Corretores() {
  const { dados } = useSarto();
  const { salvar, remover, avisar, registrar } = acao();
  const [ed, setEd] = useState<Corretor | null>(null);
  const [aba, setAba] = useState<"entrando" | "ativo" | "inativo">("entrando");
  const [apaga, setApaga] = useState(false);
  const por = (s: Corretor["status"]) => dados.corretores.filter((c) => c.status === s);
  const todos = CHECK_CORRETOR.flatMap((g) => g.itens);
  const pedido = (c: Corretor) =>
    `Olá, ${c.nome.split(" ")[0]}. Seja bem-vindo(a) à Sarto. Para concluir a sua entrada preciso de: documento com foto, comprovante de endereço, dados bancários${c.creci ? "" : ", CRECI (se tiver)"} e uma foto para os perfis.`;

  return (
    <>
      <Cabecalho area="COMERCIAL CORRETORES" titulo="Corretores" texto="Entrada de corretor com um responsável para cada item.">
        <Botao tom="cheio" onClick={() => setEd(novo())}>
          <Plus size={16} /> Novo corretor
        </Botao>
      </Cabecalho>
      <Numeros>
        <Numero valor={por("ativo").length} nome="Ativos" />
        <Numero valor={por("entrando").length} nome="Entrando" />
        <Numero valor={por("entrando").reduce((a, c) => a + todos.filter((i) => !c.checklist[i.id] && i.quem === "Igor").length, 0)} nome="Itens com o Igor" />
        <Numero valor={por("entrando").reduce((a, c) => a + todos.filter((i) => !c.checklist[i.id] && i.quem === "Yan").length, 0)} nome="Itens com o marketing" />
      </Numeros>
      <Abas
        atual={aba}
        onMuda={setAba}
        itens={[
          { id: "entrando", nome: "Entrando", n: por("entrando").length },
          { id: "ativo", nome: "Ativos", n: por("ativo").length },
          { id: "inativo", nome: "Inativos", n: por("inativo").length },
        ]}
      />
      {por(aba).length === 0 ? (
        <Vazio>Ninguém aqui.</Vazio>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {por(aba).map((c) => {
            const n = todos.filter((i) => c.checklist[i.id]).length;
            const leads = dados.leads.filter((l) => l.corretorId === c.id);
            return (
              <button key={c.id} type="button" onClick={() => setEd(c)} className="bg-linho p-5 text-left hover:bg-linha">
                <span className="flex items-start justify-between gap-3">
                  <span className="text-[16px] font-semibold">{c.nome}</span>
                  {aba === "entrando" && diasEntre(c.entrada, hoje()) > 10 && <Selo tom="erro">{diasEntre(c.entrada, hoje())} dias</Selo>}
                </span>
                <span className="mb-3 block text-[13px] text-cinza">{[c.creci && `CRECI ${c.creci}`, mascaraTel(c.tel)].filter(Boolean).join(", ") || "Sem contato"}</span>
                {aba === "ativo" ? (
                  <span className="grid grid-cols-3 gap-2 text-[13px]">
                    <span>
                      <b className="block text-[20px] font-light">{leads.length}</b>leads
                    </span>
                    <span>
                      <b className="block text-[20px] font-light">{dados.captacoes.filter((x) => x.corretorId === c.id).length}</b>captações
                    </span>
                    <span>
                      <b className="block text-[20px] font-light">{dados.vendas.filter((x) => x.corretorId === c.id).length}</b>vendas
                    </span>
                  </span>
                ) : (
                  <Fita parte={n} total={TOTAL_CHECK_CORRETOR} rotulo="Entrada" />
                )}
              </button>
            );
          })}
        </div>
      )}

      <Gaveta
        aberta={!!ed}
        titulo={ed?.nome || "Novo corretor"}
        sub={ed && `Entrada em ${br(ed.entrada)}`}
        onFecha={() => setEd(null)}
        rodape={
          ed && (
            <>
              {dados.corretores.some((c) => c.id === ed.id) && (
                <Botao tom="texto" onClick={() => setApaga(true)}>
                  Excluir
                </Botao>
              )}
              <Copiar texto={pedido(ed)} pequeno={false}>
                Copiar pedido de documentos
              </Copiar>
              <Botao
                tom="cheio"
                disabled={!ed.nome}
                onClick={() => {
                  const antes = dados.corretores.find((c) => c.id === ed.id);
                  const completo = todos.every((i) => ed.checklist[i.id] || i.id === "creci");
                  const status = ed.status === "entrando" && completo ? "ativo" : ed.status;
                  salvar("corretores", { ...ed, status });
                  if (!antes) registrar("Corretores", `cadastrou ${ed.nome}`);
                  if (status === "ativo" && antes?.status === "entrando") registrar("Corretores", `concluiu a entrada de ${ed.nome}`);
                  avisar(status !== ed.status ? "Entrada concluída: corretor ativo" : "Corretor salvo");
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
          <div className="space-y-7">
            <Formulario grupos={GRUPOS} valor={ed} onMuda={setEd} />
            <Fita parte={todos.filter((i) => ed.checklist[i.id]).length} total={TOTAL_CHECK_CORRETOR} rotulo="Checklist de entrada" />
            {CHECK_CORRETOR.map((g) => (
              <div key={g.grupo}>
                <h3 className="text-[13px] font-semibold uppercase tracking-wide">{g.grupo}</h3>
                <Itens itens={g.itens} check={ed.checklist} onMuda={(checklist) => setEd({ ...ed, checklist })} />
              </div>
            ))}
          </div>
        )}
      </Gaveta>
      <Confirmar
        aberta={apaga}
        titulo="Excluir este corretor?"
        texto="Se ele só saiu da equipe, prefira mudar a situação para Inativo: assim o histórico de leads e vendas continua com nome."
        sim="Excluir corretor"
        onNao={() => setApaga(false)}
        onSim={() => {
          if (ed) remover("corretores", ed.id);
          setApaga(false);
          setEd(null);
        }}
      />
    </>
  );
}
