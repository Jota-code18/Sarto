import { certidoesPadrao } from "./certidoes";
import { TOTAL_CHECK_CORRETOR, CHECK_CORRETOR } from "./comercial";
import { competencia, diaNoMes, hoje, maisComp, maisDias, maisMeses, segundaDe } from "./datas";
import { calcularRepasse, CHECK_CONTRATO } from "./locacao";
import { MODELOS_PROVISORIOS } from "./modelos";
import { PENDENCIAS } from "./pendencias";
import { REGRAS } from "./regras";
import type { Captacao, Certidao, Checklist, Cobranca, Contrato, Corretor, Dados, Lead, Parte, Pessoa, Venda } from "./tipos";

/** Base vazia: o que existe antes de qualquer cadastro */
export function dadosVazios(): Dados {
  return {
    corretores: [], leads: [], captacoes: [], anuncios: [], notas: [], contratos: [], cobrancas: [], contasInquilino: [], repasses: [],
    funil: [], chamados: [], multas: [], vendas: [], dossies: [], modelos: structuredClone(MODELOS_PROVISORIOS), minutas: [],
    contasPagar: [], lancamentos: [], posts: [], metricas: [], eventos: reunioesFixas(), rotinas: [], estoque: [],
    aniversarios: [], registros: [], custos: [], pendencias: structuredClone(PENDENCIAS), logs: [],
  };
}

function reunioesFixas() {
  const seg = segundaDe(hoje());
  const base = { agenda: "reunioes", local: "Escritório", semanal: true, obs: "" };
  return [
    { id: "ev_seg", titulo: "Reunião da equipe geral", data: seg, inicio: "09:00", fim: "10:00", quem: "Todos", ...base },
    { id: "ev_qui_m", titulo: "Treinamento de corretores", data: maisDias(seg, 3), inicio: "09:00", fim: "10:30", quem: "Corretores", ...base },
    { id: "ev_qui_t", titulo: "Diretores e gestores", data: maisDias(seg, 3), inicio: "17:00", fim: "18:00", quem: "Diretores e gestores", ...base },
  ];
}

const pessoa = (nome: string, n: number, doc = ""): Pessoa => ({
  nome,
  doc,
  tel: `6290000${String(n).padStart(4, "0")}`,
  email: "",
});
const feito = (dias: number, por: string) => ({ em: `${maisDias(hoje(), -dias)}T12:00:00.000Z`, por });

