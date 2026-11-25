"use client";
import { FileDown, FileUp, Plus, Printer } from "lucide-react";
import { useState } from "react";
import { Abas, Botao, Cabecalho, Confirmar, cx, estiloBotao, Fita, Gaveta, Nota, Selo, type Tom, Vazio } from "@/componentes/ui";
import { useParam } from "@/componentes/uso";
import { docxDeTexto, guardar, pegar, preencherDocx, textoDoDocx } from "@/lib/arquivos";
import { agora, brHora } from "@/lib/datas";
import { baixarArquivo, novoId } from "@/lib/formato";
import { camposDaVenda, camposDe, camposDoContrato, camposVazios, horasAte, MARCA, nomeCampo, preencher } from "@/lib/juridico";
import { taxaAdm } from "@/lib/locacao";
import { pode, quemPode } from "@/lib/regras";
import { acao, useSarto } from "@/lib/store";
import type { Minuta, Modelo } from "@/lib/tipos";

const ST: Record<Minuta["status"], { nome: string; tom: Tom }> = {
  rascunho: { nome: "Rascunho", tom: "neutro" },
  em_revisao: { nome: "Com a Gabi", tom: "alerta" },
  ajustar: { nome: "Ajustar", tom: "erro" },
  liberada: { nome: "Liberada", tom: "ok" },
};

