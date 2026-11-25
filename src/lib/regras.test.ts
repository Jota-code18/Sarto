import { describe, expect, it } from "vitest";
import { conflitosVideo, horariosLivres, ics, prazoEntrega } from "./agenda";
import { conferirLeitura, lerCertidao, resumoDossie, situacaoCert } from "./certidoes";
import { faltando, leadRepetido } from "./comercial";
import { diaNoMes, maisMeses, segundaDe } from "./datas";
import { dadosDemo, dadosVazios } from "./demo";
import { lerCsv, lerExtratoCsv, lerOfx } from "./extrato";
import { cnpjValido, cpfValido, csv, lerValor, linkWhats, valorExtenso } from "./formato";
import { camposDe, camposVazios, dividirComissao, impedimentos, preencher, prazoPix } from "./juridico";
import { acrescimos, alertasContrato, calcularRepasse, corContrato, gerarCobrancas, situacao, taxaAdm } from "./locacao";
import { MODELOS_PROVISORIOS } from "./modelos";
import { acumulado12, novoAluguel } from "./reajuste";
import { REGRAS } from "./regras";
import type { Certidao, Cobranca, Contrato, Evento, Parte, Venda } from "./tipos";

const contrato = (p: Partial<Contrato> = {}): Contrato => ({
  id: "k", codigo: "L1", imovel: "Ap 1", endereco: "", bairro: "", proprietario: { nome: "D", doc: "", tel: "", email: "", pix: "" },
  inquilino: { nome: "I", doc: "", tel: "", email: "" }, aluguel: 3000, condominio: 500, iptuMensal: 100, encargosNoBoleto: false, diaVencimento: 10,
  diaRepasse: 15, inicio: "2026-01-20", fim: "2028-07-20", indice: "IPCA", ultimoReajuste: "2026-01-20", garantia: "", garantiaVence: "", seguroVence: "2027-01-20",
  imoveisDoDono: 1, multaPct: 10, jurosMes: 1, status: "ativo", saida: {}, obs: "",
  checklist: Object.fromEntries(["documentos", "vistoria", "garantia", "seguro", "energia", "agua", "chaves"].map((x) => [x, { em: "", por: "" }])), ...p,
});
const cobranca = (p: Partial<Cobranca> = {}): Cobranca => ({
  id: "c", contratoId: "k", comp: "2026-05", vencimento: "2026-05-10", aluguel: 3000, encargos: 0, extra: 0, extraMotivo: "", avisos: [], ...p,
});

describe("dinheiro e datas", () => {
  it("lê valores digitados de várias formas", () => {
    expect(lerValor("R$ 1.234,56")).toBe(1234.56);
    expect(lerValor("1234.56")).toBe(1234.56);
    expect(lerValor("1.450.000")).toBe(1450000);
    expect(lerValor("2500")).toBe(2500);
    expect(lerValor("-89,90")).toBe(-89.9);
    expect(lerValor("")).toBe(0);
  });
  it("escreve por extenso", () => {
    expect(valorExtenso(1450000)).toBe("um milhão, quatrocentos e cinquenta mil reais");
    expect(valorExtenso(1000000)).toBe("um milhão de reais");
    expect(valorExtenso(3200.5)).toBe("três mil e duzentos reais e cinquenta centavos");
    expect(valorExtenso(1001)).toBe("mil e um reais");
    expect(valorExtenso(1234)).toBe("mil, duzentos e trinta e quatro reais");
    expect(valorExtenso(100)).toBe("cem reais");
    expect(valorExtenso(1)).toBe("um real");
    expect(valorExtenso(0)).toBe("zero real");
  });
  it("valida CPF e CNPJ", () => {
    expect(cpfValido("111.444.777-35")).toBe(true);
    expect(cpfValido("111.444.777-34")).toBe(false);
    expect(cpfValido("111.111.111-11")).toBe(false);
    expect(cnpjValido("11.222.333/0001-81")).toBe(true);
    expect(cnpjValido("11.222.333/0001-80")).toBe(false);
  });
  it("soma meses sem estourar", () => {
    expect(maisMeses("2026-01-31", 1)).toBe("2026-02-28");
    expect(diaNoMes("2026-02", 31)).toBe("2026-02-28");
    expect(segundaDe("2026-11-24")).toBe("2026-11-23");
    expect(segundaDe("2026-11-22")).toBe("2026-11-16");
  });
  it("não deixa fórmula passar no CSV", () => {
    expect(csv([["=1+1", "a;b", 2.5, -3]])).toBe('﻿\'=1+1;"a;b";2,5;-3');
  });
  it("monta link de WhatsApp com DDI", () => {
    expect(linkWhats("(62) 98322-1010", "oi")).toBe("https://wa.me/5562983221010?text=oi");
    expect(linkWhats("5562983221010", "oi")).toContain("/5562983221010");
  });
});

