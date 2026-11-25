"use client";
import { useMemo, useState } from "react";
import { Botao, Cabecalho, Escolha, estiloBotao, Nota, Numero, Numeros, Vazio } from "@/componentes/ui";
import { br, hoje } from "@/lib/datas";
import { arred, baixarArquivo, brl, csv, mascaraDoc, semAcento, soDigitos } from "@/lib/formato";
import { useSarto } from "@/lib/store";

export default function Obrigacoes() {
  const { dados } = useSarto();
  const anos = [...new Set([...dados.repasses.map((r) => r.comp.slice(0, 4)), hoje().slice(0, 4)])].sort().reverse();
  const [ano, setAno] = useState(anos[0]);

  const linhas = useMemo(
    () =>
      dados.contratos
        .map((k) => {
          const cobs = dados.cobrancas.filter((c) => c.contratoId === k.id && c.pagoEm?.startsWith(ano));
          const reps = dados.repasses.filter((r) => r.contratoId === k.id && cobs.some((c) => c.comp === r.comp));
          const mes = Array.from({ length: 12 }, (_, i) => {
            const m = `${ano}-${String(i + 1).padStart(2, "0")}`;
            return arred(cobs.filter((c) => c.pagoEm?.startsWith(m)).reduce((a, c) => a + c.aluguel, 0));
          });
          const bruto = arred(mes.reduce((a, b) => a + b, 0));
          const taxa = arred(reps.reduce((a, r) => a + r.taxa, 0));
          const faltas = [!soDigitos(k.proprietario.doc) && "CPF do proprietário", !soDigitos(k.inquilino.doc) && "CPF do inquilino", !k.endereco && "endereço"].filter(Boolean) as string[];
          return { k, bruto, taxa, mes, faltas };
        })
        .filter((l) => l.bruto > 0),
    [dados, ano],
  );
  const donos = useMemo(() => {
    const m = new Map<string, { nome: string; doc: string; bruto: number; taxa: number; n: number }>();
    for (const l of linhas) {
      const c = semAcento(l.k.proprietario.nome);
      const x = m.get(c) ?? { nome: l.k.proprietario.nome, doc: l.k.proprietario.doc, bruto: 0, taxa: 0, n: 0 };
      m.set(c, { ...x, bruto: arred(x.bruto + l.bruto), taxa: arred(x.taxa + l.taxa), n: x.n + 1 });
    }
    return [...m.values()].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [linhas]);
  const faltas = linhas.filter((l) => l.faltas.length);

  const dimob = () =>
    baixarArquivo(
      `dimob-${ano}.csv`,
      csv([
        ["Locador", "CPF/CNPJ do locador", "Locatário", "CPF/CNPJ do locatário", "Nº do contrato", "Data do contrato", "Endereço", "Bairro", ...["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"], "Total de aluguéis", "Comissão"],
        ...linhas.map((l) => [l.k.proprietario.nome, mascaraDoc(l.k.proprietario.doc), l.k.inquilino.nome, mascaraDoc(l.k.inquilino.doc), l.k.codigo, br(l.k.inicio), l.k.endereco, l.k.bairro, ...l.mes, l.bruto, l.taxa]),
      ]),
      "text/csv;charset=utf-8",
    );

  return (
    <>
      <Cabecalho area="LOCAÇÃO OBRIGAÇÕES" titulo="Informe e DIMOB" texto="Sai do que foi recebido no ano. A planilha vai para o contador, que transmite.">
        <Escolha rotulo="Ano" valor={ano} onMuda={setAno} opcoes={anos.map((a) => ({ id: a, nome: a }))} />
        <Botao tom="cheio" onClick={dimob} disabled={!linhas.length}>
          Baixar base da DIMOB
        </Botao>
      </Cabecalho>
      <Numeros>
        <Numero valor={brl(donos.reduce((a, d) => a + d.bruto, 0), false)} nome="Aluguéis recebidos" />
        <Numero valor={brl(donos.reduce((a, d) => a + d.taxa, 0), false)} nome="Taxas da Sarto" />
        <Numero valor={donos.length} nome="Proprietários" />
        <Numero valor={faltas.length} nome="Contratos com dado faltando" />
      </Numeros>
      {faltas.length > 0 && (
        <div className="mb-5">
          <Nota tom="alerta">
            Antes de enviar, complete: {faltas.slice(0, 5).map((l) => `${l.k.imovel} (${l.faltas.join(", ")})`).join("; ")}
            {faltas.length > 5 && ` e mais ${faltas.length - 5}`}.
          </Nota>
        </div>
      )}
      {donos.length === 0 ? (
        <Vazio>Nenhum aluguel recebido em {ano}.</Vazio>
      ) : (
        <div className="overflow-x-auto">
          <table className="tabela min-w-[640px]">
            <thead>
              <tr>
                <th>Proprietário</th>
                <th>Documento</th>
                <th className="n">Imóveis</th>
                <th className="n">Aluguéis</th>
                <th className="n">Taxas</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {donos.map((d) => (
                <tr key={d.nome}>
                  <td className="font-medium">{d.nome}</td>
                  <td>{mascaraDoc(d.doc) || "—"}</td>
                  <td className="n">{d.n}</td>
                  <td className="n">{brl(d.bruto)}</td>
                  <td className="n">{brl(d.taxa)}</td>
                  <td className="text-right">
                    <a className={estiloBotao("linha", true)} href={`/imprimir?tipo=informe&ano=${ano}&dono=${encodeURIComponent(d.nome)}`} target="_blank" rel="noreferrer">
                      Informe
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
