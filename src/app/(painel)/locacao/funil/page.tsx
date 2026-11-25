"use client";
import { Plus } from "lucide-react";
import { useState } from "react";
import { CAMPOS_PESSOA, Formulario, type GrupoDef } from "@/componentes/formulario";
import { Botao, Cabecalho, Confirmar, Copiar, cx, Fita, Gaveta, Itens, Nota, Selo, Vazio, Quadro } from "@/componentes/ui";
import { certidoesPadrao } from "@/lib/certidoes";
import { diasEntre, hoje, maisMeses } from "@/lib/datas";
import { brl, novoId } from "@/lib/formato";
import { ETAPAS_FUNIL } from "@/lib/locacao";
import { acao, useSarto } from "@/lib/store";
import type { FunilLocacao, Parte } from "@/lib/tipos";

const GRUPOS: GrupoDef[] = [
  {
    grupo: "Imóvel",
    campos: [
      { k: "imovel", nome: "Imóvel", col: 4, obrigatorio: true },
      { k: "bairro", nome: "Bairro", col: 2 },
      { k: "aluguel", nome: "Aluguel", tipo: "dinheiro", col: 2 },
    ],
  },
  { grupo: "Proprietário", campos: CAMPOS_PESSOA("proprietario") },
  { grupo: "Interessado", campos: CAMPOS_PESSOA("interessado") },
  { grupo: "", campos: [{ k: "obs", nome: "Observações", tipo: "area", col: 6, linhas: 3 }] },
];
const vazia = { nome: "", doc: "", tel: "", email: "" };
const novo = (): FunilLocacao => ({
  id: novoId(),
  imovel: "",
  bairro: "",
  proprietario: vazia,
  interessado: vazia,
  aluguel: 0,
  etapa: "qualificacao",
  checklist: {},
  desde: hoje(),
  obs: "",
  criadoEm: hoje(),
});