describe("locação", () => {
  it("taxa: 10%, e 8% acima de 7 mil ou com 3 imóveis", () => {
    expect(taxaAdm(contrato(), REGRAS)).toBe(10);
    expect(taxaAdm(contrato({ aluguel: 7000 }), REGRAS)).toBe(10);
    expect(taxaAdm(contrato({ aluguel: 7000.01 }), REGRAS)).toBe(8);
    expect(taxaAdm(contrato({ imoveisDoDono: 3 }), REGRAS)).toBe(8);
  });
  it("multa e juros proporcionais ao atraso", () => {
    const a = acrescimos(cobranca(), contrato(), "2026-05-25");
    expect(a).toEqual({ dias: 15, multa: 300, juros: 15, total: 3315 });
    expect(acrescimos(cobranca(), contrato(), "2026-05-10").total).toBe(3000);
    expect(acrescimos(cobranca({ pagoEm: "2026-05-12" }), contrato(), "2026-09-01").dias).toBe(2);
  });
  it("situação da cobrança", () => {
    expect(situacao(cobranca(), "2026-05-09")).toBe("a_vencer");
    expect(situacao(cobranca(), "2026-05-10")).toBe("vence_hoje");
    expect(situacao(cobranca(), "2026-05-11")).toBe("atrasada");
    expect(situacao(cobranca({ pagoEm: "2026-05-30" }), "2026-06-30")).toBe("paga");
  });
  it("gera uma cobrança por mês, sem repetir, dentro do contrato", () => {
    let n = 0;
    const id = () => `x${n++}`;
    const k = contrato({ encargosNoBoleto: true });
    const g = gerarCobrancas([k], [], "2026-02", id);
    expect(g).toHaveLength(1);
    expect(g[0].encargos).toBe(600);
    expect(g[0].vencimento).toBe("2026-02-10");
    expect(gerarCobrancas([k], g, "2026-02", id)).toHaveLength(0);
    expect(gerarCobrancas([k], [], "2026-01", id)).toHaveLength(0);
    expect(gerarCobrancas([k], [], "2028-08", id)).toHaveLength(0);
  });
  it("primeiro aluguel fica com a imobiliária, depois só a taxa", () => {
    const k = contrato();
    const p = calcularRepasse(cobranca({ comp: "2026-02" }), k, REGRAS, 0, "", "r");
    expect(p.taxa).toBe(3000);
    expect(p.liquido).toBe(0);
    expect(p.status).toBe("pago");
    const s = calcularRepasse(cobranca({ comp: "2026-03" }), k, REGRAS, 180, "reparo", "r");
    expect(s.taxa).toBe(300);
    expect(s.liquido).toBe(2520);
    expect(s.previsto).toBe("2026-03-15");
  });
  it("semáforo do contrato", () => {
    const ok = alertasContrato(contrato(), [], [], REGRAS, "2026-03-01");
    expect(corContrato(ok)).toBe("verde");
    const at = alertasContrato(contrato(), [cobranca()], [], REGRAS, "2026-05-13");
    expect(corContrato(at)).toBe("vermelho");
    expect(at[0].texto).toContain("3 dias");
    const tit = alertasContrato(contrato({ checklist: {} }), [], [], REGRAS, "2026-03-01");
    expect(tit.some((x) => x.texto.includes("cabe propor multa"))).toBe(true);
    const re = alertasContrato(contrato(), [], [], REGRAS, "2027-01-25");
    expect(re.some((x) => x.tipo === "reajuste" && x.cor === "vermelho")).toBe(true);
  });
  it("cobra mais duro IPTU e condomínio sem comprovante", () => {
    const ci = [{ id: "1", contratoId: "k", comp: "2026-04", itens: { iptu: "pendente" as const, agua: "pendente" as const } }];
    const a = alertasContrato(contrato(), [], ci, REGRAS, "2026-05-02").filter((x) => x.tipo === "conta");
    expect(a.find((x) => x.texto.includes("IPTU"))?.cor).toBe("vermelho");
    expect(a.find((x) => x.texto.includes("água"))?.cor).toBe("amarelo");
  });
  it("acumula 12 meses do índice", () => {
    const s = Array.from({ length: 14 }, (_, i) => ({ comp: maisMeses("2025-01-01", i).slice(0, 7), valor: 0.5 }));
    const a = acumulado12(s, "2026-02");
    expect(a?.pct).toBeCloseTo(6.17, 2);
    expect(a?.de).toBe("2025-02");
    expect(a?.ate).toBe("2026-01");
    expect(a?.completo).toBe(true);
    expect(acumulado12(s, "2026-05")?.completo).toBe(false);
    expect(acumulado12(s.slice(0, 5), "2026-02")).toBeNull();
    expect(novoAluguel(3000, -2)).toEqual({ aplicado: 0, valor: 3000 });
    expect(novoAluguel(3000, 5).valor).toBe(3150);
  });
});

