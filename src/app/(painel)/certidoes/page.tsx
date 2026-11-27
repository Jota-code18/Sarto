"use client";
import { ExternalLink, FileUp, Plus, Printer, Trash2 } from "lucide-react";
import { useState } from "react";
import { Formulario, type GrupoDef } from "@/componentes/formulario";
import { Botao, Cabecalho, Cartao, Confirmar, Copiar, cx, estiloBotao, Fita, Gaveta, Nota, Numero, Numeros, Selo, type Tom, Vazio } from "@/componentes/ui";
import { useParam } from "@/componentes/uso";
import { abrir, apagar, conferir, guardar, textoDoPdf } from "@/lib/arquivos";
import {
  certidoesPadrao,
  conferirLeitura,
  diasValidade,
  type Leitura,
  lerCertidao,
  NOME_RESULTADO,
  resumoDossie,
  type SituacaoCert,
  situacaoCert,
  TIPOS_CERT,
  tipoCert,
} from "@/lib/certidoes";
import { br, brHora, hoje, maisDias, prazo } from "@/lib/datas";
import { mascaraDoc, novoId, soDigitos } from "@/lib/formato";
import { pode, quemPode } from "@/lib/regras";
import { acao, useSarto } from "@/lib/store";
import type { Certidao, Checklist, Dossie, Parte } from "@/lib/tipos";

const SIT: Record<SituacaoCert, { nome: string; tom: Tom }> = {
  pendente: { nome: "A emitir", tom: "neutro" },
  solicitada: { nome: "Solicitada", tom: "alerta" },
  valida: { nome: "Válida", tom: "ok" },
  vencendo: { nome: "Vencendo", tom: "alerta" },
  vencida: { nome: "Vencida", tom: "erro" },
  dispensada: { nome: "Dispensada", tom: "neutro" },
};
const RISCO: Record<Dossie["risco"], { nome: string; tom: Tom }> = {
  a_analisar: { nome: "A analisar", tom: "alerta" },
  liberado: { nome: "Liberado", tom: "ok" },
  com_ressalva: { nome: "Com ressalva", tom: "alerta" },
  travado: { nome: "Travado", tom: "erro" },
};
const PAPEIS = ["Vendedor", "Cônjuge do vendedor", "Vendedor (empresa)", "Sócio da empresa", "Comprador", "Proprietário", "Inquilino", "Fiador", "Imóvel"];

const partePara = (papel: string): Parte => ({
  id: novoId(),
  papel,
  tipo: papel === "Imóvel" ? "IMOVEL" : papel === "Vendedor (empresa)" ? "PJ" : "PF",
  nome: "",
  doc: "",
  nascimento: "",
  mae: "",
  matricula: "",
  inscricao: "",
});

const gParte: GrupoDef[] = [
  {
    grupo: "",
    campos: [
      { k: "papel", nome: "Papel", tipo: "opcoes", opcoes: PAPEIS, col: 3 },
      {
        k: "tipo",
        nome: "Tipo",
        tipo: "opcoes",
        col: 3,
        opcoes: [
          { id: "PF", nome: "Pessoa física" },
          { id: "PJ", nome: "Empresa" },
          { id: "IMOVEL", nome: "Imóvel" },
        ],
      },
      { k: "nome", nome: "Nome ou descrição", col: 6, obrigatorio: true },
      { k: "doc", nome: "CPF ou CNPJ", tipo: "doc", col: 3, se: (v) => v.tipo !== "IMOVEL" },
      { k: "nascimento", nome: "Nascimento", tipo: "data", col: 3, se: (v) => v.tipo === "PF", dica: "Pedido pela Receita e pelo TJGO" },
      { k: "mae", nome: "Nome da mãe", col: 6, se: (v) => v.tipo === "PF", dica: "Pedido pelo TJGO" },
      { k: "matricula", nome: "Matrícula", col: 3, se: (v) => v.tipo === "IMOVEL" },
      { k: "inscricao", nome: "Inscrição municipal", col: 3, se: (v) => v.tipo === "IMOVEL" },
    ],
  },
];