function EditarMinuta({ m, onFecha }: { m: Minuta; onFecha: () => void }) {
  const { dados, perfil, regras } = useSarto();
  const { salvar, remover, avisar, registrar, feito, mudar } = acao();
  const [f, setF] = useState(m);
  const [apaga, setApaga] = useState(false);
  const [manual, setManual] = useState(!!m.texto);
  const modelo = dados.modelos.find((x) => x.id === f.modeloId);
  const corpo = modelo?.corpo ?? "";
  const campos = camposDe(corpo);
  const vazios = camposVazios(corpo, f.campos);
  const texto = manual ? f.texto : preencher(corpo, f.campos);
  const gabi = pode(perfil, "minuta");
  const travada = f.status === "liberada" || (f.status === "em_revisao" && !gabi);
  const hh = horasAte(f.prazo);
  const gravar = (n: Minuta) => {
    setF(n);
    salvar("minutas", n);
  };

  const baixar = async () => {
    const liberada = f.status === "liberada";
    const nome = `${liberada ? "" : "RASCUNHO "}${f.titulo
      .replace(/[^\p{L}\p{N} .-]+/gu, " ")
      .replace(/\s+/g, " ")
      .slice(0, 70)
      .trim()}.docx`;
    try {
      // liberada usa o arquivo da Gabi só se o texto dele ainda for o que ela revisou
      const usaWord = modelo?.docx && (liberada ? preencher(corpo, f.campos) === f.texto : !manual);
      if (modelo?.docx && usaWord) {
        const b = await pegar(modelo.docx);
        if (!b) return avisar("O modelo .docx está em outro navegador", "erro");
        return baixarArquivo(nome, await preencherDocx(b, f.campos, liberada ? undefined : MARCA));
      }
      baixarArquivo(nome, await docxDeTexto(texto, liberada ? undefined : MARCA));
    } catch {
      avisar("O arquivo do modelo tem um campo mal fechado. Confira as chaves {{ }}.", "erro");
    }
  };

  return (
    <>
      <Gaveta
        larga
        aberta
        titulo={f.titulo}
        sub={
          <>
            {ST[f.status].nome}
            {f.status !== "liberada" && (hh >= 0 ? `, ${hh}h de prazo` : `, prazo venceu há ${-hh}h`)}
          </>
        }
        onFecha={onFecha}
        rodape={
          <>
            <Botao tom="texto" onClick={() => setApaga(true)}>
              Excluir
            </Botao>
            <a className={estiloBotao()} href={`/imprimir?tipo=minuta&id=${f.id}`} target="_blank" rel="noreferrer" onClick={() => salvar("minutas", f)}>
              <Printer size={16} /> Imprimir
            </a>
            <Botao onClick={baixar}>
              <FileDown size={16} /> Word
            </Botao>
            {(f.status === "rascunho" || f.status === "ajustar") && (
              <Botao
                tom="cheio"
                onClick={() => {
                  gravar({ ...f, status: "em_revisao", texto: manual ? f.texto : "", prazo: new Date(Date.now() + regras.prazoMinutaHoras * 36e5).toISOString() });
                  if (f.vendaId) {
                    const v = dados.vendas.find((x) => x.id === f.vendaId);
                    if (v && !v.checklist.minuta) mudar("vendas", v.id, { checklist: { ...v.checklist, minuta: feito() } });
                  }
                  registrar("Jurídico", `enviou para revisão: ${f.titulo}`);
                  avisar("Enviada para a Gabi");
                }}
              >
                Enviar para a Gabi
              </Botao>
            )}
            {f.status === "em_revisao" && (
              <>
                <Botao
                  disabled={!gabi || !f.notas.trim()}
                  title={!f.notas.trim() ? "Escreva o que ajustar" : undefined}
                  onClick={() => gravar({ ...f, status: "ajustar", revisao: feito() })}
                >
                  Devolver
                </Botao>
                <Botao
                  tom="cheio"
                  disabled={!gabi || !modelo?.validado || (vazios.length > 0 && !manual) || (manual && /\{\{/.test(f.texto))}
                  title={
                    !gabi
                      ? `Quem libera: ${quemPode("minuta")}`
                      : !modelo?.validado
                        ? "O modelo ainda não foi validado pela Gabi"
                        : vazios.length
                          ? `Campos vazios: ${vazios.map(nomeCampo).join(", ")}`
                          : undefined
                  }
                  onClick={() => {
                    const r = feito();
                    gravar({ ...f, status: "liberada", revisao: r, texto });
                    setManual(true);
                    if (f.vendaId) {
                      const v = dados.vendas.find((x) => x.id === f.vendaId);
                      if (v) mudar("vendas", v.id, { checklist: { ...v.checklist, minuta: v.checklist.minuta ?? r, revisada: r } });
                    }
                    registrar("Jurídico", `liberou a minuta: ${f.titulo}`);
                    avisar("Minuta liberada");
                  }}
                >
                  Revisei e libero
                </Botao>
              </>
            )}
          </>
        }
      >
        <div className="space-y-5">
          {f.status === "liberada" ? (
            <Nota tom="ok">
              Revisada e liberada por {f.revisao?.por} em {f.revisao && brHora(f.revisao.em)}. O texto ficou travado.
            </Nota>
          ) : (
            <Nota tom="alerta">{MARCA} Só sai sem a marca depois que a Gabi liberar.</Nota>
          )}
          {!modelo?.validado && f.status !== "liberada" && <Nota>Modelo provisório: a Gabi precisa validar em Modelos antes de liberar qualquer minuta feita com ele.</Nota>}

          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-[12px] font-medium" htmlFor="mod">
                  Modelo
                </label>
                <select id="mod" className="campo" value={f.modeloId} disabled={travada} onChange={(e) => setF({ ...f, modeloId: e.target.value })}>
                  {dados.modelos.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.grupo}: {x.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium" htmlFor="tit">
                  Título
                </label>
                <input id="tit" className="campo" value={f.titulo} disabled={travada} onChange={(e) => setF({ ...f, titulo: e.target.value })} />
              </div>
              <Fita parte={campos.length - vazios.length} total={campos.length} rotulo="Campos" />
              {!manual && (
                <div className="space-y-3">
                  {campos.map((k) => (
                    <div key={k}>
                      <label className="mb-1 block text-[12px] font-medium" htmlFor={`c_${k}`}>
                        {nomeCampo(k)}
                      </label>
                      {k === "condicoes" || k.endsWith("qualificacao") ? (
                        <textarea
                          id={`c_${k}`}
                          className="campo"
                          rows={3}
                          disabled={travada}
                          value={f.campos[k] ?? ""}
                          onChange={(e) => setF({ ...f, campos: { ...f.campos, [k]: e.target.value } })}
                        />
                      ) : (
                        <input
                          id={`c_${k}`}
                          className="campo"
                          disabled={travada}
                          value={f.campos[k] ?? ""}
                          onChange={(e) => setF({ ...f, campos: { ...f.campos, [k]: e.target.value } })}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[13px] font-semibold uppercase tracking-wide">Texto</h3>
                <span className="flex gap-2">
                  {!travada && (
                    <Botao
                      pequeno
                      onClick={() => {
                        if (manual) setManual(false);
                        else {
                          setF({ ...f, texto });
                          setManual(true);
                        }
                      }}
                    >
                      {manual ? "Voltar ao modelo" : "Editar o texto"}
                    </Botao>
                  )}
                  {!travada && (
                    <Botao
                      pequeno
                      onClick={() => {
                        gravar({ ...f, texto: manual ? f.texto : "" });
                        avisar("Minuta salva");
                      }}
                    >
                      Salvar
                    </Botao>
                  )}
                </span>
              </div>
              {manual && !travada ? (
                <textarea className="campo min-h-[520px] leading-relaxed" value={f.texto} onChange={(e) => setF({ ...f, texto: e.target.value })} />
              ) : (
                <div className="max-h-[640px] overflow-y-auto whitespace-pre-wrap bg-giz p-6 leading-relaxed">
                  {texto.split(/(\{\{[^}]+\}\})/).map((x, i) =>
                    x.startsWith("{{") ? (
                      // biome-ignore lint: posição é a identidade do trecho
                      <mark key={i} className="bg-alertaf px-1 text-alerta">
                        {nomeCampo(x.replace(/[{}\s]/g, ""))}
                      </mark>
                    ) : (
                      x
                    ),
                  )}
                </div>
              )}
              {modelo?.docx && !manual && (
                <p className="mt-2 text-[12px] text-cinza">O Word sai no arquivo original da Gabi ({modelo.docxNome}), com a formatação dela. O texto acima é só prévia.</p>
              )}
              <label className="mb-1 mt-5 block text-[12px] font-medium" htmlFor="notas">
                Notas da revisão
              </label>
              <textarea
                id="notas"
                className="campo"
                rows={3}
                disabled={!gabi && f.status === "em_revisao"}
                value={f.notas}
                onChange={(e) => setF({ ...f, notas: e.target.value })}
              />
            </div>
          </div>
        </div>
      </Gaveta>
      <Confirmar
        aberta={apaga}
        titulo="Excluir esta minuta?"
        texto="O texto e as notas da revisão serão apagados."
        sim="Excluir minuta"
        onNao={() => setApaga(false)}
        onSim={() => {
          remover("minutas", f.id);
          onFecha();
        }}
      />
    </>
  );
}

function EditarModelo({ m, onFecha }: { m: Modelo; onFecha: () => void }) {
  const { perfil } = useSarto();
  const { salvar, avisar, registrar, feito, remover } = acao();
  const [f, setF] = useState(m);
  const gabi = pode(perfil, "minuta");
  const subir = async (arq?: File) => {
    if (!arq) return;
    try {
      const texto = await textoDoDocx(arq);
      const chave = await guardar(arq, "modelo");
      setF({ ...f, corpo: texto, docx: chave, docxNome: arq.name, validado: undefined });
      const n = camposDe(texto).length;
      avisar(n ? `${n} campos encontrados no documento` : "Nenhum campo {{assim}} no documento", n ? "ok" : "erro");
    } catch {
      avisar("Não consegui abrir o arquivo. Precisa ser .docx.", "erro");
    }
  };
  return (
    <Gaveta
      larga
      aberta
      titulo={f.nome || "Novo modelo"}
      sub={f.validado ? `Validado por ${f.validado.por}` : "Sem validação"}
      onFecha={onFecha}
      rodape={
        <>
          <Botao
            tom="texto"
            onClick={() => {
              remover("modelos", f.id);
              onFecha();
            }}
          >
            Excluir
          </Botao>
          <Botao
            disabled={!f.nome || !f.corpo}
            onClick={() => {
              // qualquer mudança no texto derruba a validação
              salvar("modelos", { ...f, validado: f.corpo === m.corpo ? f.validado : undefined });
              avisar("Modelo salvo");
              onFecha();
            }}
          >
            Salvar
          </Botao>
          <Botao
            tom="cheio"
            disabled={!gabi || !f.corpo || !f.nome}
            title={gabi ? undefined : `Quem valida: ${quemPode("minuta")}`}
            onClick={() => {
              salvar("modelos", { ...f, validado: feito() });
              registrar("Jurídico", `validou o modelo ${f.nome}`);
              avisar("Modelo validado");
              onFecha();
            }}
          >
            Validar modelo
          </Botao>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-[12px] font-medium">
            Nome
            <input className="campo mt-1" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
          </label>
          <label className="text-[12px] font-medium">
            Grupo
            <input className="campo mt-1" value={f.grupo} onChange={(e) => setF({ ...f, grupo: e.target.value })} />
          </label>
        </div>
        <label className="flex cursor-pointer items-center justify-center gap-2 border border-dashed border-nevoa px-4 py-4 hover:border-carvao">
          <FileUp size={18} />
          {f.docxNome ? `Trocar ${f.docxNome}` : "Usar o .docx da Gabi"}
          <input type="file" accept=".docx" className="sr-only" onChange={(e) => subir(e.target.files?.[0])} />
        </label>
        <p className="text-[13px] text-cinza">
          No Word, escreva os campos entre chaves duplas, por exemplo {"{{vendedor_nome}}"}. Campos que o painel já preenche:{" "}
          {[
            "vendedor_nome",
            "vendedor_doc",
            "comprador_nome",
            "comprador_doc",
            "imovel_descricao",
            "preco",
            "preco_extenso",
            "sinal",
            "saldo",
            "comissao",
            "locador_nome",
            "locatario_nome",
            "aluguel",
            "inicio",
            "fim",
            "data_extenso",
          ].join(", ")}
          .
        </p>
        {f.docx ? (
          <div className="max-h-[480px] overflow-y-auto whitespace-pre-wrap bg-giz p-5">{f.corpo}</div>
        ) : (
          <textarea className="campo min-h-[480px] leading-relaxed" value={f.corpo} onChange={(e) => setF({ ...f, corpo: e.target.value })} aria-label="Texto do modelo" />
        )}
      </div>
    </Gaveta>
  );
}

export default function Minutas() {
  const { dados, regras } = useSarto();
  const { salvar } = acao();
  const pm = useParam("m");
  const pc = useParam("contrato");
  const [ab, setAb] = useState<string | null>(pm);
  const [mod, setMod] = useState<Modelo | null>(null);
  const [aba, setAba] = useState<"minutas" | "modelos">("minutas");
  const [nova, setNova] = useState(!!pc);
  const m = dados.minutas.find((x) => x.id === ab);
  const contrato = dados.contratos.find((c) => c.id === pc);

  const criar = (modelo: Modelo, origem: string) => {
    const v = dados.vendas.find((x) => x.id === origem);
    const k = dados.contratos.find((x) => x.id === origem);
    const id = novoId();
    salvar("minutas", {
      id,
      titulo: `${modelo.nome}${v ? `: ${v.imovel}` : k ? `: ${k.imovel}` : ""}`,
      modeloId: modelo.id,
      vendaId: v?.id,
      contratoId: k?.id,
      campos: v ? camposDaVenda(v) : k ? camposDoContrato(k, taxaAdm(k, regras)) : {},
      texto: "",
      status: "rascunho",
      criadaEm: agora(),
      prazo: new Date(Date.now() + regras.prazoMinutaHoras * 36e5).toISOString(),
      notas: "",
    });
    setNova(false);
    setAb(id);
  };
  const [origem, setOrigem] = useState(contrato?.id ?? "");
  const [modSel, setModSel] = useState(contrato ? "mod_locacao" : (dados.modelos[0]?.id ?? ""));

  return (
    <>
      <Cabecalho
        area="JURÍDICO MINUTAS"
        titulo="Minutas e modelos"
        texto={`Preenche o modelo com os dados do negócio, sem IA. Nada sai sem a Gabi liberar; prazo de ${regras.prazoMinutaHoras}h.`}
      >
        {aba === "modelos" ? (
          <Botao tom="cheio" onClick={() => setMod({ id: novoId(), nome: "", grupo: "Venda", corpo: "" })}>
            <Plus size={16} /> Novo modelo
          </Botao>
        ) : (
          <Botao tom="cheio" onClick={() => setNova(true)}>
            <Plus size={16} /> Nova minuta
          </Botao>
        )}
      </Cabecalho>
      <Abas
        atual={aba}
        onMuda={setAba}
        itens={[
          { id: "minutas", nome: "Minutas", n: dados.minutas.length },
          { id: "modelos", nome: "Modelos", n: dados.modelos.length },
        ]}
      />
      {aba === "minutas" &&
        (dados.minutas.length === 0 ? (
          <Vazio acao={<Botao onClick={() => setNova(true)}>Criar minuta</Botao>}>Nenhuma minuta. Elas também nascem na etapa 4 do pós-venda.</Vazio>
        ) : (
          <ul className="divide-y divide-linha border-y border-linha">
            {dados.minutas.map((x) => {
              const hh = horasAte(x.prazo);
              return (
                <li key={x.id}>
                  <button type="button" onClick={() => setAb(x.id)} className="flex w-full flex-wrap items-center justify-between gap-3 py-3 text-left hover:bg-linho">
                    <span>
                      <span className="block font-medium">{x.titulo}</span>
                      <span className="text-[13px] text-cinza">
                        Criada {brHora(x.criadaEm)}
                        {x.status !== "liberada" && (hh >= 0 ? `, ${hh}h de prazo` : `, atrasada ${-hh}h`)}
                      </span>
                    </span>
                    <Selo tom={ST[x.status].tom}>{x.status === "liberada" ? `Liberada por ${x.revisao?.por}` : ST[x.status].nome}</Selo>
                  </button>
                </li>
              );
            })}
          </ul>
        ))}
      {aba === "modelos" && (
        <>
          <div className="mb-4">
            <Nota>Os modelos abaixo são provisórios, só para o fluxo andar. A Gabi pode subir os dela em Word e validar: o painel preenche mantendo a formatação.</Nota>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dados.modelos.map((x) => (
              <button key={x.id} type="button" onClick={() => setMod(x)} className="bg-linho p-4 text-left hover:bg-linha">
                <span className="text-[12px] uppercase text-cinza">{x.grupo}</span>
                <span className="block font-semibold">{x.nome}</span>
                <span className="mt-2 flex flex-wrap gap-1">
                  <Selo tom={x.validado ? "ok" : "alerta"}>{x.validado ? `Validado por ${x.validado.por}` : "Provisório"}</Selo>
                  {x.docx && <Selo tom="neutro">Word</Selo>}
                  <span className="text-[12px] text-cinza">{camposDe(x.corpo).length} campos</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      <Gaveta
        aberta={nova}
        titulo="Nova minuta"
        onFecha={() => setNova(false)}
        rodape={
          <Botao
            tom="cheio"
            disabled={!modSel}
            onClick={() => {
              const x = dados.modelos.find((y) => y.id === modSel);
              if (x) criar(x, origem);
            }}
          >
            Criar minuta
          </Botao>
        }
      >
        <div className="space-y-5">
          <label className="block text-[12px] font-medium">
            Modelo
            <select className="campo mt-1" value={modSel} onChange={(e) => setModSel(e.target.value)}>
              {dados.modelos.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.grupo}: {x.nome}
                </option>
              ))}
            </select>
          </label>
          <label className={cx("block text-[12px] font-medium")}>
            Preencher com
            <select className="campo mt-1" value={origem} onChange={(e) => setOrigem(e.target.value)}>
              <option value="">Em branco</option>
              <optgroup label="Vendas">
                {dados.vendas.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.imovel}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Locação">
                {dados.contratos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.imovel}, {v.inquilino.nome}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
        </div>
      </Gaveta>
      {m && <EditarMinuta key={m.id} m={m} onFecha={() => setAb(null)} />}
      {mod && <EditarModelo key={mod.id} m={mod} onFecha={() => setMod(null)} />}
    </>
  );
}
