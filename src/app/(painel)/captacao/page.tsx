"use client";
import { ImagePlus, Plus, Printer, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CAMPOS_PESSOA, Formulario, type GrupoDef } from "@/componentes/formulario";
import { Abas, Botao, Cabecalho, Confirmar, Copiar, cx, estiloBotao, Fita, Gaveta, Itens, Nota, Selo, Vazio, Quadro } from "@/componentes/ui";
import { useFotos, useParam } from "@/componentes/uso";
import { apagar, guardar, reduzirFoto, conferir } from "@/lib/arquivos";
import { certidoesPadrao } from "@/lib/certidoes";
import { ETAPAS_CAPTACAO, faltando, TIPOS_IMOVEL } from "@/lib/comercial";
import { hoje, prazo } from "@/lib/datas";
import { brl, novoId } from "@/lib/formato";
import { pode, quemPode } from "@/lib/regras";
import { acao, useSarto } from "@/lib/store";
import type { Captacao, Parte } from "@/lib/tipos";

const nova = (): Captacao => ({
  id: novoId(),
  codigo: "",
  tipo: "condominio",
  finalidade: "venda",
  titulo: "",
  proprietario: { nome: "", doc: "", tel: "", email: "" },
  cep: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "Anápolis",
  condominioNome: "",
  valor: 0,
  valorCondominio: 0,
  iptu: 0,
  area: 0,
  terreno: 0,
  quartos: 0,
  suites: 0,
  banheiros: 0,
  vagas: 0,
  matricula: "",
  descricao: "",
  diferenciais: "",
  exclusividade: "",
  etapa: "visita",
  checklist: {},
  fotos: [],
  corretorId: "",
  origem: "Indicação",
  criadoEm: hoje(),
});

const casa = (v: Record<string, unknown>) => v.tipo !== "lote" && v.tipo !== "comercial";