const CNDT = `PODER JUDICIÁRIO JUSTIÇA DO TRABALHO CERTIDÃO NEGATIVA DE DÉBITOS TRABALHISTAS Nome: FULANO DE TAL CPF: 111.444.777-35 Certidão nº: 81234567/2026 Expedição: 24/11/2026, às 10:11:12 Validade: 23/05/2027 - 180 (cento e oitenta) dias, contados da data de sua expedição. Certifica-se que FULANO DE TAL, inscrito(a) no CPF sob o nº 111.444.777-35, NÃO CONSTA como inadimplente no Banco Nacional de Devedores Trabalhistas.`;
const PGFN = `MINISTÉRIO DA FAZENDA Secretaria da Receita Federal do Brasil Procuradoria-Geral da Fazenda Nacional CERTIDÃO POSITIVA COM EFEITOS DE NEGATIVA DE DÉBITOS RELATIVOS AOS TRIBUTOS FEDERAIS E À DÍVIDA ATIVA DA UNIÃO Nome: EMPRESA CNPJ: 11.222.333/0001-81 constam débitos administrados com exigibilidade suspensa. Emitida às 09:00:00 do dia 01/11/2026 <hora e data de Brasília>. Válida até 30/04/2027. Código de controle da certidão: A1B2.C3D4.E5F6.A7B8`;
const SEFAZ = `ESTADO DE GOIÁS SECRETARIA DE ESTADO DA ECONOMIA CERTIDÃO DE DÉBITO INSCRITO EM DÍVIDA ATIVA - NEGATIVA NR. CERTIDÃO: Nº 45678901 CPF 111.444.777-35 NÃO CONSTA DÉBITO. Esta certidão é válida por 60 dias. GOIÂNIA, 24 NOVEMBRO DE 2026`;
const TRT = `PODER JUDICIÁRIO TRIBUNAL REGIONAL DO TRABALHO DA 18ª REGIÃO CERTIDÃO POSITIVA DE AÇÕES TRABALHISTAS em desfavor de CPF 111.444.777-35 constam os seguintes processos: 0010000-00.2025.5.18.0051. Expedida em 20/11/2026 com validade por 30 dias.`;

