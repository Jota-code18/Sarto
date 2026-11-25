"use client";
import { MessageCircle, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Formulario, type GrupoDef, obrigatoriosVazios } from "@/componentes/formulario";
import { Abas, Botao, Busca, Cabecalho, Confirmar, Escolha, estiloBotao, Gaveta, Nota, Numero, Numeros, Selo, type Tom, Vazio } from "@/componentes/ui";
import { leadRepetido } from "@/lib/comercial";
import { br, competencia, hoje, prazo } from "@/lib/datas";
import { baixarArquivo, csv, linkWhats, mascaraTel, novoId, semAcento } from "@/lib/formato";
import { acao, useSarto } from "@/lib/store";
import type { Lead, LeadStatus } from "@/lib/tipos";

const STATUS: { id: LeadStatus; nome: string; tom: Tom }[] = [
  { id: "novo", nome: "Novo", tom: "alerta" },
  { id: "atendimento", nome: "Em atendimento", tom: "neutro" },
  { id: "visita", nome: "Visita", tom: "neutro" },
  { id: "proposta", nome: "Proposta", tom: "forte" },
  { id: "ganho", nome: "Ganho", tom: "ok" },
  { id: "perdido", nome: "Perdido", tom: "neutro" },
];
const CANAIS = ["ZAP Imóveis", "Viva Real", "OLX", "62imóveis", "Site", "Instagram", "WhatsApp", "Indicação", "Placa", "Plantão", "Lista 100", "Outro"];
const TIPOS = ["Casa em condomínio", "Casa de rua", "Apartamento", "Lote", "Comercial", "Rural"];

const novo = (): Lead => ({
  id: novoId(), nome: "", tel: "", email: "", canal: "", interesse: "comprar", tipoImovel: "", bairros: "", min: 0, max: 0, imovelCod: "", corretorId: "",
  status: "novo", obs: "", criadoEm: hoje(), atualizadoEm: hoje(), noJetimob: false,
});