function Fotos({ c, onMuda }: { c: Captacao; onMuda: (c: Captacao) => void }) {
  const { regras, perfil } = useSarto();
  const urls = useFotos(c.fotos);
  const [ocupado, setOcupado] = useState(false);
  const min = regras.fotosMin[c.tipo];
  const incluir = async (fs: FileList | null) => {
    if (!fs?.length) return;
    setOcupado(true);
    const novas: string[] = [];
    let ruins = 0;
    let zap = 0;
    for (const f of Array.from(fs)) {
      try {
        if (/whatsapp/i.test(f.name)) zap++;
        if (await conferir(f, ["jpeg", "png", "webp", "heic"])) throw new Error("não é foto");
        novas.push(await guardar(await reduzirFoto(f), "foto"));
      } catch {
        ruins++;
      }
    }
    onMuda({ ...c, fotos: [...c.fotos, ...novas], fotosAprovadas: undefined });
    setOcupado(false);
    if (ruins) acao().avisar(`${ruins} arquivo(s) não são imagem`, "erro");
    else if (zap) acao().avisar(`${zap} foto(s) vieram do WhatsApp. Peça o arquivo original para não perder qualidade.`, "erro");
  };
  return (
    <div>
      <Fita parte={Math.min(c.fotos.length, min)} total={min} rotulo={`Mínimo para ${TIPOS_IMOVEL[c.tipo].toLowerCase()}`} />
      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {c.fotos.map((k) => (
          <div key={k} className="relative aspect-square bg-linho">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {urls[k] && <img src={urls[k]} alt="" className="size-full object-cover" />}
            <button
              type="button"
              aria-label="Remover foto"
              className="absolute right-1 top-1 grid size-7 place-items-center bg-carvao/85 text-papel"
              onClick={() => {
                apagar(k);
                onMuda({ ...c, fotos: c.fotos.filter((x) => x !== k), fotosAprovadas: undefined });
              }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
        <label
          className={cx(
            "grid aspect-square cursor-pointer place-items-center border border-dashed border-nevoa text-center text-[13px] text-cinza hover:border-carvao",
            ocupado && "opacity-50",
          )}
        >
          <input type="file" accept="image/*" multiple className="sr-only" disabled={ocupado} onChange={(e) => incluir(e.target.files)} />
          <span>
            <ImagePlus className="mx-auto mb-1" size={20} />
            {ocupado ? "Salvando…" : "Incluir fotos"}
          </span>
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {c.fotosAprovadas ? (
          <Selo tom="ok">Aprovadas por {c.fotosAprovadas.por}</Selo>
        ) : (
          <Botao
            tom="cheio"
            pequeno
            disabled={c.fotos.length < min || !pode(perfil, "fotos")}
            title={!pode(perfil, "fotos") ? `Quem aprova: ${quemPode("fotos")}` : undefined}
            onClick={() => {
              const f = acao().feito();
              onMuda({ ...c, fotosAprovadas: f, checklist: { ...c.checklist, fotos: c.checklist.fotos ?? f, fotos_ok: f } });
              acao().registrar("Captação", `aprovou as fotos de ${c.titulo || c.bairro}`);
            }}
          >
            Aprovar fotos
          </Botao>
        )}
        {c.fotos.length < min && <span className="text-[13px] text-cinza">Faltam {min - c.fotos.length} para liberar a aprovação.</span>}
      </div>
      <p className="mt-3 text-[12px] text-cinza">As fotos ficam só neste navegador, em tamanho reduzido. O original segue com o videomaker.</p>
    </div>
  );
}

export default function Pagina() {
  const { dados } = useSarto();
  const { salvar, remover, avisar, registrar } = acao();
  const p = useParam("c");
  const [ed, setEd] = useState<Captacao | null>(() => dados.captacoes.find((c) => c.id === p) ?? null);
  const [aba, setAba] = useState<"andamento" | "dados" | "fotos">("andamento");
  const [apaga, setApaga] = useState(false);
  const [cep, setCep] = useState("");

  const abrir = (c: Captacao, a: typeof aba = "andamento") => {
    setEd(c);
    setAba(a);
  };
  const existe = ed && dados.captacoes.some((c) => c.id === ed.id);
  const falta = ed ? faltando(ed) : [];
  const etapa = ed && ETAPAS_CAPTACAO.findIndex((e) => e.id === ed.etapa);

  const grupos: GrupoDef[] = [
    {
      grupo: "Imóvel",
      campos: [
        { k: "titulo", nome: "Título", col: 6, dica: "Ex.: Casa térrea com piscina" },
        { k: "tipo", nome: "Tipo", tipo: "opcoes", col: 2, opcoes: Object.entries(TIPOS_IMOVEL).map(([id, nome]) => ({ id, nome })) },
        {
          k: "finalidade",
          nome: "Finalidade",
          tipo: "opcoes",
          col: 2,
          opcoes: [
            { id: "venda", nome: "Venda" },
            { id: "locacao", nome: "Locação" },
          ],
        },
        {
          k: "exclusividade",
          nome: "Exclusividade",
          tipo: "opcoes",
          col: 2,
          opcoes: [
            { id: "", nome: "Definir" },
            { id: "sim", nome: "Com exclusividade" },
            { id: "nao", nome: "Sem exclusividade" },
          ],
        },
        { k: "valor", nome: "Valor", tipo: "dinheiro", col: 2 },
        { k: "valorCondominio", nome: "Condomínio por mês", tipo: "dinheiro", col: 2, se: (v) => v.tipo === "condominio" || v.tipo === "apartamento" || v.tipo === "comercial" },
        { k: "iptu", nome: "IPTU por ano", tipo: "dinheiro", col: 2 },
        { k: "area", nome: "Área construída (m²)", tipo: "numero", col: 2, se: (v) => v.tipo !== "lote" },
        { k: "terreno", nome: "Terreno (m²)", tipo: "numero", col: 2, se: (v) => v.tipo !== "apartamento" },
        { k: "quartos", nome: "Quartos", tipo: "numero", col: 1, se: casa },
        { k: "suites", nome: "Suítes", tipo: "numero", col: 1, se: casa },
        { k: "banheiros", nome: "Banheiros", tipo: "numero", col: 1, se: (v) => v.tipo !== "lote" },
        { k: "vagas", nome: "Vagas", tipo: "numero", col: 1, se: (v) => v.tipo !== "lote" },
        { k: "matricula", nome: "Matrícula", col: 2 },
      ],
    },
    { grupo: "Proprietário", campos: CAMPOS_PESSOA("proprietario") },
    {
      grupo: "Endereço",
      campos: [
        { k: "condominioNome", nome: "Condomínio ou edifício", col: 6, se: (v) => v.tipo === "condominio" || v.tipo === "apartamento" },
        { k: "endereco", nome: "Rua", col: 4 },
        { k: "numero", nome: "Número", col: 1 },
        { k: "complemento", nome: "Compl.", col: 1 },
        { k: "bairro", nome: "Bairro", col: 3 },
        { k: "cidade", nome: "Cidade", col: 3 },
      ],
    },
    {
      grupo: "Texto do PDF e do anúncio",
      campos: [
        { k: "descricao", nome: "Descrição", tipo: "area", col: 6, linhas: 5, dica: "Escreva como será lido. Mínimo de 80 letras; nos portais, o ideal é passar de 600." },
        { k: "diferenciais", nome: "Diferenciais, um por linha", tipo: "area", col: 6, linhas: 4 },
      ],
    },
    {
      grupo: "Interno",
      campos: [
        {
          k: "corretorId",
          nome: "Corretor captador",
          tipo: "opcoes",
          col: 2,
          opcoes: [{ id: "", nome: "Sem corretor" }, ...dados.corretores.map((c) => ({ id: c.id, nome: c.nome }))],
        },
        { k: "origem", nome: "Origem", tipo: "opcoes", col: 2, opcoes: ["Indicação", "Varredura", "Cliente da casa", "Placa", "Site", "Instagram", "Outro"] },
        { k: "codigo", nome: "Código no JetImob", col: 2 },
      ],
    },
  ];

  const buscarCep = async () => {
    const d = cep.replace(/\D/g, "");
    if (d.length !== 8 || !ed) return avisar("Digite os 8 números do CEP", "erro");
    try {
      const j = await (await fetch(`https://viacep.com.br/ws/${d}/json/`)).json();
      if (j.erro) return avisar("CEP não encontrado", "erro");
      setEd({ ...ed, cep: d, endereco: j.logradouro || ed.endereco, bairro: j.bairro || ed.bairro, cidade: j.localidade || ed.cidade });
    } catch {
      avisar("O serviço de CEP não respondeu. Preencha na mão.", "erro");
    }
  };

  const abrirDossie = () => {
    if (!ed) return;
    const ja = dados.dossies.find((d) => d.origem === "captacao" && d.origemId === ed.id);
    if (ja) return window.location.assign(`/certidoes?d=${ja.id}`);
    const base: Parte = { id: "", papel: "", tipo: "PF", nome: "", doc: "", nascimento: "", mae: "", matricula: "", inscricao: "" };
    const dono: Parte = { ...base, id: novoId(), papel: "Proprietário", tipo: ed.proprietario.doc.length > 11 ? "PJ" : "PF", nome: ed.proprietario.nome, doc: ed.proprietario.doc };
    const im: Parte = { ...base, id: novoId(), papel: "Imóvel", tipo: "IMOVEL", nome: ed.titulo || ed.endereco, matricula: ed.matricula };
    const id = novoId();
    salvar("captacoes", { ...ed, checklist: { ...ed.checklist, certidoes: acao().feito() } });
    salvar("dossies", {
      id,
      titulo: ed.titulo || ed.bairro,
      origem: "captacao",
      origemId: ed.id,
      partes: [dono, im],
      parecer: "",
      risco: "a_analisar",
      criadoEm: hoje(),
      certidoes: [dono, im].flatMap((x) => certidoesPadrao(x.tipo, !!ed.condominioNome).map((tipo) => ({ id: novoId(), parteId: x.id, tipo, status: "pendente" as const }))),
    });
    registrar("Captação", `abriu dossiê de ${ed.titulo || ed.bairro}`);
    window.location.assign(`/certidoes?d=${id}`);
  };

  return (
    <>
      <Cabecalho area="COMERCIAL CAPTAÇÃO" titulo="Captação" texto="Do primeiro contato à publicação, com o checklist do manual de captação.">
        <Botao tom="cheio" onClick={() => abrir(nova(), "dados")}>
          <Plus size={16} /> Nova captação
        </Botao>
      </Cabecalho>

      {dados.captacoes.length === 0 && <Vazio acao={<Botao onClick={() => abrir(nova(), "dados")}>Cadastrar imóvel</Botao>}>Nenhum imóvel em captação.</Vazio>}
      <Quadro nome="Etapas da captação">
        <div className="grid grid-cols-1 md:min-w-[980px] md:grid-cols-6 gap-3">
          {ETAPAS_CAPTACAO.map((e) => {
            const cs = dados.captacoes.filter((c) => c.etapa === e.id);
            return (
              <section key={e.id}>
                <h2 className="mb-2 border-b border-carvao pb-1.5 text-[13px] font-semibold">
                  {e.nome} <span className="font-normal text-cinza">{cs.length || ""}</span>
                </h2>
                <div className="space-y-2">
                  {cs.map((c) => {
                    const f = faltando(c).length;
                    return (
                      <button key={c.id} type="button" onClick={() => abrir(c)} className="block w-full bg-linho p-3 text-left hover:bg-linha">
                        <span className="block font-medium leading-snug">{c.titulo || c.bairro || "Sem título"}</span>
                        <span className="mt-0.5 block text-[12px] text-cinza">
                          {TIPOS_IMOVEL[c.tipo]}, {c.bairro || "sem bairro"}
                        </span>
                        <span className="mt-1.5 block tabular-nums">{c.valor ? brl(c.valor, false) : "sem valor"}</span>
                        <span className="mt-2 flex flex-wrap gap-1">
                          {c.exclusividade === "sim" && <Selo tom="forte">Exclusivo</Selo>}
                          {f > 0 && e.id !== "publicado" && <Selo tom="alerta">{f} a preencher</Selo>}
                        </span>
                        <span className="mt-1.5 block text-[12px] text-cinza">{prazo(c.criadoEm)}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </Quadro>

      <Gaveta
        larga
        aberta={!!ed}
        titulo={ed?.titulo || "Nova captação"}
        sub={ed && [TIPOS_IMOVEL[ed.tipo], ed.bairro, ed.proprietario.nome].filter(Boolean).join(", ")}
        onFecha={() => setEd(null)}
        rodape={
          ed && (
            <>
              {existe && (
                <Botao tom="texto" onClick={() => setApaga(true)}>
                  Excluir
                </Botao>
              )}
              {existe && (
                <Link className={estiloBotao()} href={`/imprimir?tipo=imovel&id=${ed.id}`} target="_blank" aria-disabled={falta.length > 0}>
                  <Printer size={16} /> PDF padrão
                </Link>
              )}
              <Botao
                tom="cheio"
                onClick={() => {
                  salvar("captacoes", ed);
                  avisar("Captação salva");
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
          <>
            <Abas
              atual={aba}
              onMuda={setAba}
              itens={[
                { id: "andamento", nome: "Andamento" },
                { id: "dados", nome: "Dados do imóvel", n: falta.length || undefined },
                { id: "fotos", nome: "Fotos", n: ed.fotos.length },
              ]}
            />
            {aba === "andamento" && (
              <div className="space-y-6">
                <Fita parte={Object.keys(ed.checklist).length} total={ETAPAS_CAPTACAO.reduce((a, e) => a + e.itens.length, 0)} rotulo="Checklist" />
                {falta.length > 0 && <Nota tom="alerta">Para o PDF padrão falta: {falta.join(", ")}.</Nota>}
                {ETAPAS_CAPTACAO.map((e, i) => (
                  <div key={e.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className={cx("text-[13px] font-semibold uppercase tracking-wide", i !== etapa && "text-cinza")}>
                        {i + 1}. {e.nome}
                      </h3>
                      {e.id === "juridico" && (
                        <Botao pequeno onClick={abrirDossie} disabled={!ed.proprietario.nome}>
                          Abrir dossiê de certidões
                        </Botao>
                      )}
                      {e.id === "autorizacao" && (
                        <Copiar
                          texto={`Olá, ${ed.proprietario.nome.split(" ")[0]}. Para a Sarto anunciar o seu imóvel, preciso da autorização assinada${ed.exclusividade === "sim" ? " com exclusividade" : ""}. Vou te enviar o link.`}
                        >
                          Copiar mensagem
                        </Copiar>
                      )}
                    </div>
                    <Itens
                      itens={e.itens}
                      check={ed.checklist}
                      onMuda={(c) => {
                        // a etapa anda sozinha até a primeira com item aberto
                        const prox = ETAPAS_CAPTACAO.find((x) => x.itens.some((it) => !c[it.id]));
                        setEd({ ...ed, checklist: c, etapa: prox?.id ?? "publicado" });
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
            {aba === "dados" && (
              <>
                <div className="mb-6 flex items-end gap-2">
                  <label className="text-[12px] font-medium">
                    Preencher pelo CEP
                    <input
                      className="campo mt-1 w-40"
                      inputMode="numeric"
                      value={cep}
                      onChange={(e) => setCep(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && buscarCep()}
                    />
                  </label>
                  <Botao onClick={buscarCep}>Buscar</Botao>
                </div>
                <Formulario grupos={grupos} valor={ed} onMuda={setEd} />
              </>
            )}
            {aba === "fotos" && <Fotos c={ed} onMuda={setEd} />}
          </>
        )}
      </Gaveta>
      <Confirmar
        aberta={apaga}
        titulo="Excluir esta captação?"
        texto="O cadastro e as fotos guardadas neste navegador serão apagados."
        sim="Excluir captação"
        onNao={() => setApaga(false)}
        onSim={() => {
          if (ed) {
            for (const f of ed.fotos) apagar(f);
            remover("captacoes", ed.id);
          }
          setApaga(false);
          setEd(null);
        }}
      />
    </>
  );
}