const ROTULO_PEDE: Record<string, string> = { doc: "CPF/CNPJ", nome: "Nome", nascimento: "Nascimento", mae: "Nome da mãe", matricula: "Matrícula", inscricao: "Inscrição" };
const valorPede = (p: Parte, k: string) =>
  k === "doc"
    ? soDigitos(p.doc)
    : k === "nascimento"
      ? p.nascimento
        ? br(p.nascimento)
        : ""
      : k === "nome"
        ? p.nome
        : k === "mae"
          ? p.mae
          : k === "matricula"
            ? p.matricula
            : p.inscricao;

/** SEFAZ-GO: formulário público sem captcha, enviado pelo próprio usuário em nova aba */
function SefazDireto({ p }: { p: Parte }) {
  const d = soDigitos(p.doc);
  const pj = d.length === 14;
  return (
    <form method="post" action="https://www.sefaz.go.gov.br/certidao/emissao/certidao.asp" target="_blank" rel="noreferrer">
      <input type="hidden" name="Certidao.Tipo" value="01" />
      <input type="hidden" name="Certidao.TipoDocumento" value={pj ? "2" : "1"} />
      <input type="hidden" name="Certidao.NumeroDocumento" value={d} />
      <input type="hidden" name={pj ? "Certidao.NumeroDocumentoCNPJ" : "Certidao.NumeroDocumentoCPF"} value={mascaraDoc(d)} />
      <input type="hidden" name="Certidao.Espolio" value="N" />
      <button type="submit" className={estiloBotao("cheio", true)} disabled={!d}>
        Abrir preenchida
      </button>
    </form>
  );
}

