"use client";
import { CalendarPlus, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { Formulario, type GrupoDef } from "@/componentes/formulario";
import { Botao, Cabecalho, Cartao, Confirmar, cx, Escolha, estiloBotao, Gaveta, Nota, Selo } from "@/componentes/ui";
import { AGENDAS, conflitosVideo, doDia, hora, horariosLivres, ics, linkGoogle, min, prazoEntrega } from "@/lib/agenda";
import { br, brCurto, DIAS, diaSemana, hoje, maisDias, paraData, prazo, segundaDe } from "@/lib/datas";
import { baixarArquivo, linkWhats, novoId } from "@/lib/formato";
import { acao, useSarto } from "@/lib/store";
import type { Evento } from "@/lib/tipos";

export default function Agenda() {
  const { dados, regras } = useSarto();
  const { salvar, remover, avisar, mudar } = acao();
  const [seg, setSeg] = useState(segundaDe(hoje()));
  const [ag, setAg] = useState("");
  const [ed, setEd] = useState<Evento | null>(null);
  const [apaga, setApaga] = useState(false);
  const [diaV, setDiaV] = useState(hoje());

  const evs = dados.eventos.filter((e) => !ag || e.agenda === ag);
  const semana = [0, 1, 2, 3, 4, 5].map((n) => maisDias(seg, n));
  const novo = (data = hoje(), agenda = ag || "reunioes", inicio = "09:00", fim = "10:00"): Evento => ({
    id: novoId(),
    agenda,
    titulo: "",
    data,
    inicio,
    fim,
    local: "",
    quem: "",
    obs: "",
  });
  const conf = ed?.agenda === "videomaker" ? conflitosVideo(ed, dados.eventos, regras) : [];
  const entregas = dados.eventos.filter((e) => e.agenda === "videomaker" && e.entrega && !e.entregue).sort((a, b) => (a.entrega as string).localeCompare(b.entrega as string));
  const livres = horariosLivres(diaV, 90, dados.eventos, regras);

  const grupos: GrupoDef[] = [
    {
      grupo: "",
      campos: [
        { k: "titulo", nome: "Título", col: 6, obrigatorio: true },
        { k: "agenda", nome: "Agenda", tipo: "opcoes", col: 3, opcoes: AGENDAS },
        { k: "data", nome: "Data", tipo: "data", col: 3 },
        { k: "inicio", nome: "Início", tipo: "hora", col: 3 },
        { k: "fim", nome: "Fim", tipo: "hora", col: 3 },
        { k: "quem", nome: "Quem", col: 3 },
        { k: "local", nome: "Local", col: 3 },
        { k: "semanal", nome: "Repetir toda semana", tipo: "sim", col: 3, se: (v) => v.agenda !== "videomaker" },
        { k: "entrega", nome: "Prazo de entrega", tipo: "data", col: 3, se: (v) => v.agenda === "videomaker" },
        { k: "entregue", nome: "Material entregue", tipo: "sim", col: 3, se: (v) => v.agenda === "videomaker" },
        { k: "obs", nome: "Observações", tipo: "area", col: 6, linhas: 3 },
      ],
    },
  ];

  return (
    <>
      <Cabecalho area="GESTÃO AGENDA" titulo="Agenda" texto="Reuniões, visitas, vistorias, marketing e videomaker. Sai para o Google Agenda por link ou arquivo.">
        <Escolha rotulo="Agenda" valor={ag} onMuda={setAg} opcoes={[{ id: "", nome: "Todas as agendas" }, ...AGENDAS]} />
        <Botao onClick={() => baixarArquivo(`agenda-sarto-${hoje()}.ics`, ics(evs.filter((e) => e.semanal || e.data >= hoje())), "text/calendar;charset=utf-8")}>
          Exportar .ics
        </Botao>
        <Botao tom="cheio" onClick={() => setEd(novo())}>
          <Plus size={16} /> Compromisso
        </Botao>
      </Cabecalho>

      <div className="mb-4 flex items-center gap-2">
        <Botao pequeno aria-label="Semana anterior" onClick={() => setSeg(maisDias(seg, -7))}>
          <ChevronLeft size={16} />
        </Botao>
        <span className="min-w-40 text-center font-medium">
          {brCurto(seg)} a {brCurto(maisDias(seg, 5))}
        </span>
        <Botao pequeno aria-label="Próxima semana" onClick={() => setSeg(maisDias(seg, 7))}>
          <ChevronRight size={16} />
        </Botao>
        {seg !== segundaDe(hoje()) && (
          <Botao pequeno tom="texto" onClick={() => setSeg(segundaDe(hoje()))}>
            Esta semana
          </Botao>
        )}
      </div>

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="grid min-w-[880px] grid-cols-6 gap-px border border-linha bg-linha">
          {semana.map((d) => (
            <section key={d} className={cx("min-h-56 p-2.5", d === hoje() ? "bg-giz" : "bg-papel")}>
              <h2 className="mb-2 flex items-baseline justify-between">
                <span className={cx("text-[13px]", d === hoje() && "font-semibold")}>{DIAS[paraData(d).getDay()]}</span>
                <button type="button" className="text-[20px] font-light hover:underline" aria-label={`Incluir em ${br(d)}`} onClick={() => setEd(novo(d))}>
                  {d.slice(8)}
                </button>
              </h2>
              <div className="space-y-1.5">
                {doDia(evs, d).map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setEd(e)}
                    className={cx(
                      "block w-full p-2 text-left text-[13px] leading-snug",
                      e.agenda === "reunioes" ? "bg-carvao text-papel hover:bg-tinta" : "bg-linho hover:bg-linha",
                    )}
                  >
                    <span className="block tabular-nums opacity-75">
                      {e.inicio} às {e.fim}
                    </span>
                    <span className="block font-medium">{e.titulo}</span>
                    {e.agenda !== "reunioes" && <span className="block text-[12px] text-cinza">{AGENDAS.find((a) => a.id === e.agenda)?.nome}</span>}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Cartao titulo="Videomaker: horários livres">
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <label className="text-[12px] font-medium">
              Dia
              <input type="date" className="campo mt-1" value={diaV} onChange={(e) => e.target.value && setDiaV(e.target.value)} />
            </label>
            <p className="pb-2 text-[13px] text-cinza">
              {diaSemana(diaV)}. Até {regras.videoPorDia} gravações por dia, {regras.videoDeslocamentoMin} min de deslocamento, entrega em {regras.videoEntregaDias} dias úteis.
            </p>
          </div>
          {livres.length === 0 ? (
            <p className="text-cinza">Sem horário para 1h30 neste dia.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {livres.map((h) => (
                <Botao
                  key={h}
                  pequeno
                  onClick={() =>
                    setEd({ ...novo(diaV, "videomaker", h, hora(min(h) + 90)), titulo: "Gravação: ", quem: "Videomaker", entrega: prazoEntrega(diaV, regras.videoEntregaDias) })
                  }
                >
                  {h}
                </Botao>
              ))}
            </div>
          )}
        </Cartao>
        <Cartao titulo="Entregas do videomaker">
          {entregas.length === 0 ? (
            <p className="text-cinza">Nada pendente.</p>
          ) : (
            <ul className="divide-y divide-linha">
              {entregas.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                  <span>
                    <span className="block font-medium">{e.titulo}</span>
                    <span className="text-[13px] text-cinza">gravado em {br(e.data)}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Selo tom={(e.entrega as string) < hoje() ? "erro" : "neutro"}>{prazo(e.entrega as string)}</Selo>
                    <Botao pequeno onClick={() => mudar("eventos", e.id, { entregue: true })}>
                      Entregue
                    </Botao>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      </div>

      <Gaveta
        aberta={!!ed}
        titulo={ed?.titulo || "Compromisso"}
        sub={ed && `${br(ed.data)}, ${ed.inicio} às ${ed.fim}`}
        onFecha={() => setEd(null)}
        rodape={
          ed && (
            <>
              {dados.eventos.some((e) => e.id === ed.id) && (
                <Botao tom="texto" onClick={() => setApaga(true)}>
                  Excluir
                </Botao>
              )}
              <a className={estiloBotao()} href={linkGoogle(ed)} target="_blank" rel="noreferrer">
                <CalendarPlus size={16} /> Google Agenda
              </a>
              <a
                className={estiloBotao()}
                href={linkWhats("", `${ed.titulo}\n${br(ed.data)}, ${ed.inicio} às ${ed.fim}${ed.local ? `\n${ed.local}` : ""}${ed.quem ? `\nCom: ${ed.quem}` : ""}`)}
                target="_blank"
                rel="noreferrer"
              >
                Lembrar no WhatsApp
              </a>
              <Botao
                tom="cheio"
                disabled={!ed.titulo.trim() || min(ed.fim) <= min(ed.inicio)}
                onClick={() => {
                  const e = ed.agenda === "videomaker" && !ed.entrega ? { ...ed, entrega: prazoEntrega(ed.data, regras.videoEntregaDias) } : ed;
                  salvar("eventos", e);
                  avisar(e.entrega && e.agenda === "videomaker" ? `Salvo. Entrega até ${br(e.entrega)}` : "Compromisso salvo");
                  setEd(null);
                }}
              >
                {conf.length ? "Salvar mesmo assim" : "Salvar"}
              </Botao>
            </>
          )
        }
      >
        {ed && (
          <div className="space-y-5">
            {conf.length > 0 && (
              <Nota tom="alerta">
                {conf.map((c) => (
                  <p key={c}>{c}</p>
                ))}
              </Nota>
            )}
            <Formulario grupos={grupos} valor={ed} onMuda={setEd} />
          </div>
        )}
      </Gaveta>
      <Confirmar
        aberta={apaga}
        titulo="Excluir compromisso?"
        texto={ed?.semanal ? "Este é semanal: sai de todas as semanas." : "Sai da agenda do painel. No Google, se já foi enviado, continua."}
        sim="Excluir"
        onNao={() => setApaga(false)}
        onSim={() => {
          if (ed) remover("eventos", ed.id);
          setApaga(false);
          setEd(null);
        }}
      />
    </>
  );
}
