"use client";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Formulario, type GrupoDef } from "@/componentes/formulario";
import { Abas, Botao, Cabecalho, Copiar, Gaveta, Nota, Selo, type Tom, Vazio, Tabela } from "@/componentes/ui";
import { br, hoje, prazo } from "@/lib/datas";
import { brl, novoId } from "@/lib/formato";
import { acao, useSarto } from "@/lib/store";
import type { Chamado, MultaProposta } from "@/lib/tipos";

const ST: Record<Chamado["status"], { nome: string; tom: Tom }> = {
  aberto: { nome: "Aberto", tom: "alerta" },
  orcamento: { nome: "Em orçamento", tom: "neutro" },
  aprovado: { nome: "Serviço aprovado", tom: "forte" },
  concluido: { nome: "Concluído", tom: "ok" },
};
const RESPOSTAS: { t: string; r: string }[] = [
  { t: "Como pago o aluguel?", r: "O pagamento é feito pelo boleto ou Pix enviado todo mês. Se precisar da segunda via, me avise por aqui." },
  {
    t: "Quero passar água e luz para o meu nome",
    r: "A transferência é feita direto na Saneago (água) e na Equatorial (energia), com o contrato de locação em mãos. O prazo pelo contrato é de 30 dias a partir do início. Quando concluir, me envie o comprovante.",
  },
  {
    t: "Vou atrasar o aluguel",
    r: "Obrigada por avisar. O contrato prevê multa e juros a partir do vencimento. Me diga a data em que consegue pagar para eu registrar e te passar o valor atualizado.",
  },
  { t: "Quero sair do imóvel", r: "Para iniciar a saída preciso do aviso por escrito. Depois agendamos a vistoria e conferimos as contas até a data da entrega das chaves." },
  { t: "Algo quebrou no imóvel", r: "Me envie fotos ou vídeo e uma descrição do problema. Vou abrir um chamado e verificar de quem é a responsabilidade pelo reparo." },
];