/** Tudo aqui é inventado: nomes, telefones e valores. */
export function dadosDemo(): Dados {
  const d = dadosVazios();
  const h = hoje();
  const comp = competencia(h);

  /* Corretores */
  const nomes = ["Ana Prado", "Bruno Lemos", "Carla Nunes", "Diego Rocha", "Elisa Martins", "Fábio Teles", "Giovana Reis", "Heitor Pinho", "Isadora Melo", "João Batista"];
  const idsCheck = CHECK_CORRETOR.flatMap((g) => g.itens.map((i) => i.id));
  d.corretores = nomes.map((nome, i): Corretor => {
    const qtd = i === 9 ? 4 : i === 8 ? 10 : TOTAL_CHECK_CORRETOR;
    const checklist: Checklist = Object.fromEntries(idsCheck.slice(0, qtd).map((k) => [k, feito(20, "Igor")]));
    return {
      id: `cor_${i}`, nome, tel: `62900000${100 + i}`, email: "", creci: i === 9 ? "" : `F-${30000 + i * 137}`,
      entrada: maisDias(h, i >= 8 ? -6 - i : -200 - i * 40), status: i >= 8 ? "entrando" : "ativo", checklist, obs: "",
    };
  });

  /* Leads */
  const canais = ["ZAP Imóveis", "Instagram", "Site", "Viva Real", "Indicação", "WhatsApp", "OLX", "Placa"];
  const nomesLead = ["Renato Alves", "Paula Siqueira", "Marcos Vilela", "Letícia Amaral", "Otávio Braga", "Simone Dias", "Caio Ferraz", "Patrícia Lobo", "Vinícius Sá", "Helena Couto", "Rafael Moura", "Tatiana Freire", "Gustavo Pires", "Aline Barreto", "Murilo Castro", "Débora Lins", "Sérgio Antunes", "Natália Porto"];
  const st: Lead["status"][] = ["novo", "novo", "atendimento", "atendimento", "visita", "proposta", "ganho", "perdido", "novo"];
  d.leads = nomesLead.map((nome, i): Lead => ({
    id: `lead_${i}`, nome, tel: `62900000${200 + i}`, email: "", canal: canais[(i * 3) % canais.length],
    interesse: i % 5 === 0 ? "alugar" : "comprar", tipoImovel: ["Casa em condomínio", "Apartamento", "Casa de rua"][i % 3],
    bairros: ["Jundiaí", "Anaville", "Belas Artes", "Grand Trianon"][i % 4], min: i % 5 === 0 ? 2500 : 700000, max: i % 5 === 0 ? 6000 : 1800000,
    imovelCod: "", corretorId: `cor_${i % 8}`, status: st[i % st.length], obs: "", criadoEm: maisDias(h, -((i * 2) % 26)),
    atualizadoEm: maisDias(h, -((i * 2) % 9)), noJetimob: i % 3 !== 0,
  }));

  /* Captações */
  const capBase = (i: number, p: Partial<Captacao>): Captacao => ({
    id: `cap_${i}`, codigo: "", tipo: "condominio", finalidade: "venda", titulo: "", proprietario: pessoa("", 0), cep: "", endereco: "", numero: "",
    complemento: "", bairro: "", cidade: "Anápolis", condominioNome: "", valor: 0, valorCondominio: 0, iptu: 0, area: 0, terreno: 0, quartos: 0,
    suites: 0, banheiros: 0, vagas: 0, matricula: "", descricao: "", diferenciais: "", exclusividade: "", etapa: "visita", checklist: {}, fotos: [],
    corretorId: `cor_${i % 8}`, origem: "Indicação", criadoEm: maisDias(h, -3 - i * 2), ...p,
  });
  d.captacoes = [
    capBase(0, {
      titulo: "Casa térrea com piscina", condominioNome: "Residencial Exemplo", proprietario: pessoa("Álvaro Queiroz", 301), endereco: "Rua das Palmeiras",
      numero: "120", bairro: "Jardim Exemplo", valor: 1850000, valorCondominio: 780, area: 268, terreno: 420, quartos: 3, suites: 3, banheiros: 5, vagas: 4,
      exclusividade: "sim", etapa: "fotos", descricao: "Casa térrea com integração entre sala, varanda gourmet e piscina. Suíte principal com closet, escritório e marcenaria completa nos ambientes sociais.",
      diferenciais: "Energia solar\nPiscina aquecida\nAutomação de iluminação",
      checklist: { visita: feito(8, "Igor"), exclusividade: feito(7, "Igor"), autorizacao: feito(6, "Igor"), dados: feito(4, "Igor"), pdf: feito(4, "Igor") },
    }),
    capBase(1, { tipo: "apartamento", titulo: "Apartamento alto com vista", condominioNome: "Edifício Modelo", proprietario: pessoa("Beatriz Salgado", 302), endereco: "Avenida Central", numero: "900", bairro: "Jundiaí", valor: 980000, area: 132, quartos: 3, suites: 1, banheiros: 3, vagas: 2, exclusividade: "nao", etapa: "dados", checklist: { visita: feito(5, "Igor"), exclusividade: feito(4, "Igor"), autorizacao: feito(3, "Igor") }, origem: "Varredura" }),
    capBase(2, { tipo: "lote", titulo: "Lote de esquina", condominioNome: "Residencial Exemplo", proprietario: pessoa("Cláudio Meireles", 303), bairro: "Jardim Exemplo", valor: 420000, terreno: 510, etapa: "autorizacao", checklist: { visita: feito(2, "Igor") } }),
    capBase(3, { tipo: "casa_rua", titulo: "Sobrado com ponto comercial", proprietario: pessoa("Dalva Brito", 304), bairro: "Centro", etapa: "visita" }),
  ];

  /* Varredura */
  const an = (i: number, p: Partial<Dados["anuncios"][number]>) => ({
    id: `an_${i}`, portal: "ZAP Imóveis", url: "", titulo: "", tipo: "Casa em condomínio", bairro: "Residencial Anaville", cidade: "Anápolis", preco: 0, precoAnterior: 0, area: 0, quartos: 3,
    anunciante: "", codAnunciante: "", particular: false, primeiraVez: segundaDe(h), vistoEm: segundaDe(h), status: "abordar" as const, obs: "", ...p,
  });
  d.anuncios = [
    an(0, { titulo: "Casa moderna com 4 suítes", preco: 2400000, precoAnterior: 2650000, area: 330, quartos: 4, anunciante: "Imobiliária A", publicadoEm: maisDias(h, -140), primeiraVez: maisDias(h, -21) }),
    an(1, { portal: "OLX", titulo: "Vendo casa em condomínio", preco: 1390000, area: 240, anunciante: "Proprietário", particular: true, publicadoEm: maisDias(h, -18) }),
    an(2, { portal: "62imóveis", titulo: "Casa 4 suítes Anaville", preco: 2390000, area: 331, quartos: 4, anunciante: "Imobiliária B", publicadoEm: maisDias(h, -95), primeiraVez: maisDias(h, -21) }),
    an(3, { portal: "62imóveis", titulo: "Cobertura duplex", tipo: "Cobertura", bairro: "Jundiaí", preco: 1750000, area: 260, anunciante: "Imobiliária C", publicadoEm: maisDias(h, -35), status: "contatado" }),
    an(4, { portal: "OLX", titulo: "Apartamento 2 quartos", tipo: "Apartamento", bairro: "Centro", preco: 310000, area: 68, quartos: 2, anunciante: "Imobiliária D", publicadoEm: maisDias(h, -12) }),
    an(5, { titulo: "Casa térrea", bairro: "Jardim Exemplo", preco: 1850000, area: 268, anunciante: "Sarto Imóveis", publicadoEm: maisDias(h, -30) }),
  ];

  /* Locação */
  const imoveis = ["Ap. 802 Ed. Modelo", "Casa Rua 10", "Sala 45 Centro Empresarial", "Ap. 1203 Ed. Horizonte", "Casa 7 Cond. Exemplo", "Ap. 301 Ed. Jardins", "Loja 2 Galeria Sul", "Casa 22 Cond. Exemplo", "Ap. 1504 Ed. Parque", "Studio 611", "Ap. 904 Ed. Modelo", "Galpão Anel Viário", "Casa 3 Vila Nova", "Ap. 206 Ed. Lago", "Cobertura Ed. Alto"];
  const inqs = ["Lucas Ferreira", "Mariana Duarte", "Clínica Vida Exemplo", "Pedro Henrique Sales", "Juliana Arantes", "Roberta Campos", "Loja Exemplo Ltda", "André Figueira", "Camila Rezende", "Thiago Motta", "Fernanda Lopes", "Transportes Exemplo", "Vanessa Cruz", "Ricardo Leal", "Beatriz Nogueira"];
  const donos = ["Antônio Vilela", "Antônio Vilela", "Antônio Vilela", "Celina Barros", "Dirceu Campos", "Elza Monteiro", "Francisco Teles", "Glória Pinheiro", "Hugo Sampaio", "Ivone Prates", "Celina Barros", "Jorge Amorim", "Kátia Lemes", "Laerte Pontes", "Marta Vidal"];
  const alug = [3200, 4500, 2800, 3900, 8200, 2600, 5400, 7600, 4100, 2500, 3300, 9800, 2700, 2900, 7200];
  d.contratos = imoveis.map((imovel, i): Contrato => {
    const meses = [3, 14, 26, 11, 8, 29, 18, 12, 5, 1, 23, 9, 34, 16, 7][i];
    const inicio = maisMeses(h, -meses);
    const semCheck = i === 9 ? ["energia", "agua", "seguro"] : i === 0 ? ["agua"] : i === 8 ? ["vistoria"] : [];
    return {
      id: `ctr_${i}`, codigo: `L${String(i + 1).padStart(3, "0")}`, imovel, endereco: `${imovel}, Anápolis/GO`, bairro: ["Jundiaí", "Centro", "Anápolis City", "Vila Nova"][i % 4],
      proprietario: { ...pessoa(donos[i], 400 + i), pix: "" }, inquilino: pessoa(inqs[i], 500 + i), aluguel: alug[i], condominio: i % 3 === 0 ? 520 : 0, iptuMensal: 110,
      encargosNoBoleto: i % 3 === 0, diaVencimento: [5, 10, 15][i % 3], diaRepasse: [10, 15, 20][i % 3], inicio, fim: maisMeses(inicio, i === 12 ? 36 : 30), indice: i % 2 ? "IPCA" : "IGP-M",
      ultimoReajuste: meses >= 12 ? maisMeses(inicio, Math.floor(meses / 12) * 12 - (i === 1 ? 12 : 0)) : inicio, garantia: ["Seguro-fiança", "Caução de 3 aluguéis", "Fiador"][i % 3],
      garantiaVence: i % 3 === 0 ? maisMeses(inicio, 12 * Math.ceil((meses + 1) / 12)) : "", seguroVence: i === 9 ? "" : i === 3 ? maisDias(h, 12) : i === 6 ? maisDias(h, -5) : maisMeses(inicio, 12 * Math.ceil((meses + 1) / 12)),
      imoveisDoDono: donos.filter((x) => x === donos[i]).length, multaPct: 10, jurosMes: 1, status: i === 5 ? "encerrando" : "ativo",
      checklist: Object.fromEntries(CHECK_CONTRATO.filter((c) => !semCheck.includes(c.id)).map((c) => [c.id, feito(30, "Verônica")])), saida: i === 5 ? { aviso: feito(4, "Verônica") } : {}, obs: "",
    };
  });
  for (let m = -5; m <= 0; m++) {
    const c = maisComp(comp, m);
    for (const k of d.contratos) {
      if (c <= competencia(k.inicio)) continue;
      const i = Number(k.id.slice(4));
      const vencimento = diaNoMes(c, k.diaVencimento);
      const naoPagou = m === 0 && [1, 4, 13].includes(i);
      const atrasado2 = m === -1 && i === 13;
      const pago = vencimento <= h && !naoPagou && !atrasado2;
      const base = k.aluguel + (k.encargosNoBoleto ? k.condominio + k.iptuMensal : 0);
      const cob: Cobranca = { id: `cob_${c}_${i}`, contratoId: k.id, comp: c, vencimento, aluguel: k.aluguel, encargos: base - k.aluguel, extra: 0, extraMotivo: "", avisos: [], ...(pago ? { pagoEm: vencimento, valorPago: base } : {}) };
      d.cobrancas.push(cob);
      if (pago) {
        const r = calcularRepasse(cob, k, REGRAS, i === 6 && m === 0 ? 180 : 0, i === 6 && m === 0 ? "Reparo hidráulico" : "", `rep_${c}_${i}`);
        d.repasses.push(m === 0 ? (r.liquido === 0 ? r : { ...r, status: i % 4 === 0 ? "pago" : "calculado", pagoEm: i % 4 === 0 ? h : undefined }) : { ...r, status: "pago", pagoEm: r.previsto, aprovado: feito(20, "Verônica") });
      }
    }
  }
  d.contasInquilino = d.contratos.map((k, i) => ({
    id: `ci_${i}`, contratoId: k.id, comp: maisComp(comp, -1), pedidoEm: maisDias(h, -10),
    itens: { iptu: i === 13 ? "atrasada" : "ok", agua: i === 9 ? "pendente" : "ok", energia: i === 3 ? "pendente" : "ok", ...(k.condominio ? { condominio: "ok" as const } : {}) },
  }));
  d.funil = [
    { id: "fun_0", imovel: "Ap. 703 Ed. Horizonte", bairro: "Jundiaí", proprietario: pessoa("Nelson Araújo", 601), interessado: pessoa("Priscila Gomes", 602), aluguel: 4300, etapa: "analise", checklist: { doc_inquilino: feito(1, "Verônica") }, desde: maisDias(h, -1), obs: "", criadoEm: maisDias(h, -20) },
    { id: "fun_1", imovel: "Casa 15 Cond. Exemplo", bairro: "Jardim Exemplo", proprietario: pessoa("Odete Franco", 603), interessado: pessoa("", 0), aluguel: 7500, etapa: "fotos", checklist: {}, desde: maisDias(h, -6), obs: "", criadoEm: maisDias(h, -14) },
    { id: "fun_2", imovel: "Sala 12 Centro", bairro: "Centro", proprietario: pessoa("Paulo Rios", 604), interessado: pessoa("", 0), aluguel: 1900, etapa: "qualificacao", checklist: {}, desde: maisDias(h, -2), obs: "", criadoEm: maisDias(h, -2) },
    { id: "fun_3", imovel: "Ap. 102 Ed. Lago", bairro: "Anápolis City", proprietario: pessoa("Quitéria Leão", 605), interessado: pessoa("Saulo Mendes", 606), aluguel: 3100, etapa: "contrato", checklist: { minuta: feito(0, "Verônica") }, desde: h, obs: "", criadoEm: maisDias(h, -30) },
  ];
  d.chamados = [
    { id: "ch_0", contratoId: "ctr_3", titulo: "Infiltração no banheiro", descricao: "Mancha no teto do banheiro social, piora quando chove.", quemPaga: "a definir", custo: 0, status: "aberto", abertoEm: maisDias(h, -3) },
    { id: "ch_1", contratoId: "ctr_6", titulo: "Vazamento na pia", descricao: "Troca de sifão e registro.", quemPaga: "proprietario", custo: 180, status: "concluido", abertoEm: maisDias(h, -15) },
  ];
  d.multas = [{ id: "mu_0", contratoId: "ctr_9", motivo: "Água e energia não transferidas em 30 dias", clausula: "Cláusula 6ª", valor: 250, status: "proposta", criadaEm: maisDias(h, -1) }];

  /* Jurídico */
  const parte = (id: string, p: Partial<Parte>): Parte => ({ id, papel: "Vendedor", tipo: "PF", nome: "", doc: "", nascimento: "", mae: "", matricula: "", inscricao: "", ...p });
  const partes = [
    parte("pt_0", { nome: "Ubirajara Exemplo", doc: "11144477735", nascimento: "1970-05-12", mae: "Maria Exemplo" }),
    parte("pt_1", { papel: "Vendedor (empresa)", tipo: "PJ", nome: "Construtora Exemplo Ltda", doc: "11222333000181" }),
    parte("pt_2", { papel: "Imóvel", tipo: "IMOVEL", nome: "Casa Residencial Exemplo, quadra 4, lote 12", matricula: "00.000", inscricao: "000.000.0000" }),
  ];
  const certs: Certidao[] = partes.flatMap((p, pi) =>
    certidoesPadrao(p.tipo, true).map((tipo, i): Certidao => {
      const base: Certidao = { id: `ce_${pi}_${i}`, parteId: p.id, tipo, status: "pendente" };
      if (pi === 0 && i < 3) return { ...base, status: "emitida", emitidaEm: maisDias(h, -9), validade: maisDias(h, i === 1 ? 5 : 170), resultado: "negativa", conferida: feito(8, "Igor") };
      if (pi === 0 && i === 3) return { ...base, status: "emitida", emitidaEm: maisDias(h, -2), validade: maisDias(h, 28), resultado: "positiva", alertas: ["Certidão POSITIVA: precisa de análise da Gabi."] };
      if (pi === 1 && i === 0) return { ...base, status: "emitida", emitidaEm: maisDias(h, -190), validade: maisDias(h, -10), resultado: "negativa", conferida: feito(188, "Igor") };
      return base;
    }),
  );
  const venda = (i: number, p: Partial<Venda>): Venda => ({
    id: `vd_${i}`, imovel: "", imovelCod: "", vendedor: pessoa("", 0), comprador: pessoa("", 0), valor: 0, comissaoPct: REGRAS.comissaoVenda, forma: "avista", financiado: 0,
    banco: "", sinal: 0, condicoes: "", corretorId: `cor_${i}`, etapa: 1, desde: new Date().toISOString(), checklist: {}, participantes: [], comissaoStatus: "calcular", avisos: [], obs: "", criadaEm: maisDias(h, -4 - i * 6), ...p,
  });
  d.vendas = [
    venda(0, { imovel: "Casa Residencial Exemplo, quadra 4, lote 12", vendedor: pessoa("Ubirajara Exemplo", 701, "11144477735"), comprador: pessoa("Wagner Modelo", 702), valor: 1450000, sinal: 145000, forma: "financiado", financiado: 900000, banco: "Caixa", etapa: 3, checklist: { dados: feito(4, "Igor"), docs_vendedor: feito(4, "Igor"), docs_comprador: feito(3, "Igor"), resumo: feito(3, "Igor") }, condicoes: "Entrega das chaves em 30 dias após a liberação do financiamento." }),
    venda(1, { imovel: "Ap. 1101 Ed. Horizonte", vendedor: pessoa("Xavier Modelo", 703), comprador: pessoa("Yara Exemplo", 704), valor: 890000, sinal: 89000, etapa: 5, assinadoEm: new Date(Date.now() - 20 * 36e5).toISOString(), checklist: { dados: feito(12, "Igor"), docs_vendedor: feito(12, "Igor"), docs_comprador: feito(11, "Igor"), resumo: feito(10, "Igor"), certidoes: feito(8, "Gabi"), parecer: feito(7, "Gabi"), minuta: feito(4, "Gabi"), revisada: feito(4, "Gabi"), clicksign: feito(2, "Igor"), assinado: feito(1, "Igor") } }),
    venda(2, { imovel: "Lote 8 Residencial Modelo", vendedor: pessoa("Zilda Exemplo", 705), comprador: pessoa("Arnaldo Modelo", 706), valor: 420000, etapa: 6, comissaoStatus: "enviada", participantes: [{ nome: "Parceiro Exemplo", papel: "Indicação", pct: 10 }], assinadoEm: feito(6, "").em, pixEm: feito(5, "").em, checklist: { relatorio: feito(1, "Igor") } }),
    venda(3, { imovel: "Casa 9 Cond. Modelo", vendedor: pessoa("Bento Exemplo", 707), comprador: pessoa("Cora Modelo", 708), valor: 2100000, etapa: 7, forma: "financiado", financiado: 1200000, banco: "Itaú", comissaoStatus: "lancada", criadaEm: maisDias(h, -21), checklist: { credito: feito(3, "Operacional") } }),
  ];
  d.dossies = [{ id: "ds_0", titulo: "Casa Residencial Exemplo", origem: "venda", origemId: "vd_0", partes, certidoes: certs, parecer: "", risco: "a_analisar", criadoEm: maisDias(h, -10) }];

  /* Financeiro */
  const cp = (i: number, fornecedor: string, categoria: string, valor: number, dia: number, pago = false) => ({ id: `cp_${i}`, fornecedor, categoria, valor, vencimento: diaNoMes(dia < 28 && maisDias(h, 0) > diaNoMes(comp, dia) && !pago ? maisComp(comp, 1) : comp, dia), recorrente: true, ...(pago ? { pagoEm: h } : {}) });
  d.contasPagar = [cp(0, "Aluguel do escritório", "Escritório", 6500, 10, true), cp(1, "JetImob", "Ferramentas", 890, 10, true), cp(2, "Canal Pro", "Ferramentas", 2400, 10), cp(3, "Internet", "Telefone e internet", 320, 10), cp(4, "Contabilidade", "Escritório", 1100, 10), cp(5, "Videomaker", "Marketing", 3000, 10)];
  for (let m = -5; m <= 0; m++) {
    const c = maisComp(comp, m);
    d.lancamentos.push(
      { id: `la_${m}_a`, data: diaNoMes(c, 8), descricao: "Comissões de venda", valor: [42000, 61500, 38000, 72500, 55000, 44500][m + 5], categoria: "Comissões", origem: "comissao" },
      { id: `la_${m}_b`, data: diaNoMes(c, 12), descricao: "Taxas de locação", valor: 6200 + m * 110, categoria: "Locação", origem: "locacao" },
      { id: `la_${m}_c`, data: diaNoMes(c, 10), descricao: "Fornecedores", valor: -(14200 + ((m + 5) % 3) * 900), categoria: "Escritório", origem: "manual" },
      { id: `la_${m}_d`, data: diaNoMes(c, 15), descricao: "Anúncios", valor: -(4800 + ((m + 5) % 2) * 1200), categoria: "Marketing", origem: "manual" },
    );
  }
  d.lancamentos = d.lancamentos.filter((l) => l.data <= h);

  /* Marketing */
  const seg = segundaDe(h);
  d.posts = [
    { id: "po_0", data: seg, tipo: "institucional", titulo: "Nossas verdades nº 5", status: "publicado", legenda: "" },
    { id: "po_1", data: maisDias(seg, 2), tipo: "imovel", titulo: "Casa térrea com piscina", status: "aprovacao", refId: "cap_0", legenda: "" },
    { id: "po_2", data: maisDias(seg, 3), tipo: "vendido", titulo: "Lote 8 Residencial Modelo", status: "producao", refId: "vd_2", legenda: "" },
    { id: "po_3", data: maisDias(seg, 4), tipo: "curiosidade", titulo: "Quanto custa registrar um imóvel", status: "ideia", legenda: "" },
  ];
  d.metricas = [-3, -2, -1].map((m, i) => ({ id: `me_${i}`, comp: maisComp(comp, m), seguidores: 3180 + i * 120, alcance: 18200 + i * 2600, interacoes: 910 + i * 140, investido: 1800 + i * 200, leadsPagos: 38 + i * 6 }));

  /* Agenda */
  d.eventos.push(
    { id: "ev_v1", agenda: "videomaker", titulo: "Gravação: casa térrea com piscina", data: maisDias(seg, 2), inicio: "09:00", fim: "10:30", local: "Jardim Exemplo", quem: "Videomaker e Ana", entrega: maisDias(seg, 7), obs: "" },
    { id: "ev_v2", agenda: "videomaker", titulo: "Gravação: apartamento com vista", data: maisDias(seg, 4), inicio: "14:00", fim: "15:30", local: "Jundiaí", quem: "Videomaker e Bruno", entrega: maisDias(seg, 9), obs: "" },
    { id: "ev_vi", agenda: "visitas", titulo: "Visita com Renato", data: maisDias(seg, 1), inicio: "15:00", fim: "16:00", local: "Anaville", quem: "Carla", obs: "" },
    { id: "ev_vs", agenda: "vistorias", titulo: "Vistoria de entrada: Ap. 102 Ed. Lago", data: maisDias(seg, 4), inicio: "10:00", fim: "11:00", local: "Ed. Lago", quem: "Empresa de vistoria", obs: "" },
  );

  /* Rotina */
  d.estoque = [
    { id: "es_0", item: "Café em grão", qtd: 1, minimo: 2, unidade: "kg" },
    { id: "es_1", item: "Água mineral", qtd: 14, minimo: 12, unidade: "garrafa" },
    { id: "es_2", item: "Papel A4", qtd: 3, minimo: 2, unidade: "pacote" },
    { id: "es_3", item: "Kit de boas-vindas", qtd: 1, minimo: 3, unidade: "kit" },
  ];
  const mmdd = (n: number) => maisDias(h, n).slice(5);
  d.aniversarios = [
    { id: "ani_0", nome: "Helena Couto", dia: mmdd(0), tipo: "cliente", tel: "62900000800", contexto: "Comprou a casa no Belas Artes em 2025. Tem dois filhos e um golden." },
    { id: "ani_1", nome: "Carla Nunes", dia: mmdd(3), tipo: "equipe", tel: "", contexto: "Corretora" },
    { id: "ani_2", nome: "Otávio Braga", dia: mmdd(9), tipo: "cliente", tel: "62900000801", contexto: "Investidor, prefere salas comerciais." },
  ];
  d.registros = [
    { id: "rg_0", data: h, pessoa: "Igor", bloco: "08:30", atividade: "Matinal com corretores", categoria: "Reunião" },
    { id: "rg_1", data: h, pessoa: "Igor", bloco: "09:00", atividade: "Cobrar documentos de captação", categoria: "Retrabalho" },
    { id: "rg_2", data: h, pessoa: "Igor", bloco: "09:30", atividade: "Cobrar documentos de captação", categoria: "Retrabalho" },
    { id: "rg_3", data: h, pessoa: "Verônica", bloco: "08:30", atividade: "Conferir pagamentos no banco", categoria: "Operacional" },
    { id: "rg_4", data: h, pessoa: "Verônica", bloco: "09:00", atividade: "Responder inquilino sobre boleto", categoria: "Atendimento" },
  ];
  return d;
}