describe("certidões", () => {
  it("lê CNDT negativa", () => {
    const l = lerCertidao(CNDT);
    expect(l).toMatchObject({ tipo: "cndt", resultado: "negativa", emitidaEm: "2026-11-24", validade: "2027-05-23", numero: "81234567/2026", confianca: "alta" });
    expect(l.docs).toEqual(["11144477735"]);
  });
  it("lê federal positiva com efeito de negativa", () => {
    const l = lerCertidao(PGFN);
    expect(l).toMatchObject({ tipo: "cnd_federal", resultado: "positiva_efeito_negativa", emitidaEm: "2026-11-01", validade: "2027-04-30", numero: "A1B2.C3D4.E5F6.A7B8" });
  });
  it("lê estadual com data por extenso e validade em dias", () => {
    const l = lerCertidao(SEFAZ);
    expect(l).toMatchObject({ tipo: "sefaz_go", resultado: "negativa", emitidaEm: "2026-11-24", validade: "2027-01-23" });
  });
  it("não deixa positiva passar como negativa", () => {
    const l = lerCertidao(TRT);
    expect(l).toMatchObject({ tipo: "trt18", resultado: "positiva", emitidaEm: "2026-11-20", validade: "2026-12-20" });
  });
  it("na dúvida, não decide", () => {
    expect(lerCertidao("CERTIDÃO NEGATIVA de um lado e CERTIDÃO POSITIVA do outro, tribunal de justica do estado de goias, texto longo o bastante").resultado).toBeNull();
    expect(lerCertidao("").confianca).toBe("baixa");
  });
  const parte: Parte = { id: "p", papel: "Vendedor", tipo: "PF", nome: "Fulano", doc: "11144477735", nascimento: "", mae: "", matricula: "", inscricao: "" };
  const cert: Certidao = { id: "c", parteId: "p", tipo: "cndt", status: "pendente" };
  it("acusa certidão de outra pessoa, de outro órgão, positiva e vencida", () => {
    expect(conferirLeitura(lerCertidao(CNDT), cert, parte, "2026-11-24")).toEqual([]);
    expect(conferirLeitura(lerCertidao(CNDT), cert, { ...parte, doc: "52998224725" }, "2026-11-24")[0]).toContain("não é o de Fulano");
    expect(conferirLeitura(lerCertidao(SEFAZ), cert, parte, "2026-11-24")[0]).toContain("parece ser de");
    expect(conferirLeitura(lerCertidao(TRT), { ...cert, tipo: "trt18" }, parte, "2026-11-24").join()).toContain("POSITIVA");
    expect(conferirLeitura(lerCertidao(CNDT), cert, parte, "2028-01-01").join()).toContain("vencida");
  });
  it("PJ compara pela raiz do CNPJ e aceita o tipo de PJ", () => {
    const pj: Parte = { ...parte, tipo: "PJ", doc: "11222333000262" };
    expect(conferirLeitura(lerCertidao(PGFN), { ...cert, tipo: "cnd_federal_pj" }, pj, "2026-11-24")).toHaveLength(1);
  });
  it("situação e resumo", () => {
    expect(situacaoCert({ ...cert, status: "emitida", validade: "2026-11-30" }, "2026-11-24")).toBe("vencendo");
    expect(situacaoCert({ ...cert, status: "emitida", validade: "2026-11-20" }, "2026-11-24")).toBe("vencida");
    const r = resumoDossie([{ ...cert, status: "emitida", validade: "2027-01-01", resultado: "positiva" }, cert, { ...cert, status: "dispensada" }], "2026-11-24");
    expect(r).toMatchObject({ total: 2, prontas: 1, pendentes: 1, positivas: 1, semConferencia: 1 });
  });
});

