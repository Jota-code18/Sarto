"use client";
import { Download, Upload } from "lucide-react";
import { useState } from "react";
import { type CampoDef, Formulario, type GrupoDef } from "@/componentes/formulario";
import { Botao, Cabecalho, Cartao, Confirmar, estiloBotao } from "@/componentes/ui";
import { TIPOS_CERT } from "@/lib/certidoes";
import { brHora, hoje } from "@/lib/datas";
import { baixarArquivo } from "@/lib/formato";
import { A_CONFIRMAR, pode } from "@/lib/regras";
import { acao, exportarTudo, useSarto } from "@/lib/store";
import type { Regras } from "@/lib/tipos";

const c = (k: keyof Regras | string, nome: string, tipo: CampoDef["tipo"], col: CampoDef["col"] = 2): CampoDef => ({
  k,
  nome,
  tipo,
  col,
  dica: A_CONFIRMAR.has(k.split(".")[0] as keyof Regras) ? "A confirmar com a Sarto" : undefined,
});

const GRUPOS: GrupoDef[] = [
  {
    grupo: "Locação",
    campos: [
      c("locacaoMinimo", "Aluguel mínimo", "dinheiro"),
      c("taxaPadrao", "Taxa padrão (%)", "numero"),
      c("taxaReduzida", "Taxa reduzida (%)", "numero"),
      c("taxaReduzidaAcima", "Reduzida acima de", "dinheiro"),
      c("taxaReduzidaImoveis", "Ou com quantos imóveis", "numero"),
      c("prazoAnaliseHoras", "Prazo de análise (h)", "numero"),
      c("prazoTitularidadeDias", "Prazo água e energia (dias)", "numero"),
      c("multaPadrao", "Multa por atraso (%)", "numero"),
      c("jurosPadrao", "Juros ao mês (%)", "numero"),
    ],
  },
  {
    grupo: "Venda e jurídico",
    campos: [
      c("comissaoVenda", "Comissão (%)", "numero"),
      c("splitGestor", "Gestão comercial (% da comissão)", "numero"),
      c("splitImobiliaria", "Sarto (% da comissão)", "numero"),
      c("prazoMinutaHoras", "Prazo da minuta (h)", "numero"),
      c("prazoPixHoras", "Prazo do Pix (h)", "numero"),
    ],
  },
  {
    grupo: "Mínimo de fotos",
    campos: [
      c("fotosMin.casa_rua", "Casa de rua", "numero", 1),
      c("fotosMin.condominio", "Condomínio", "numero", 1),
      c("fotosMin.apartamento", "Apartamento", "numero", 1),
      c("fotosMin.lote", "Lote", "numero", 1),
      c("fotosMin.comercial", "Comercial", "numero", 1),
    ],
  },
  {
    grupo: "Padrão Sarto para a varredura",
    campos: [
      c("padraoPrecoMin", "Preço mínimo", "dinheiro", 3),
      c("padraoPrecoMax", "Preço máximo (0 = sem limite)", "dinheiro", 3),
      c("padraoCidade", "Cidade", "texto", 3),
      { ...c("padraoBairros", "Bairros e condomínios, separados por vírgula", "area", 6), linhas: 2 },
    ],
  },
  {
    grupo: "Videomaker",
    campos: [
      c("videoPorDia", "Gravações por dia", "numero"),
      c("videoDeslocamentoMin", "Deslocamento (min)", "numero"),
      c("videoEntregaDias", "Entrega (dias úteis)", "numero"),
      c("videoInicio", "Começa", "hora", 3),
      c("videoFim", "Termina", "hora", 3),
    ],
  },
  {
    grupo: "Metas e limites",
    campos: [
      c("metaVgv", "VGV do mês", "dinheiro"),
      c("metaCaptacoes", "Captações", "numero"),
      c("metaLeads", "Leads", "numero"),
      c("metaVisitas", "Visitas", "numero"),
      c("limiteCustos", "Limite de custo do sistema", "dinheiro"),
      c("diaFornecedores", "Dia de pagar fornecedores", "numero"),
    ],
  },
];