export default function Funil() {
  const { dados, regras } = useSarto();
  const { salvar, remover, avisar, registrar } = acao();
  const [ed, setEd] = useState<FunilLocacao | null>(null);
  const [apaga, setApaga] = useState(false);
  const prazoDe = (e: string) => (e === "analise" || e === "contrato" ? regras.prazoAnaliseHoras / 24 : 0);
  const atrasado = (f: FunilLocacao) => prazoDe(f.etapa) > 0 && diasEntre(f.desde, hoje()) >= prazoDe(f.etapa);
  const i = ed ? ETAPAS_FUNIL.findIndex((e) => e.id === ed.etapa) : -1;
  const etapa = ETAPAS_FUNIL[i];
  const abertos = ed && etapa ? etapa.itens.filter((x) => !ed.checklist[x.id]) : [];
  const abaixo = ed && ed.aluguel > 0 && ed.aluguel < regras.locacaoMinimo;

  const avancar = () => {
    if (!ed) return;
    const prox = ETAPAS_FUNIL[i + 1];
    if (prox) {
      const n = { ...ed, etapa: prox.id, desde: hoje() };
      salvar("funil", n);
      setEd(n);
      registrar("Locação", `${ed.imovel} foi para ${prox.nome.toLowerCase()}`);
      return;
    }
    const feito = acao().feito();
    salvar("contratos", {
      id: novoId(),
      codigo: `L${String(dados.contratos.length + 1).padStart(3, "0")}`,
      imovel: ed.imovel,
      endereco: ed.imovel,
      bairro: ed.bairro,
      proprietario: { ...ed.proprietario, pix: "" },
      inquilino: ed.interessado,
      aluguel: ed.aluguel,
      condominio: 0,
      iptuMensal: 0,
      encargosNoBoleto: false,
      diaVencimento: 10,
      diaRepasse: 15,
      inicio: hoje(),
      fim: maisMeses(hoje(), 30),
      indice: "IPCA",
      ultimoReajuste: hoje(),
      garantia: "",
      garantiaVence: "",
      seguroVence: maisMeses(hoje(), 12),
      imoveisDoDono: 1 + dados.contratos.filter((c) => c.proprietario.nome === ed.proprietario.nome).length,
      multaPct: regras.multaPadrao,
      jurosMes: regras.jurosPadrao,
      status: "ativo",
      checklist: { documentos: feito, vistoria: feito, seguro: feito },
      saida: {},
      obs: ed.obs,
    });
    remover("funil", ed.id);
    registrar("Locação", `ativou o contrato de ${ed.imovel}`);
    avisar("Contrato criado em Contratos. Confira prazo, índice e garantia.");
    setEd(null);
  };

  const dossie = () => {
    if (!ed) return;
    const ja = dados.dossies.find((d) => d.origem === "locacao" && d.origemId === ed.id);
    if (ja) return window.location.assign(`/certidoes?d=${ja.id}`);
    const p: Parte = {
      id: novoId(),
      papel: "Inquilino",
      tipo: ed.interessado.doc.length > 11 ? "PJ" : "PF",
      nome: ed.interessado.nome,
      doc: ed.interessado.doc,
      nascimento: "",
      mae: "",
      matricula: "",
      inscricao: "",
    };
    const id = novoId();
    salvar("funil", ed);
    salvar("dossies", {
      id,
      titulo: `Pré-análise: ${ed.interessado.nome}`,
      origem: "locacao",
      origemId: ed.id,
      partes: [p],
      parecer: "",
      risco: "a_analisar",
      criadoEm: hoje(),
      certidoes: certidoesPadrao(p.tipo).map((tipo) => ({ id: novoId(), parteId: p.id, tipo, status: "pendente" })),
    });
    window.location.assign(`/certidoes?d=${id}`);
  };

  return (
    <>
      <Cabecalho
        area="LOCAÇÃO FUNIL"
        titulo="Funil de locação"
        texto={`Da qualificação ao contrato ativo. Aluguel mínimo de ${brl(regras.locacaoMinimo, false)}; análise e contrato em ${regras.prazoAnaliseHoras}h cada.`}
      >
        <Botao tom="cheio" onClick={() => setEd(novo())}>
          <Plus size={16} /> Novo imóvel
        </Botao>
      </Cabecalho>
      {dados.funil.length === 0 && <Vazio>Nenhum imóvel no funil.</Vazio>}
      <Quadro nome="Etapas da locação">
        <div className="grid grid-cols-1 md:min-w-[1040px] md:grid-cols-8 gap-3">
          {ETAPAS_FUNIL.map((e) => (
            <section key={e.id}>
              <h2 className="mb-2 border-b border-carvao pb-1.5 text-[13px] font-semibold">
                {e.nome} <span className="font-normal text-cinza">{dados.funil.filter((f) => f.etapa === e.id).length || ""}</span>
              </h2>
              <div className="space-y-2">
                {dados.funil
                  .filter((f) => f.etapa === e.id)
                  .map((f) => (
                    <button key={f.id} type="button" onClick={() => setEd(f)} className="block w-full bg-linho p-3 text-left hover:bg-linha">
                      <span className="block font-medium leading-snug">{f.imovel}</span>
                      <span className="block text-[12px] text-cinza">{f.interessado.nome || f.proprietario.nome}</span>
                      <span className="mt-1.5 block tabular-nums">{brl(f.aluguel, false)}</span>
                      <span className="mt-1.5 flex flex-wrap gap-1">
                        {atrasado(f) && <Selo tom="erro">Fora do prazo</Selo>}
                        {f.aluguel > 0 && f.aluguel < regras.locacaoMinimo && <Selo tom="alerta">Abaixo do mínimo</Selo>}
                      </span>
                    </button>
                  ))}
              </div>
            </section>
          ))}
        </div>
      </Quadro>

      <Gaveta
        aberta={!!ed}
        titulo={ed?.imovel || "Novo imóvel"}
        sub={etapa && `Etapa: ${etapa.nome}`}
        onFecha={() => setEd(null)}
        rodape={
          ed && (
            <>
              {dados.funil.some((f) => f.id === ed.id) && (
                <Botao tom="texto" onClick={() => setApaga(true)}>
                  Excluir
                </Botao>
              )}
              <Botao
                disabled={!ed.imovel}
                onClick={() => {
                  salvar("funil", ed);
                  avisar("Salvo");
                  setEd(null);
                }}
              >
                Salvar
              </Botao>
              <Botao
                tom="cheio"
                disabled={!ed.imovel || abertos.length > 0}
                title={abertos.length ? `Falta: ${abertos.map((x) => x.nome).join(", ")}` : undefined}
                onClick={avancar}
              >
                {ETAPAS_FUNIL[i + 1] ? `Passar para ${ETAPAS_FUNIL[i + 1].nome}` : "Ativar contrato"}
              </Botao>
            </>
          )
        }
      >
        {ed && etapa && (
          <div className="space-y-6">
            <Fita parte={i} total={ETAPAS_FUNIL.length} />
            {abaixo && <Nota tom="alerta">Aluguel abaixo do mínimo de {brl(regras.locacaoMinimo, false)}. Pela regra de qualificação, este imóvel não entra.</Nota>}
            <div>
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[13px] font-semibold uppercase tracking-wide">{etapa.nome}</h3>
                {ed.etapa === "analise" && (
                  <span className="flex gap-2">
                    <Copiar
                      texto={`Olá, ${ed.interessado.nome.split(" ")[0]}. Para a pré-análise do imóvel ${ed.imovel}, preciso de: RG ou CNH, CPF, comprovante de endereço, comprovante de renda dos últimos 3 meses e certidão de estado civil.`}
                    >
                      Copiar pedido
                    </Copiar>
                    <Botao pequeno disabled={!ed.interessado.nome} onClick={dossie}>
                      Consultas e certidões
                    </Botao>
                  </span>
                )}
              </div>
              <Itens itens={etapa.itens} check={ed.checklist} onMuda={(checklist) => setEd({ ...ed, checklist })} />
            </div>
            <details>
              <summary className="text-[13px] font-medium underline underline-offset-4">Etapas anteriores e próximas</summary>
              <div className="mt-3 space-y-4">
                {ETAPAS_FUNIL.filter((e) => e.id !== ed.etapa).map((e) => (
                  <div key={e.id}>
                    <h4 className={cx("text-[12px] font-semibold uppercase text-cinza")}>{e.nome}</h4>
                    <Itens itens={e.itens} check={ed.checklist} onMuda={(checklist) => setEd({ ...ed, checklist })} />
                  </div>
                ))}
              </div>
            </details>
            <Formulario grupos={GRUPOS} valor={ed} onMuda={setEd} />
          </div>
        )}
      </Gaveta>
      <Confirmar
        aberta={apaga}
        titulo="Tirar este imóvel do funil?"
        texto="O cadastro desta locação será apagado."
        sim="Tirar do funil"
        onNao={() => setApaga(false)}
        onSim={() => {
          if (ed) remover("funil", ed.id);
          setApaga(false);
          setEd(null);
        }}
      />
    </>
  );
}