const venda = (p: Partial<Venda> = {}): Venda => ({
  id: "v", imovel: "Casa", imovelCod: "", vendedor: { nome: "", doc: "", tel: "", email: "" }, comprador: { nome: "", doc: "", tel: "", email: "" }, valor: 1000000,
  comissaoPct: 5, forma: "avista", financiado: 0, banco: "", sinal: 0, condicoes: "", corretorId: "", etapa: 1, desde: "", checklist: {}, participantes: [],
  comissaoStatus: "calcular", avisos: [], obs: "", criadaEm: "2026-11-01", ...p,
});
const ok = { em: "", por: "" };

describe("pós-venda", () => {
  it("divide a comissão e fecha no centavo", () => {
    const d = dividirComissao(venda({ valor: 333333.33, participantes: [{ nome: "X", papel: "Indicação", pct: 15 }] }), REGRAS, "Ana");
    expect(d.total).toBe(16666.67);
    expect(d.linhas.reduce((a, l) => a + l.valor, 0)).toBeCloseTo(d.total, 2);
    expect(d.linhas.at(-1)).toMatchObject({ nome: "Ana", pct: 65 });
    expect(dividirComissao(venda({ participantes: [{ nome: "X", papel: "", pct: 90 }] }), REGRAS, "").valido).toBe(false);
  });
  it("trava etapa sem checklist, sem parecer e sem minuta liberada", () => {
    expect(impedimentos(venda(), undefined, false)).toHaveLength(3);
    const v3 = venda({ etapa: 3, checklist: { certidoes: ok, parecer: ok } });
    expect(impedimentos(v3, undefined, false)).toEqual(["Dossiê de certidões não foi aberto"]);
    const ds = { id: "", titulo: "", origem: "venda" as const, partes: [], certidoes: [], parecer: "", risco: "a_analisar" as const, criadoEm: "" };
    expect(impedimentos(v3, ds, false)[0]).toContain("Gabi");
    expect(impedimentos(v3, { ...ds, risco: "liberado" }, false)).toEqual([]);
    const v4 = venda({ etapa: 4, checklist: { minuta: ok, revisada: ok } });
    expect(impedimentos(v4, ds, false)).toEqual(["Nenhuma minuta liberada pela Gabi"]);
    expect(impedimentos(v4, ds, true)).toEqual([]);
  });
  it("crédito só é exigido no financiado", () => {
    const base = { etapa: 7, checklist: { escritura: ok, registro: ok, chaves: ok } };
    expect(impedimentos(venda(base), undefined, true)).toEqual([]);
    expect(impedimentos(venda({ ...base, forma: "financiado" }), undefined, true)).toHaveLength(1);
  });
  it("prazo do Pix de 24h", () => {
    const t = Date.parse("2026-11-24T12:00:00Z");
    expect(prazoPix(venda({ assinadoEm: "2026-11-24T00:00:00Z" }), REGRAS, t)).toEqual({ vencido: false, horas: 12 });
    expect(prazoPix(venda({ assinadoEm: "2026-11-22T00:00:00Z" }), REGRAS, t)?.vencido).toBe(true);
    expect(prazoPix(venda({ assinadoEm: "2026-11-22T00:00:00Z", pixEm: "x" }), REGRAS, t)).toBeNull();
  });
  it("minuta: campo vazio continua visível, nunca some", () => {
    const c = "Entre {{a}} e {{ b }}, {{a}}.";
    expect(camposDe(c)).toEqual(["a", "b"]);
    expect(preencher(c, { a: "X" })).toBe("Entre X e {{ b }}, X.");
    expect(camposVazios(c, { a: "X", b: " " })).toEqual(["b"]);
  });
  it("modelos provisórios nascem sem validação", () => {
    expect(MODELOS_PROVISORIOS.every((m) => !m.validado && camposDe(m.corpo).length > 2)).toBe(true);
  });
});

