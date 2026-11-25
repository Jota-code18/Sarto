"use client";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Formulario } from "@/componentes/formulario";
import { Barras, Botao, Cabecalho, Cartao, Gaveta, Nota, Numero, Numeros, Selo, Vazio } from "@/componentes/ui";
import { brComp, competencia, hoje } from "@/lib/datas";
import { brl, novoId } from "@/lib/formato";
import { acao, useSarto } from "@/lib/store";
import type { Custo } from "@/lib/tipos";

const MODULOS = ["IA", "WhatsApp", "Certidões", "Coleta dos portais", "Asaas", "Servidor e banco", "Claude da equipe", "Outros"];
const INTEG: { nome: string; faz: string; st: "pronta" | "manual" | "espera"; falta: string }[] = [
  { nome: "Site da Sarto", faz: "Carteira e preço divergente, toda segunda", st: "pronta", falta: "" },
  { nome: "Banco Central", faz: "IGP-M, IPCA e INPC para reajuste", st: "pronta", falta: "" },
  { nome: "ViaCEP", faz: "Endereço pelo CEP", st: "pronta", falta: "" },
  { nome: "DJEN", faz: "Publicações judiciais por nome", st: "pronta", falta: "" },
  { nome: "BrasilAPI", faz: "Dados de empresa pelo CNPJ", st: "pronta", falta: "" },
  { nome: "Google Agenda", faz: "Link e arquivo .ics", st: "manual", falta: "Conta Google da Sarto para agenda compartilhada" },
  { nome: "WhatsApp", faz: "Mensagem pronta para enviar", st: "manual", falta: "Chip novo e verificação no Meta para a IA responder" },
  { nome: "Jetimob", faz: "Alerta de anúncio pela captura e lista de leads para lançar. A API lê imóveis e grava lead; não cadastra imóvel, não sobe foto e não tem nota", st: "manual", falta: "Chaves do webservice e de leads, quando a IA do WhatsApp entrar" },
  { nome: "Banco da Sarto", faz: "Importa extrato OFX ou CSV", st: "manual", falta: "Open Finance ou API do banco" },
  { nome: "Portais de certidão", faz: "Abre com os dados prontos e lê o PDF", st: "manual", falta: "Infosimples, Direct Data e RI Digital (pagos)" },
  { nome: "Supabase", faz: "Banco compartilhado e login", st: "espera", falta: "Conta em nome da Sarto" },
  { nome: "API da Anthropic", faz: "IA do sistema", st: "espera", falta: "Conta com cartão da Sarto" },
  { nome: "Asaas", faz: "Boleto, Pix e baixa automática", st: "espera", falta: "Conta empresarial" },
  { nome: "ClickSign", faz: "Assinatura", st: "espera", falta: "Plano com API" },
  { nome: "Portais (varredura)", faz: "ZAP e Viva Real toda segunda, pela Apify, dentro do crédito gratuito", st: "manual", falta: "OLX e 62imóveis ainda sem coletor por cidade" },
  { nome: "Instagram e Meta Ads", faz: "Resultado orgânico e pago", st: "espera", falta: "Acesso profissional" },
  { nome: "Canal Pro", faz: "Importa o relatório com a nota de qualidade", st: "manual", falta: "Usuário da Sarto no Canal Pro" },
];
const ST = { pronta: { n: "Funcionando", t: "ok" }, manual: { n: "Modo manual", t: "alerta" }, espera: { n: "Esperando a Sarto", t: "neutro" } } as const;

export default function Custos() {
  const { dados, regras } = useSarto();
  const { salvar, remover, avisar } = acao();
  const [ed, setEd] = useState<Custo | null>(null);
  const comp = competencia(hoje());
  const mes = dados.custos.filter((c) => c.comp === comp);
  const total = mes.reduce((a, c) => a + c.valor, 0);
  const por = [...mes.reduce((m, c) => m.set(c.modulo, (m.get(c.modulo) ?? 0) + c.valor), new Map<string, number>())].map(([nome, valor]) => ({ nome, valor, rotulo: brl(valor) })).sort((a, b) => b.valor - a.valor);
  return (
    <>
      <Cabecalho area="GESTÃO CUSTOS" titulo="Custos e integrações" texto="O que o sistema gasta por módulo e o que está ligado. Hoje tudo que está funcionando é gratuito.">
        <Botao tom="cheio" onClick={() => setEd({ id: novoId(), comp, modulo: "IA", descricao: "", valor: 0 })}>
          <Plus size={16} /> Lançar custo
        </Botao>
      </Cabecalho>
      <Numeros>
        <Numero valor={brl(total)} nome={`Custo em ${brComp(comp)}`} nota={regras.limiteCustos ? `limite de ${brl(regras.limiteCustos)}` : "sem limite definido"} />
        <Numero valor={INTEG.filter((i) => i.st === "pronta").length} nome="Funcionando" />
        <Numero valor={INTEG.filter((i) => i.st === "manual").length} nome="Em modo manual" />
        <Numero valor={INTEG.filter((i) => i.st === "espera").length} nome="Esperando a Sarto" />
      </Numeros>
      {regras.limiteCustos > 0 && total > regras.limiteCustos && (
        <div className="mb-5">
          <Nota tom="erro">O custo do mês passou do limite combinado.</Nota>
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-[1fr_1.6fr]">
        <Cartao titulo="Por módulo" className="self-start">
          {mes.length === 0 ? <Vazio>Nenhum custo lançado neste mês.</Vazio> : <Barras dados={por} />}
          <ul className="mt-4 divide-y divide-linha text-[13px]">
            {mes.map((c) => (
              <li key={c.id} className="flex justify-between py-1.5">
                <button type="button" className="text-left hover:underline" onClick={() => setEd(c)}>
                  {c.modulo}: {c.descricao}
                </button>
                <span className="tabular-nums">{brl(c.valor)}</span>
              </li>
            ))}
          </ul>
        </Cartao>
        <div className="overflow-x-auto">
          <table className="tabela min-w-[600px]">
            <thead>
              <tr>
                <th>Integração</th>
                <th>O que faz hoje</th>
                <th>Falta</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {INTEG.map((i) => (
                <tr key={i.nome}>
                  <td className="font-medium">{i.nome}</td>
                  <td>{i.faz}</td>
                  <td className="text-cinza">{i.falta || "—"}</td>
                  <td>
                    <Selo tom={ST[i.st].t}>{ST[i.st].n}</Selo>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Gaveta
        aberta={!!ed}
        titulo="Custo"
        onFecha={() => setEd(null)}
        rodape={
          ed && (
            <>
              {dados.custos.some((c) => c.id === ed.id) && (
                <Botao
                  tom="texto"
                  onClick={() => {
                    remover("custos", ed.id);
                    setEd(null);
                  }}
                >
                  Excluir
                </Botao>
              )}
              <Botao
                tom="cheio"
                disabled={!ed.valor}
                onClick={() => {
                  salvar("custos", ed);
                  avisar("Custo lançado");
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
                  { k: "modulo", nome: "Módulo", tipo: "opcoes", opcoes: MODULOS, col: 3 },
                  { k: "valor", nome: "Valor", tipo: "dinheiro", col: 3 },
                  { k: "descricao", nome: "Descrição", col: 6 },
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