function FichaCert({ ds, c, onFecha }: { ds: Dossie; c: Certidao; onFecha: () => void }) {
  const { regras } = useSarto();
  const { salvar, avisar, registrar, feito } = acao();
  const p = ds.partes.find((x) => x.id === c.parteId) as Parte;
  const t = tipoCert(c.tipo);
  const [f, setF] = useState<Certidao>(c);
  const [lendo, setLendo] = useState(false);
  const [l, setL] = useState<Leitura | null>(null);
  const [visto, setVisto] = useState(false);
  const alertas = l ? conferirLeitura(l, f, p) : (f.alertas ?? []);

  const gravar = (n: Certidao) => salvar("dossies", { ...ds, certidoes: ds.certidoes.map((x) => (x.id === n.id ? n : x)) });

  const ler = async (arq?: File) => {
    if (!arq) return;
    const motivo = await conferir(arq, ["pdf"]);
    if (motivo) return avisar(motivo, "erro");
    setLendo(true);
    setVisto(false);
    try {
      const chave = await guardar(arq, "cert");
      let leitura: Leitura = lerCertidao("");
      try {
        leitura = lerCertidao(await textoDoPdf(arq));
      } catch {
        avisar("Não consegui ler o PDF. Preencha na mão.", "erro");
      }
      setL(leitura);
      const emitidaEm = leitura.emitidaEm ?? f.emitidaEm;
      setF({
        ...f,
        status: "emitida",
        arquivo: chave,
        arquivoNome: arq.name,
        emitidaEm,
        validade: leitura.validade ?? (emitidaEm ? maisDias(emitidaEm, diasValidade(f.tipo, regras)) : f.validade),
        resultado: leitura.resultado ?? f.resultado,
        numero: leitura.numero ?? f.numero,
        conferida: undefined,
      });
    } finally {
      setLendo(false);
    }
  };

  const completo = !!f.emitidaEm && !!f.resultado;
  return (
    <Gaveta
      aberta
      titulo={t?.nome ?? c.tipo}
      sub={`${t?.orgao}. ${p.papel}: ${p.nome}`}
      onFecha={onFecha}
      rodape={
        <>
          <Botao
            tom="texto"
            onClick={() => {
              gravar({ ...f, status: f.status === "dispensada" ? "pendente" : "dispensada" });
              onFecha();
            }}
          >
            {f.status === "dispensada" ? "Voltar a exigir" : "Dispensar"}
          </Botao>
          <Botao
            onClick={() => {
              gravar({ ...f, alertas });
              onFecha();
            }}
          >
            Salvar sem conferir
          </Botao>
          <Botao
            tom="cheio"
            disabled={!completo || !visto}
            title={!completo ? "Informe emissão e resultado" : !visto ? "Marque que abriu e leu o documento" : undefined}
            onClick={() => {
              gravar({ ...f, status: "emitida", alertas, conferida: feito() });
              registrar("Certidões", `conferiu ${t?.nome} de ${p.nome}: ${f.resultado && NOME_RESULTADO[f.resultado].toLowerCase()}`);
              avisar("Certidão conferida");
              onFecha();
            }}
          >
            Conferida
          </Botao>
        </>
      }
    >
      <div className="space-y-6">
        <section className="rounded-[var(--radius-cartao)] bg-linho p-4">
          <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide">1. Emitir</h3>
          <p className="text-[13px]">{t?.como}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {t?.pede.map((k) => {
              const v = valorPede(p, k);
              return (
                <Copiar key={k} texto={v}>
                  {ROTULO_PEDE[k]}: {v ? (v.length > 22 ? `${v.slice(0, 20)}…` : v) : "falta"}
                </Copiar>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {t?.direto && <SefazDireto p={p} />}
            {t?.url && (
              <a
                className={estiloBotao(t.direto ? "linha" : "cheio", true)}
                href={t.url}
                target="_blank"
                rel="noreferrer"
                onClick={() => f.status === "pendente" && setF({ ...f, status: "solicitada" })}
              >
                <ExternalLink size={14} /> Abrir {t.orgao}
              </a>
            )}
            <Selo tom={t?.custo === "paga" ? "alerta" : "neutro"}>{t?.custo === "paga" ? "Paga" : "Gratuita"}</Selo>
          </div>
          {t?.pede.some((k) => !valorPede(p, k)) && <p className="mt-2 text-[13px] text-alerta">Falta dado desta parte. Complete em Editar parte.</p>}
        </section>

        <section>
          <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide">2. Anexar o PDF</h3>
          <label className={cx("flex cursor-pointer items-center justify-center gap-2 border border-dashed border-nevoa px-4 py-5 hover:border-carvao", lendo && "opacity-50")}>
            <FileUp size={18} />
            {lendo ? "Lendo…" : f.arquivoNome ? `Trocar ${f.arquivoNome}` : "Escolher PDF da certidão"}
            <input type="file" accept="application/pdf" className="sr-only" disabled={lendo} onChange={(e) => ler(e.target.files?.[0])} />
          </label>
          <p className="mt-1.5 text-[12px] text-cinza">A leitura é feita neste navegador, por regra fixa, sem IA e sem enviar o documento para fora.</p>
          {f.arquivo && (
            <Botao className="mt-2" pequeno onClick={async () => !(await abrir(f.arquivo as string)) && avisar("O arquivo está em outro navegador", "erro")}>
              Abrir PDF
            </Botao>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide">3. Conferir</h3>
          {l && (
            <p className="mb-3 text-[13px] text-cinza">
              Leitura {l.confianca === "alta" ? "completa" : l.confianca === "media" ? "parcial" : "insuficiente"}: {l.tipo ? tipoCert(l.tipo)?.nome : "órgão não reconhecido"}
              {l.docs.length > 0 && `, documento ${l.docs.map(mascaraDoc).join(", ")}`}.
            </p>
          )}
          {alertas.length > 0 && (
            <div className="mb-4">
              <Nota tom="erro">
                {alertas.map((a) => (
                  <p key={a}>{a}</p>
                ))}
              </Nota>
            </div>
          )}
          <Formulario
            grupos={[
              {
                grupo: "",
                campos: [
                  {
                    k: "resultado",
                    nome: "Resultado",
                    tipo: "opcoes",
                    col: 6,
                    opcoes: [{ id: "", nome: "Escolha" }, ...Object.entries(NOME_RESULTADO).map(([id, nome]) => ({ id, nome }))],
                  },
                  { k: "emitidaEm", nome: "Emitida em", tipo: "data", col: 2 },
                  { k: "validade", nome: "Válida até", tipo: "data", col: 2 },
                  { k: "numero", nome: "Número ou código", col: 2 },
                  { k: "obs", nome: "Observação", tipo: "area", col: 6, linhas: 2 },
                ],
              },
            ]}
            valor={f}
            onMuda={(n) => {
              const x = n as Certidao;
              // data de emissão nova sem validade: calcula pela regra
              if (x.emitidaEm && x.emitidaEm !== f.emitidaEm && !x.validade) x.validade = maisDias(x.emitidaEm, diasValidade(x.tipo, regras));
              setF({ ...x, status: x.emitidaEm && x.resultado ? "emitida" : x.status, conferida: undefined });
            }}
          />
          <label className="mt-4 flex cursor-pointer items-center gap-3">
            <input type="checkbox" className="size-[18px] accent-carvao" checked={visto} onChange={(e) => setVisto(e.target.checked)} />
            Abri o documento e conferi nome, número e resultado.
          </label>
          {f.conferida && (
            <p className="mt-2 text-[13px] text-cinza">
              Última conferência: {f.conferida.por}, {brHora(f.conferida.em)}
            </p>
          )}
        </section>
      </div>
    </Gaveta>
  );
}

function VerDossie({ ds, onFecha }: { ds: Dossie; onFecha: () => void }) {
  const { perfil } = useSarto();
  const { salvar, remover, avisar, registrar, feito, mudar } = acao();
  const vendas = useSarto((s) => s.dados.vendas);
  const [ce, setCe] = useState<string | null>(null);
  const [pt, setPt] = useState<Parte | null>(null);
  const [apaga, setApaga] = useState(false);
  const [parecer, setParecer] = useState(ds.parecer);
  const r = resumoDossie(ds.certidoes);
  const c = ds.certidoes.find((x) => x.id === ce);
  const pronto = r.pendentes === 0 && r.vencidas === 0 && r.semConferencia === 0;

  const salvarParte = () => {
    if (!pt) return;
    const antes = ds.partes.find((x) => x.id === pt.id);
    const partes = antes ? ds.partes.map((x) => (x.id === pt.id ? pt : x)) : [...ds.partes, pt];
    let certidoes = ds.certidoes;
    if (!antes || antes.tipo !== pt.tipo) {
      // trocou de PF para PJ: sai o que não se aplica e ainda não foi emitido
      certidoes = certidoes.filter((x) => x.parteId !== pt.id || x.status === "emitida" || tipoCert(x.tipo)?.para.includes(pt.tipo));
      const tem = new Set(certidoes.filter((x) => x.parteId === pt.id).map((x) => x.tipo));
      certidoes = [
        ...certidoes,
        ...certidoesPadrao(pt.tipo, true)
          .filter((tipo) => !tem.has(tipo))
          .map((tipo): Certidao => ({ id: novoId(), parteId: pt.id, tipo, status: "pendente" })),
      ];
    }
    salvar("dossies", { ...ds, partes, certidoes });
    setPt(null);
  };

  const decidir = (risco: Dossie["risco"]) => {
    const f = feito();
    salvar("dossies", { ...ds, parecer, risco, revisao: f });
    const v = ds.origem === "venda" ? vendas.find((x) => x.id === ds.origemId) : undefined;
    if (v && risco !== "a_analisar") {
      const check: Checklist = { ...v.checklist, parecer: f };
      if (pronto) check.certidoes = f;
      mudar("vendas", v.id, { checklist: check });
    }
    registrar("Certidões", `deu parecer "${RISCO[risco].nome.toLowerCase()}" em ${ds.titulo}`);
    avisar(`Parecer: ${RISCO[risco].nome.toLowerCase()}`);
  };

  return (
    <>
      <Gaveta
        larga
        aberta
        titulo={ds.titulo}
        sub={`${r.prontas} de ${r.total} certidões em dia`}
        onFecha={onFecha}
        rodape={
          <>
            <Botao tom="texto" onClick={() => setApaga(true)}>
              Excluir
            </Botao>
            <a className={estiloBotao()} href={`/imprimir?tipo=dossie&id=${ds.id}`} target="_blank" rel="noreferrer">
              <Printer size={16} /> Dossiê para a Gabi
            </a>
          </>
        }
      >
        <div className="space-y-7">
          <Fita parte={r.prontas} total={r.total} rotulo="Certidões em dia" />
          {ds.partes.map((p) => (
            <section key={p.id}>
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <h3>
                  <span className="text-[12px] uppercase text-cinza">{p.papel}</span>
                  <span className="block text-[16px] font-semibold">{p.nome || "Sem nome"}</span>
                  <span className="text-[13px] text-cinza">
                    {p.tipo === "IMOVEL"
                      ? [p.matricula && `matrícula ${p.matricula}`, p.inscricao && `inscrição ${p.inscricao}`].filter(Boolean).join(", ")
                      : mascaraDoc(p.doc) || "sem documento"}
                  </span>
                </h3>
                <span className="flex gap-2">
                  <Botao pequeno onClick={() => setPt(p)}>
                    Editar parte
                  </Botao>
                  <button
                    type="button"
                    aria-label={`Remover ${p.nome}`}
                    className="grid size-9 place-items-center hover:bg-linho"
                    onClick={() => salvar("dossies", { ...ds, partes: ds.partes.filter((x) => x.id !== p.id), certidoes: ds.certidoes.filter((x) => x.parteId !== p.id) })}
                  >
                    <Trash2 size={15} />
                  </button>
                </span>
              </div>
              <ul className="divide-y divide-linha border-y border-linha">
                {ds.certidoes
                  .filter((x) => x.parteId === p.id)
                  .map((x) => {
                    const s = situacaoCert(x);
                    const t = tipoCert(x.tipo);
                    return (
                      <li key={x.id}>
                        <button
                          type="button"
                          onClick={() => setCe(x.id)}
                          className={cx("flex w-full flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-left hover:bg-linho", s === "dispensada" && "opacity-50")}
                        >
                          <span className="min-w-52 flex-1">
                            <span className="block font-medium">{t?.nome}</span>
                            <span className="block text-[13px] text-cinza">{t?.orgao}</span>
                          </span>
                          {x.resultado && (
                            <Selo tom={x.resultado === "positiva" ? "erro" : x.resultado === "positiva_efeito_negativa" ? "alerta" : "ok"}>{NOME_RESULTADO[x.resultado]}</Selo>
                          )}
                          {x.status === "emitida" && !x.conferida && <Selo tom="alerta">Sem conferência</Selo>}
                          <span className="flex w-full items-center gap-2 sm:block sm:w-32 sm:text-right">
                            <Selo tom={SIT[s].tom}>{SIT[s].nome}</Selo>
                            {x.validade && x.status === "emitida" && <span className="text-[12px] text-cinza sm:block">até {br(x.validade)}</span>}
                          </span>
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </section>
          ))}
          <div className="flex flex-wrap gap-2">
            {["Vendedor", "Cônjuge do vendedor", "Vendedor (empresa)", "Comprador", "Imóvel"].map((x) => (
              <Botao key={x} pequeno onClick={() => setPt(partePara(x))}>
                <Plus size={14} /> {x}
              </Botao>
            ))}
          </div>

          <section className="escuro bg-carvao p-5 text-papel">
            <h3 className="text-[13px] font-semibold uppercase tracking-wide">Parecer da Gabi</h3>
            <p className="mt-1 text-[13px] text-nevoa">O painel organiza e aponta. Quem decide é a Gabi.</p>
            <textarea
              className="campo mt-3 text-carvao"
              rows={4}
              value={parecer}
              onChange={(e) => setParecer(e.target.value)}
              placeholder="O que foi analisado, riscos e condições"
              disabled={!pode(perfil, "parecer")}
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {(["liberado", "com_ressalva", "travado"] as const).map((x) => (
                <button
                  key={x}
                  type="button"
                  disabled={!pode(perfil, "parecer") || (x === "liberado" && (!pronto || r.positivas > 0)) || (x !== "liberado" && !parecer.trim())}
                  title={
                    !pode(perfil, "parecer") ? `Quem decide: ${quemPode("parecer")}` : x === "liberado" && !pronto ? "Há certidão pendente, vencida ou sem conferência" : undefined
                  }
                  className={cx("min-h-9 border px-3 disabled:opacity-40", ds.risco === x ? "border-papel bg-papel text-carvao" : "border-nevoa hover:bg-tecido")}
                  onClick={() => decidir(x)}
                >
                  {RISCO[x].nome}
                </button>
              ))}
              {ds.revisao && (
                <span className="text-[13px] text-nevoa">
                  {RISCO[ds.risco].nome} por {ds.revisao.por}, {brHora(ds.revisao.em)}
                </span>
              )}
            </div>
            <p className="mt-2 text-[12px] text-nevoa">Liberar exige tudo em dia, conferido e sem positiva. Com ressalva e travado exigem texto.</p>
          </section>
        </div>
      </Gaveta>
      {c && <FichaCert key={c.id} ds={ds} c={c} onFecha={() => setCe(null)} />}
      <Gaveta
        aberta={!!pt}
        titulo={pt?.nome || pt?.papel || ""}
        onFecha={() => setPt(null)}
        rodape={
          <Botao tom="cheio" disabled={!pt?.nome} onClick={salvarParte}>
            Salvar parte
          </Botao>
        }
      >
        {pt && <Formulario grupos={gParte} valor={pt} onMuda={setPt} />}
      </Gaveta>
      <Confirmar
        aberta={apaga}
        titulo="Excluir este dossiê?"
        texto="As certidões e os PDFs guardados neste navegador serão apagados."
        sim="Excluir dossiê"
        onNao={() => setApaga(false)}
        onSim={() => {
          for (const x of ds.certidoes) if (x.arquivo) apagar(x.arquivo);
          remover("dossies", ds.id);
          onFecha();
        }}
      />
    </>
  );
}

export default function Certidoes() {
  const { dados } = useSarto();
  const { salvar, registrar } = acao();
  const pd = useParam("d");
  const [ab, setAb] = useState<string | null>(pd);
  const ds = dados.dossies.find((d) => d.id === ab);
  const todas = dados.dossies.flatMap((d) => d.certidoes.map((c) => ({ d, c, p: d.partes.find((x) => x.id === c.parteId) })));
  const sit = (s: SituacaoCert) => todas.filter((x) => situacaoCert(x.c) === s);
  const renovar = [...sit("vencida"), ...sit("vencendo")];

  const novo = () => {
    const id = novoId();
    const v = partePara("Vendedor");
    salvar("dossies", {
      id,
      titulo: "Novo dossiê",
      origem: "avulso",
      partes: [v],
      certidoes: certidoesPadrao("PF").map((tipo) => ({ id: novoId(), parteId: v.id, tipo, status: "pendente" })),
      parecer: "",
      risco: "a_analisar",
      criadoEm: hoje(),
    });
    registrar("Certidões", "abriu dossiê avulso");
    setAb(id);
  };

  return (
    <>
      <Cabecalho
        area="JURÍDICO CERTIDÕES"
        titulo="Certidões"
        texto="Um dossiê por negócio: abre o portal certo com os dados prontos, lê o PDF, controla validade e leva tudo para o parecer."
      >
        <Botao tom="cheio" onClick={novo}>
          <Plus size={16} /> Novo dossiê
        </Botao>
      </Cabecalho>
      <Numeros>
        <Numero valor={sit("pendente").length + sit("solicitada").length} nome="A emitir" />
        <Numero valor={todas.filter((x) => x.c.status === "emitida" && !x.c.conferida).length} nome="Sem conferência" />
        <Numero valor={todas.filter((x) => x.c.resultado === "positiva").length} nome="Positivas" />
        <Numero valor={renovar.length} nome="Vencidas ou vencendo" />
      </Numeros>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="min-w-0 space-y-3">
          {dados.dossies.length === 0 && (
            <Vazio acao={<Botao onClick={novo}>Abrir dossiê</Botao>}>Nenhum dossiê. Eles também nascem na captação, no pós-venda e na pré-análise de locação.</Vazio>
          )}
          {dados.dossies.map((d) => {
            const r = resumoDossie(d.certidoes);
            return (
              <button key={d.id} type="button" onClick={() => setAb(d.id)} className="rounded-[var(--radius-cartao)] block w-full bg-linho p-5 text-left hover:bg-linha">
                <span className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <span>
                    <span className="block text-[16px] font-semibold">{d.titulo}</span>
                    <span className="text-[13px] text-cinza">
                      {{ venda: "Venda", captacao: "Captação", locacao: "Locação", avulso: "Avulso" }[d.origem]}, {d.partes.length} {d.partes.length === 1 ? "parte" : "partes"},
                      aberto {prazo(d.criadoEm)}
                    </span>
                  </span>
                  <Selo tom={RISCO[d.risco].tom}>{RISCO[d.risco].nome}</Selo>
                </span>
                <Fita parte={r.prontas} total={r.total} rotulo="Em dia" />
                <span className="mt-2 flex flex-wrap gap-1">
                  {r.positivas > 0 && (
                    <Selo tom="erro">
                      {r.positivas} positiva{r.positivas > 1 && "s"}
                    </Selo>
                  )}
                  {r.vencidas > 0 && (
                    <Selo tom="erro">
                      {r.vencidas} vencida{r.vencidas > 1 && "s"}
                    </Selo>
                  )}
                  {r.semConferencia > 0 && <Selo tom="alerta">{r.semConferencia} sem conferência</Selo>}
                </span>
              </button>
            );
          })}
        </section>
        <div className="space-y-5">
          {renovar.length > 0 && (
            <Cartao titulo="Renovar">
              <ul className="space-y-2">
                {renovar.map((x) => (
                  <li key={x.c.id} className="flex justify-between gap-3">
                    <button type="button" className="text-left hover:underline" onClick={() => setAb(x.d.id)}>
                      {tipoCert(x.c.tipo)?.nome}
                      <span className="block text-[13px] text-cinza">{x.p?.nome}</span>
                    </button>
                    <Selo tom={situacaoCert(x.c) === "vencida" ? "erro" : "alerta"}>{x.c.validade && prazo(x.c.validade)}</Selo>
                  </li>
                ))}
              </ul>
            </Cartao>
          )}
          <Cartao titulo="O que sai de graça hoje" escuro>
            <p className="mb-3 text-[13px] text-papel/85">
              O painel não quebra captcha. Onde o portal exige verificação humana, ele abre a página e deixa os dados prontos para colar.
            </p>
            <ul className="space-y-1.5 text-[13px]">
              {TIPOS_CERT.filter((t) => !t.id.endsWith("_pj")).map((t) => (
                <li key={t.id} className="flex justify-between gap-3">
                  <span>{t.orgao}</span>
                  <span className="text-nevoa">{t.direto ? "preenchida" : t.custo === "paga" ? "paga" : "assistida"}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] text-nevoa">Emissão sem ninguém clicar depende de Infosimples, Direct Data e RI Digital, pagos por consulta.</p>
          </Cartao>
        </div>
      </div>
      {ds && <VerDossie key={ds.id} ds={ds} onFecha={() => setAb(null)} />}
    </>
  );
}