export default function Config() {
  const { regras, perfil, dados } = useSarto();
  const { setRegras, avisar, registrar, apagarTudo, importar } = acao();
  const [f, setF] = useState(regras);
  const [conf, setConf] = useState<"" | "zero" | "importar">("");
  const [arq, setArq] = useState<unknown>(null);
  const mudou = JSON.stringify(f) !== JSON.stringify(regras);
  const backup = () => baixarArquivo(`backup-sarto-${hoje()}.json`, exportarTudo(), "application/json");

  return (
    <>
      <Cabecalho area="GESTÃO CONFIGURAÇÕES" titulo="Configurações" texto="Regras que o painel usa nos cálculos, e os dados deste navegador." />
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="min-w-0">
          <Formulario grupos={GRUPOS} valor={f} onMuda={setF} />
          <details className="mt-7">
            <summary className="text-[13px] font-semibold uppercase tracking-wide">Validade das certidões, em dias</summary>
            <p className="mt-2 text-[13px] text-cinza">Usada quando o PDF não informa a validade. A Gabi define o que ela aceita.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {TIPOS_CERT.map((t) => (
                <label key={t.id} className="flex items-center justify-between gap-3 text-[13px]">
                  <span>
                    {t.nome} <span className="text-cinza">{t.id.endsWith("_pj") ? "(empresa)" : ""}</span>
                  </span>
                  <input
                    type="number"
                    min={1}
                    className="campo w-20"
                    value={f.validadeCert[t.id] ?? t.dias}
                    onChange={(e) => setF({ ...f, validadeCert: { ...f.validadeCert, [t.id]: Number(e.target.value) || t.dias } })}
                  />
                </label>
              ))}
            </div>
          </details>
          <div className="sticky bottom-0 mt-7 flex items-center gap-3 border-t border-linha bg-papel py-3">
            <Botao
              tom="cheio"
              disabled={!mudou || !pode(perfil, "regras")}
              onClick={() => {
                setRegras(f);
                registrar("Configurações", "mudou as regras");
                avisar("Regras salvas");
              }}
            >
              Salvar regras
            </Botao>
            {mudou && (
              <Botao tom="texto" onClick={() => setF(regras)}>
                Desfazer
              </Botao>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <Cartao titulo="Dados deste navegador">
            <p className="text-[13px] text-cinza">
              Tudo fica salvo só neste navegador: outra pessoa não vê o que você cadastrou aqui. O banco compartilhado com login entra quando a conta do Supabase estiver em nome da
              Sarto.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Botao onClick={backup}>
                <Download size={16} /> Baixar backup
              </Botao>
              <label className={estiloBotao()}>
                <Upload size={16} /> Restaurar backup
                <input
                  type="file"
                  accept=".json,application/json"
                  className="sr-only"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    try {
                      setArq(JSON.parse(await file.text()));
                      setConf("importar");
                    } catch {
                      avisar("Este arquivo não é um backup do painel", "erro");
                    }
                  }}
                />
              </label>
              <Botao tom="erro" onClick={() => setConf("zero")}>
                Apagar tudo deste navegador
              </Botao>
            </div>
            <p className="mt-3 text-[12px] text-cinza">PDFs e fotos não entram no backup.</p>
          </Cartao>

          <Cartao titulo="Proteção de dados" escuro>
            <ul className="space-y-2 text-[13px] text-papel/85">
              <li>O painel não envia cadastro para servidor. Saem daqui só as consultas que você aciona: CEP, índice, CNPJ, nome no DJEN, portais de certidão e WhatsApp.</li>
              <li>Guarde só o que o processo pede. Documento de cliente que não fechou negócio deve ser apagado.</li>
              <li>Trocar de perfil no menu não é senha: serve para ver o painel de cada um e registrar quem fez.</li>
            </ul>
          </Cartao>

          <Cartao titulo="Histórico">
            {dados.logs.length === 0 ? (
              <p className="text-[13px] text-cinza">Vazio.</p>
            ) : (
              <ul className="max-h-72 space-y-1.5 overflow-y-auto text-[13px]">
                {dados.logs.slice(0, 80).map((l) => (
                  <li key={l.id}>
                    <span className="tabular-nums text-cinza">{brHora(l.em)}</span> {l.quem} {l.texto}
                  </li>
                ))}
              </ul>
            )}
          </Cartao>
        </div>
      </div>
      <Confirmar
        aberta={!!conf}
        titulo={conf === "zero" ? "Apagar tudo?" : "Restaurar este backup?"}
        texto="O que está neste navegador será substituído. Baixe um backup antes, se precisar."
        sim={conf === "zero" ? "Apagar tudo" : "Restaurar"}
        onNao={() => setConf("")}
        onSim={() => {
          if (conf === "zero") apagarTudo();
          if (conf === "importar" && !importar(arq)) avisar("Este arquivo não é um backup do painel", "erro");
          else avisar("Pronto");
          setF(useSarto.getState().regras);
          setConf("");
        }}
      />
    </>
  );
}