export default function Atendimento() {
  const { dados } = useSarto();
  const { salvar, avisar, registrar } = acao();
  const [aba, setAba] = useState<"chamados" | "multas" | "respostas">("chamados");
  const [ch, setCh] = useState<Chamado | null>(null);
  const [mu, setMu] = useState<MultaProposta | null>(null);
  const contratos = dados.contratos.filter((c) => c.status !== "encerrado").map((c) => ({ id: c.id, nome: `${c.imovel}, ${c.inquilino.nome}` }));
  const k = (id: string) => dados.contratos.find((c) => c.id === id);

  const gCh: GrupoDef[] = [
    {
      grupo: "",
      campos: [
        { k: "contratoId", nome: "Contrato", tipo: "opcoes", opcoes: contratos, col: 6, obrigatorio: true },
        { k: "titulo", nome: "Problema", col: 6, obrigatorio: true },
        { k: "descricao", nome: "Descrição", tipo: "area", col: 6 },
        { k: "quemPaga", nome: "Quem paga", tipo: "opcoes", col: 2, opcoes: ["a definir", "proprietario", "inquilino"] },
        { k: "custo", nome: "Custo", tipo: "dinheiro", col: 2 },
        { k: "status", nome: "Situação", tipo: "opcoes", col: 2, opcoes: Object.entries(ST).map(([id, v]) => ({ id, nome: v.nome })) },
      ],
    },
  ];
  const gMu: GrupoDef[] = [
    {
      grupo: "",
      campos: [
        { k: "contratoId", nome: "Contrato", tipo: "opcoes", opcoes: contratos, col: 6, obrigatorio: true },
        { k: "motivo", nome: "Regra quebrada", col: 6, obrigatorio: true },
        { k: "clausula", nome: "Cláusula", col: 3, obrigatorio: true },
        { k: "valor", nome: "Valor", tipo: "dinheiro", col: 3 },
      ],
    },
  ];

  return (
    <>
      <Cabecalho area="LOCAÇÃO ATENDIMENTO" titulo="Chamados e multas" texto="Manutenção com responsável e custo, e multa sempre com aprovação.">
        {aba === "multas" ? (
          <Botao tom="cheio" onClick={() => setMu({ id: novoId(), contratoId: "", motivo: "", clausula: "", valor: 0, status: "proposta", criadaEm: hoje() })}>
            <Plus size={16} /> Propor multa
          </Botao>
        ) : (
          <Botao
            tom="cheio"
            onClick={() => setCh({ id: novoId(), contratoId: "", titulo: "", descricao: "", quemPaga: "a definir", custo: 0, status: "aberto", abertoEm: hoje() })}
          >
            <Plus size={16} /> Abrir chamado
          </Botao>
        )}
      </Cabecalho>
      <Abas
        atual={aba}
        onMuda={setAba}
        itens={[
          { id: "chamados", nome: "Chamados", n: dados.chamados.filter((c) => c.status !== "concluido").length },
          { id: "multas", nome: "Multas", n: dados.multas.filter((m) => m.status === "proposta").length },
          { id: "respostas", nome: "Respostas prontas" },
        ]}
      />
      {aba === "chamados" &&
        (dados.chamados.length === 0 ? (
          <Vazio>Nenhum chamado.</Vazio>
        ) : (
          <Tabela className="md:min-w-[720px]">
            <thead>
              <tr>
                <th>Problema</th>
                <th>Imóvel</th>
                <th>Aberto</th>
                <th>Quem paga</th>
                <th className="n">Custo</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {[...dados.chamados]
                .sort((a, b) => Number(a.status === "concluido") - Number(b.status === "concluido"))
                .map((c) => (
                  <tr key={c.id} className="clica">
                    <td>
                      <button type="button" className="text-left font-medium hover:underline" onClick={() => setCh(c)}>
                        {c.titulo}
                      </button>
                    </td>
                    <td>{k(c.contratoId)?.imovel}</td>
                    <td>{prazo(c.abertoEm)}</td>
                    <td>{c.quemPaga}</td>
                    <td className="n">{c.custo ? brl(c.custo) : "—"}</td>
                    <td>
                      <Selo tom={ST[c.status].tom}>{ST[c.status].nome}</Selo>
                    </td>
                  </tr>
                ))}
            </tbody>
          </Tabela>
        ))}
      {aba === "multas" && (
        <>
          {dados.multas.length === 0 ? (
            <Vazio>Nenhuma multa.</Vazio>
          ) : (
            <ul className="divide-y divide-linha border-y border-linha">
              {dados.multas.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium">
                      {k(m.contratoId)?.inquilino.nome}: {brl(m.valor)}
                    </p>
                    <p className="text-[13px] text-cinza">
                      {m.motivo} ({m.clausula}), {br(m.criadaEm)}
                    </p>
                  </div>
                  <Selo tom={m.status === "aprovada" ? "ok" : m.status === "recusada" ? "neutro" : "alerta"}>
                    {m.status === "proposta" ? "Espera aprovação" : `${m.status === "aprovada" ? "Aprovada" : "Recusada"} por ${m.decisao?.por}`}
                  </Selo>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-5">
            <Nota>A multa aprovada entra na cobrança em aberto do inquilino, com o motivo escrito. Cite sempre a cláusula.</Nota>
          </div>
        </>
      )}
      {aba === "respostas" && (
        <div className="space-y-4">
          <Nota>Textos provisórios, até a Verônica enviar os que já usa. A IA que responde sozinha depende do WhatsApp oficial e da API da Anthropic.</Nota>
          {RESPOSTAS.map((r) => (
            <div key={r.t} className="rounded-[var(--radius-cartao)] flex flex-wrap items-start justify-between gap-3 bg-linho p-4">
              <div className="max-w-2xl">
                <p className="font-medium">{r.t}</p>
                <p className="mt-1 text-cinza">{r.r}</p>
              </div>
              <Copiar texto={r.r}>Copiar</Copiar>
            </div>
          ))}
        </div>
      )}

      <Gaveta
        aberta={!!ch}
        titulo={ch?.titulo || "Abrir chamado"}
        sub={ch && k(ch.contratoId)?.imovel}
        onFecha={() => setCh(null)}
        rodape={
          ch && (
            <>
              {ch.custo > 0 && ch.contratoId && (
                <Copiar
                  texto={`Olá, ${k(ch.contratoId)?.proprietario.nome.split(" ")[0]}. No imóvel ${k(ch.contratoId)?.imovel} há um reparo: ${ch.titulo}. ${ch.descricao} Orçamento: ${brl(ch.custo)}. Posso aprovar?`}
                  pequeno={false}
                >
                  Copiar pedido ao proprietário
                </Copiar>
              )}
              <Botao
                tom="cheio"
                disabled={!ch.contratoId || !ch.titulo}
                onClick={() => {
                  salvar("chamados", ch);
                  avisar("Chamado salvo");
                  setCh(null);
                }}
              >
                Salvar chamado
              </Botao>
            </>
          )
        }
      >
        {ch && <Formulario grupos={gCh} valor={ch} onMuda={setCh} />}
      </Gaveta>
      <Gaveta
        aberta={!!mu}
        titulo="Propor multa"
        onFecha={() => setMu(null)}
        rodape={
          mu && (
            <Botao
              tom="cheio"
              disabled={!mu.contratoId || !mu.motivo || !mu.clausula || !mu.valor}
              onClick={() => {
                salvar("multas", mu);
                registrar("Locação", `propôs multa de ${brl(mu.valor)} (${k(mu.contratoId)?.imovel})`);
                avisar("Multa enviada para aprovação");
                setMu(null);
              }}
            >
              Enviar para aprovação
            </Botao>
          )
        }
      >
        {mu && <Formulario grupos={gMu} valor={mu} onMuda={setMu} />}
      </Gaveta>
    </>
  );
}