export default function Leads() {
  const { dados, perfil } = useSarto();
  const { salvar, remover, avisar, registrar, mudar } = acao();
  const [ed, setEd] = useState<Lead | null>(null);
  const [apagar, setApagar] = useState(false);
  const [aba, setAba] = useState<"abertos" | "todos" | "jetimob">("abertos");
  const [q, setQ] = useState("");
  const [cor, setCor] = useState("");

  const grupos: GrupoDef[] = useMemo(
    () => [
      {
        grupo: "Contato",
        campos: [
          { k: "nome", nome: "Nome", col: 6, obrigatorio: true },
          { k: "tel", nome: "WhatsApp", tipo: "tel", col: 3, obrigatorio: true },
          { k: "email", nome: "E-mail", tipo: "email", col: 3 },
          { k: "canal", nome: "De onde veio", tipo: "opcoes", opcoes: CANAIS, col: 3, obrigatorio: true },
          { k: "corretorId", nome: "Corretor", tipo: "opcoes", col: 3, opcoes: [{ id: "", nome: "Sem corretor" }, ...dados.corretores.filter((c) => c.status !== "inativo").map((c) => ({ id: c.id, nome: c.nome }))] },
        ],
      },
      {
        grupo: "O que procura",
        campos: [
          { k: "interesse", nome: "Interesse", tipo: "opcoes", col: 3, opcoes: [{ id: "comprar", nome: "Comprar" }, { id: "alugar", nome: "Alugar" }, { id: "vender", nome: "Vender" }, { id: "investir", nome: "Investir" }] },
          { k: "tipoImovel", nome: "Tipo de imóvel", tipo: "opcoes", opcoes: TIPOS, col: 3 },
          { k: "imovelCod", nome: "Código do imóvel", col: 2 },
          { k: "bairros", nome: "Bairros ou condomínios", col: 4 },
          { k: "min", nome: "Valor mínimo", tipo: "dinheiro", col: 3 },
          { k: "max", nome: "Valor máximo", tipo: "dinheiro", col: 3 },
          { k: "obs", nome: "Observações", tipo: "area", col: 6, linhas: 3 },
        ],
      },
      {
        grupo: "Andamento",
        campos: [
          { k: "status", nome: "Situação", tipo: "opcoes", opcoes: STATUS, col: 3 },
          { k: "noJetimob", nome: "Já está no JetImob", tipo: "sim", col: 3 },
        ],
      },
    ],
    [dados.corretores],
  );
  const campos = grupos.flatMap((g) => g.campos);
  const faltam = ed ? obrigatoriosVazios(campos, ed) : [];
  const rep = ed ? leadRepetido(ed, dados.leads) : undefined;
  const nomeCor = (id: string) => dados.corretores.find((c) => c.id === id)?.nome ?? "";

  const t = semAcento(q);
  const lista = dados.leads
    .filter((l) => (aba === "abertos" ? l.status !== "ganho" && l.status !== "perdido" : aba === "jetimob" ? !l.noJetimob : true))
    .filter((l) => !cor || l.corretorId === cor)
    .filter((l) => !t || semAcento(`${l.nome} ${l.tel} ${l.bairros} ${l.canal} ${l.imovelCod}`).includes(t))
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  const mes = dados.leads.filter((l) => l.criadoEm.startsWith(competencia(hoje())));
  const fora = dados.leads.filter((l) => !l.noJetimob);

  const exportar = () => {
    const ls = aba === "jetimob" ? fora : lista;
    baixarArquivo(
      `leads-sarto-${hoje()}.csv`,
      csv([
        ["Nome", "Telefone", "E-mail", "Canal", "Interesse", "Tipo", "Bairros", "Mínimo", "Máximo", "Código do imóvel", "Corretor", "Situação", "Criado em", "Observações"],
        ...ls.map((l) => [l.nome, mascaraTel(l.tel), l.email, l.canal, l.interesse, l.tipoImovel, l.bairros, l.min || "", l.max || "", l.imovelCod, nomeCor(l.corretorId), l.status, br(l.criadoEm), l.obs]),
      ]),
      "text/csv;charset=utf-8",
    );
  };

  return (
    <>
      <Cabecalho area="COMERCIAL LEADS" titulo="Leads" texto="Cadastro rápido pelo celular, com aviso de lead repetido.">
        <Botao onClick={exportar}>Exportar planilha</Botao>
        <Botao tom="cheio" onClick={() => setEd(novo())}>
          <Plus size={16} /> Novo lead
        </Botao>
      </Cabecalho>

      <Numeros>
        <Numero valor={mes.length} nome="No mês" />
        <Numero valor={dados.leads.filter((l) => l.status === "novo").length} nome="Sem atendimento" />
        <Numero valor={dados.leads.filter((l) => l.status === "visita" || l.status === "proposta").length} nome="Em visita ou proposta" />
        <Numero valor={fora.length} nome="Fora do JetImob" nota="até a chave da API chegar" />
      </Numeros>

      <Abas
        atual={aba}
        onMuda={setAba}
        itens={[
          { id: "abertos", nome: "Em aberto" },
          { id: "jetimob", nome: "Para lançar no JetImob", n: fora.length },
          { id: "todos", nome: "Todos", n: dados.leads.length },
        ]}
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <Busca valor={q} onMuda={setQ} placeholder="Nome, telefone, bairro ou canal" />
        {perfil !== "corretor" && <Escolha rotulo="Corretor" valor={cor} onMuda={setCor} opcoes={[{ id: "", nome: "Todos os corretores" }, ...dados.corretores.map((c) => ({ id: c.id, nome: c.nome }))]} />}
      </div>

      {lista.length === 0 ? (
        <Vazio acao={<Botao onClick={() => setEd(novo())}>Cadastrar lead</Botao>}>Nenhum lead aqui.</Vazio>
      ) : (
        <div className="overflow-x-auto">
          <table className="tabela min-w-[760px]">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Procura</th>
                <th>Canal</th>
                <th>Corretor</th>
                <th>Entrou</th>
                <th>Situação</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lista.map((l) => (
                <tr key={l.id} className="clica">
                  <td>
                    <button type="button" className="text-left font-medium hover:underline" onClick={() => setEd(l)}>
                      {l.nome}
                    </button>
                    <span className="block text-[13px] text-cinza">{mascaraTel(l.tel)}</span>
                  </td>
                  <td>
                    {[l.interesse, l.tipoImovel.toLowerCase()].filter(Boolean).join(" ")}
                    <span className="block text-[13px] text-cinza">{l.bairros}</span>
                  </td>
                  <td>{l.canal}</td>
                  <td>{nomeCor(l.corretorId) || <Selo tom="erro">Sem corretor</Selo>}</td>
                  <td>{prazo(l.criadoEm)}</td>
                  <td>
                    <Selo tom={STATUS.find((s) => s.id === l.status)?.tom}>{STATUS.find((s) => s.id === l.status)?.nome}</Selo>
                    {!l.noJetimob && <span className="mt-1 block text-[12px] text-cinza">fora do JetImob</span>}
                  </td>
                  <td className="whitespace-nowrap text-right">
                    {aba === "jetimob" ? (
                      <Botao pequeno onClick={() => mudar("leads", l.id, { noJetimob: true })}>
                        Lançado
                      </Botao>
                    ) : (
                      <a className={estiloBotao("linha", true)} href={linkWhats(l.tel, `Olá, ${l.nome.split(" ")[0]}. Aqui é da Sarto Imóveis.`)} target="_blank" rel="noreferrer" aria-label={`WhatsApp de ${l.nome}`}>
                        <MessageCircle size={15} />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Gaveta
        aberta={!!ed}
        titulo={ed?.nome || "Novo lead"}
        sub={ed && `Entrou em ${br(ed.criadoEm)}`}
        onFecha={() => setEd(null)}
        rodape={
          ed && (
            <>
              {dados.leads.some((l) => l.id === ed.id) && (
                <Botao tom="texto" onClick={() => setApagar(true)}>
                  Excluir
                </Botao>
              )}
              <Botao
                tom="cheio"
                disabled={faltam.length > 0}
                title={faltam.length ? `Falta: ${faltam.join(", ")}` : undefined}
                onClick={() => {
                  const antes = dados.leads.find((l) => l.id === ed.id);
                  salvar("leads", { ...ed, atualizadoEm: hoje() });
                  if (antes && antes.status !== ed.status) registrar("Leads", `mudou ${ed.nome} para ${STATUS.find((s) => s.id === ed.status)?.nome.toLowerCase()}`);
                  avisar("Lead salvo");
                  setEd(null);
                }}
              >
                Salvar lead
              </Botao>
            </>
          )
        }
      >
        {ed && (
          <>
            {rep && (
              <div className="mb-5">
                <Nota tom="alerta">
                  Já existe um lead com este contato: <strong>{rep.nome}</strong>, {nomeCor(rep.corretorId) || "sem corretor"}, entrou em {br(rep.criadoEm)}.{" "}
                  <button type="button" className="underline" onClick={() => setEd(rep)}>
                    Abrir o existente
                  </button>
                </Nota>
              </div>
            )}
            <Formulario grupos={grupos} valor={ed} onMuda={setEd} />
            {faltam.length > 0 && <p className="mt-4 text-[13px] text-cinza">Falta preencher: {faltam.join(", ")}.</p>}
          </>
        )}
      </Gaveta>
      <Confirmar
        aberta={apagar}
        titulo="Excluir este lead?"
        texto="O cadastro sai do painel. Se ele já está no JetImob, lá continua."
        sim="Excluir lead"
        onNao={() => setApagar(false)}
        onSim={() => {
          if (ed) remover("leads", ed.id);
          setApagar(false);
          setEd(null);
        }}
      />
    </>
  );
}