describe("comercial", () => {
  it("acha lead repetido pelos 8 últimos dígitos", () => {
    const l = { id: "a", tel: "(62) 98322-1010", email: "" } as never;
    expect(leadRepetido({ id: "b", tel: "5562983221010", email: "" }, [l])).toBe(l);
    expect(leadRepetido({ id: "b", tel: "62911112222", email: "" }, [l])).toBeUndefined();
    expect(leadRepetido({ id: "a", tel: "62983221010", email: "" }, [l])).toBeUndefined();
  });
  it("captação diz o que falta por tipo", () => {
    const d = dadosDemo();
    expect(faltando(d.captacoes[0])).toEqual([]);
    expect(faltando(d.captacoes[2])).not.toContain("quartos");
  });
});

describe("agenda", () => {
  const ev = (p: Partial<Evento>): Evento => ({ id: "e", agenda: "videomaker", titulo: "G", data: "2026-11-24", inicio: "09:00", fim: "10:00", local: "", quem: "", obs: "", ...p });
  it("videomaker: choque, deslocamento, limite e horário", () => {
    const evs = [ev({})];
    expect(conflitosVideo(ev({ id: "n", inicio: "10:15", fim: "11:00" }), evs, REGRAS)[0]).toContain("deslocamento");
    expect(conflitosVideo(ev({ id: "n", inicio: "10:30", fim: "11:30" }), evs, REGRAS)).toEqual([]);
    expect(conflitosVideo(ev({ id: "n", inicio: "07:00", fim: "08:00" }), [], REGRAS)[0]).toContain("Fora do horário");
    const cheio = [ev({ id: "1" }), ev({ id: "2", inicio: "11:00", fim: "12:00" }), ev({ id: "3", inicio: "13:00", fim: "14:00" })];
    expect(conflitosVideo(ev({ id: "n", inicio: "16:00", fim: "17:00" }), cheio, REGRAS)[0]).toContain("Limite");
    expect(horariosLivres("2026-11-24", 60, evs, REGRAS)[0]).toBe("10:30");
  });
  it("entrega pula fim de semana", () => {
    expect(prazoEntrega("2026-11-26", 3)).toBe("2026-12-01");
  });
  it("gera ics semanal válido", () => {
    const t = ics([ev({ semanal: true, titulo: "Reunião, geral" })], new Date("2026-11-24T00:00:00Z"));
    expect(t).toContain("RRULE:FREQ=WEEKLY;BYDAY=TU");
    expect(t).toContain("SUMMARY:Reunião\\, geral");
    expect(t.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
  });
});

describe("extrato e planilha", () => {
  it("lê OFX sem tag de fechamento", () => {
    const l = lerOfx("<OFX><STMTTRN><TRNTYPE>DEBIT\n<DTPOSTED>20261110120000[-3:BRT]\n<TRNAMT>-320.50\n<FITID>A1\n<MEMO>INTERNET\n</STMTTRN></OFX>");
    expect(l).toEqual([{ data: "2026-11-10", descricao: "INTERNET", valor: -320.5, fitid: "A1" }]);
  });
  it("lê CSV do banco com valor ou crédito e débito", () => {
    expect(lerExtratoCsv("Data;Histórico;Valor\n10/11/2026;PIX;1.500,00")[0]).toEqual({ data: "2026-11-10", descricao: "PIX", valor: 1500 });
    expect(lerExtratoCsv("Data,Descrição,Crédito,Débito\n10/11/2026,TARIFA,,\"12,90\"")[0].valor).toBe(-12.9);
  });
  it("normaliza cabeçalho", () => {
    expect(lerCsv("Área (m²);Preço\n120;10")[0]).toEqual({ area_m: "120", preco: "10" });
  });
});

describe("dados", () => {
  it("base vazia não traz cliente nenhum", () => {
    const d = dadosVazios();
    expect(d.contratos).toHaveLength(0);
    expect(d.leads).toHaveLength(0);
    expect(d.pendencias.length).toBeGreaterThan(40);
    expect(d.eventos).toHaveLength(3);
  });
  it("demonstração tem 15 contratos e ids únicos", () => {
    const d = dadosDemo();
    expect(d.contratos).toHaveLength(15);
    for (const l of Object.values(d) as { id: string }[][]) expect(new Set(l.map((x) => x.id)).size).toBe(l.length);
  });
});
